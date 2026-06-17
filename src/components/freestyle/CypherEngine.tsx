import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { BarDisplay } from "./BarDisplay";
import { BeatIndicator } from "./BeatIndicator";
import { MicRecorder, type MicResult } from "./MicRecorder";
import { type ScoreData } from "./ScoreCard";
import { Button } from "@/components/ui/button";
import { useBeatClock } from "@/lib/beat-clock";
import { generateBar, scoreBar, battleVerdict } from "@/lib/freestyle.functions";
import { STYLES, type StyleId } from "@/lib/styles";

type Phase =
  | "idle"
  | "aiThinking"
  | "aiSpeaking"
  | "countdown"
  | "userTurn"
  | "betweenRounds"
  | "scoringAll"
  | "done";

interface RoundData {
  aiBar: string;
  aiEndWord: string;
  userTranscript?: string;
  durationMs?: number;
  score?: ScoreData;
  pending?: boolean;
}

export function CypherEngine({
  styleId,
  bpm,
  mode: _mode,
  maxRounds,
  language,
  level,
  topic,
}: {
  styleId: StyleId;
  bpm: number;
  mode: "practice" | "battle";
  maxRounds?: number;
  language?: "en" | "hu";
  level?: "easy" | "medium" | "hard";
  topic?: "freestyle" | "pop" | "sports" | "music" | "whatever";
}) {
  const navigate = useNavigate();
  const style = STYLES[styleId];
  const clock = useBeatClock(bpm);
  const [phase, setPhase] = useState<Phase>("idle");
  const [round, setRound] = useState<RoundData | null>(null);
  const [history, setHistory] = useState<RoundData[]>([]);
  const [countdown, setCountdown] = useState(4);
  const [verdict, setVerdict] = useState<{ winner: string; recap: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<Map<number, Promise<string>>>(new Map());

  const totalRounds = maxRounds ?? 4;
  const totalUser = history.reduce((s, r) => s + (r.score?.overall ?? 0), 0);
  const totalAi = history.length * 70; // baseline opponent score

  const playTts = useCallback(async (text: string) => {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: style.voiceId }),
    });
    if (!r.ok) throw new Error("tts failed");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    await audio.play();
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
    URL.revokeObjectURL(url);
  }, [style.voiceId]);

  const runRound = useCallback(async () => {
    try {
      setPhase("aiThinking");
      const bar = await generateBar({
        data: {
          styleId,
          previousUserBar: lastUserBarRef.current?.bar,
          previousEndWord: lastUserBarRef.current?.end,
          roundIndex: history.length,
          language,
          level,
          topic,
        },
      });
      setRound({ aiBar: bar.bar, aiEndWord: bar.endWord });
      setPhase("aiSpeaking");
      await playTts(bar.bar);
      // Countdown 4 beats then mic
      setPhase("countdown");
      for (let i = 4; i >= 1; i--) {
        setCountdown(i);
        await new Promise((r) => setTimeout(r, (60_000 / bpm)));
      }
      setPhase("userTurn");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Round failed");
      setPhase("idle");
    }
  }, [styleId, history.length, playTts, bpm, language, level, topic]);

  const handleMicDone = useCallback(
    async (result: MicResult) => {
      if (!round) return;
      const entry: RoundData = {
        ...round,
        userTranscript: "",
        durationMs: result.durationMs,
        pending: true,
      };
      const newHistory = [...history, entry];
      const idx = newHistory.length - 1;
      pendingRef.current.set(idx, result.transcriptPromise);
      // Resolve in the background and patch the entry when ready.
      void result.transcriptPromise.then((text) => {
        setHistory((h) =>
          h.map((r, i) =>
            i === idx ? { ...r, userTranscript: text, pending: false } : r,
          ),
        );
      });
      setHistory(newHistory);
      setRound(null);
      if (newHistory.length >= totalRounds) {
        // Score everything at the end.
        setPhase("scoringAll");
        clock.stop();
        try {
          // Wait for any still-transcribing bars to finish.
          const transcripts = await Promise.all(
            newHistory.map((_, i) =>
              pendingRef.current.get(i) ?? Promise.resolve(""),
            ),
          );
          const resolved = newHistory.map((r, i) => ({
            ...r,
            userTranscript: transcripts[i] || r.userTranscript || "",
            pending: false,
          }));
          const scored = await Promise.all(
            resolved.map((r) =>
              scoreBar({
                data: {
                  styleId,
                  aiBar: r.aiBar,
                  aiEndWord: r.aiEndWord,
                  userBar: r.userTranscript ?? "",
                  bpm,
                  durationMs: r.durationMs,
                  language,
                },
              }).then((score) => ({ ...r, score })),
            ),
          );
          setHistory(scored);
          const userTotal = scored.reduce((s, r) => s + (r.score?.overall ?? 0), 0);
          const aiTotal = scored.length * 70;
          try {
            const v = await battleVerdict({
              data: { styleId, userTotal, aiTotal, rounds: scored.length },
            });
            setVerdict(v);
          } catch {
            setVerdict({ winner: userTotal > aiTotal ? "user" : "ai", recap: "Bars traded. Run it back." });
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Scoring failed");
        }
        setPhase("done");
        return;
      }
      setPhase("betweenRounds");
    },
    [round, styleId, bpm, language, history, totalRounds, clock],
  );

  const handleNext = useCallback(() => {
    void runRound();
  }, [runRound]);

  const startCypher = useCallback(async () => {
    await clock.start();
    void runRound();
  }, [clock, runRound]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clock.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Exit
          </button>
          <div className="display text-lg" style={{ color: style.accent }}>
            vs {style.name}
          </div>
          <div className="text-xs text-muted-foreground">{bpm} BPM</div>
        </div>
        <div className="flex items-center gap-3">
          <BeatIndicator beat={clock.beat} accent={style.accent} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => (clock.isPlaying ? clock.stop() : void clock.start())}
          >
            {clock.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground">
            Round {Math.min(history.length + 1, totalRounds)} / {totalRounds}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {totalRounds} rounds. AI drops a bar, you spit one back. Judging at the end.
          </p>
          <Button
            className="display mt-4 text-lg uppercase tracking-widest"
            style={{ background: style.accent, color: "#0a0a0a" }}
            onClick={() => void startCypher()}
          >
            Start
          </Button>
        </div>
      )}

      {phase === "aiThinking" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is cooking…
        </div>
      )}

      {round && phase !== "aiThinking" && (
        <BarDisplay
          bar={round.aiBar}
          endWord={round.aiEndWord}
          speaker="AI"
          accent={style.accent}
        />
      )}

      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={countdown}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            className="display py-6 text-center text-7xl"
            style={{ color: style.accent }}
          >
            {countdown === 1 ? "GO!" : countdown}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "userTurn" && (
        <MicRecorder
          active={phase === "userTurn"}
          onDone={handleMicDone}
          accent={style.accent}
        />
      )}

      {phase === "scoringAll" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is judging the whole battle…
        </div>
      )}

      {phase === "betweenRounds" && (
        <Button
          className="display w-full py-5 text-lg uppercase tracking-widest"
          style={{ background: style.accent, color: "#0a0a0a" }}
          onClick={handleNext}
        >
          Next bar ({history.length + 1} / {totalRounds})
        </Button>
      )}

      {phase === "done" && (
        <div className="rounded-lg border-2 border-primary bg-card p-6 text-center">
          <div className="display text-xs uppercase tracking-widest text-muted-foreground">
            Final
          </div>
          <div
            className="display mt-2 text-5xl"
            style={{ color: style.accent }}
          >
            {verdict?.winner === "user" ? "YOU WIN" : verdict?.winner === "ai" ? `${style.name.toUpperCase()} WINS` : "DRAW"}
          </div>
          <div className="mt-2 font-mono text-sm text-muted-foreground">
            {Math.round(totalUser)} — {totalAi}
          </div>
          {verdict && (
            <p className="mt-4 italic text-foreground">"{verdict.recap}"</p>
          )}
          <div className="mt-6 space-y-3 text-left">
            {history.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Round {i + 1}
                </div>
                <div className="mt-1 text-sm">
                  <span className="opacity-70">AI:</span> {r.aiBar}
                </div>
                <div className="mt-1 text-sm">
                  <span className="opacity-70">You:</span> {r.userTranscript}
                </div>
                {r.score && (
                  <div className="mono mt-1 text-xs" style={{ color: style.accent }}>
                    {Math.round(r.score.overall)} / 100 — {r.score.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              Home
            </Button>
            <Button
              className="display uppercase tracking-widest"
              style={{ background: style.accent, color: "#0a0a0a" }}
              onClick={() => window.location.reload()}
            >
              Run it back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}