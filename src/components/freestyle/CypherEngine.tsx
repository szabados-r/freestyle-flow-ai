import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { BarDisplay } from "./BarDisplay";
import { BeatIndicator } from "./BeatIndicator";
import { MicRecorder, type MicResult } from "./MicRecorder";
import { ScoreCard, type ScoreData } from "./ScoreCard";
import { Button } from "@/components/ui/button";
import { useBeatClock } from "@/lib/beat-clock";
import { generateBar, scoreBar, battleVerdict } from "@/lib/freestyle.functions";
import { STYLES, type StyleId } from "@/lib/styles";

type Phase = "idle" | "aiThinking" | "aiSpeaking" | "countdown" | "userTurn" | "scoring" | "result" | "done";

interface RoundData {
  aiBar: string;
  aiEndWord: string;
  userTranscript?: string;
  durationMs?: number;
  score?: ScoreData;
}

export function CypherEngine({
  styleId,
  bpm,
  mode,
  maxRounds,
}: {
  styleId: StyleId;
  bpm: number;
  mode: "practice" | "battle";
  maxRounds?: number;
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
  const lastUserBarRef = useRef<{ bar: string; end: string } | undefined>(undefined);

  const totalUser = history.reduce((s, r) => s + (r.score?.overall ?? 0), 0);
  const totalAi = history.length * 70; // baseline opponent score for battle

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
  }, [styleId, history.length, playTts, bpm]);

  const handleMicDone = useCallback(
    async (result: MicResult) => {
      if (!round) return;
      if (!result.transcript) {
        toast.error("Didn't catch that. Try again.");
        setPhase("userTurn");
        return;
      }
      setPhase("scoring");
      try {
        const score = await scoreBar({
          data: {
            styleId,
            aiBar: round.aiBar,
            aiEndWord: round.aiEndWord,
            userBar: result.transcript,
            bpm,
            durationMs: result.durationMs,
          },
        });
        const next = { ...round, userTranscript: result.transcript, durationMs: result.durationMs, score };
        setRound(next);
        lastUserBarRef.current = { bar: result.transcript, end: score.endWord };
        setPhase("result");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Scoring failed");
        setPhase("result");
      }
    },
    [round, styleId, bpm],
  );

  const handleNext = useCallback(async () => {
    if (!round?.score) return;
    const newHistory = [...history, round];
    setHistory(newHistory);
    setRound(null);
    if (mode === "battle" && maxRounds && newHistory.length >= maxRounds) {
      setPhase("done");
      try {
        const userTotal = newHistory.reduce((s, r) => s + (r.score?.overall ?? 0), 0);
        const aiTotal = newHistory.length * 70;
        const v = await battleVerdict({
          data: { styleId, userTotal, aiTotal, rounds: newHistory.length },
        });
        setVerdict(v);
      } catch {
        setVerdict({ winner: "draw", recap: "Stalemate. Run it back." });
      }
      clock.stop();
      return;
    }
    void runRound();
  }, [round, history, mode, maxRounds, styleId, runRound, clock]);

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
          {mode === "battle" && (
            <div className="text-xs text-muted-foreground">
              Round {Math.min(history.length + 1, maxRounds ?? 8)} / {maxRounds}
            </div>
          )}
        </div>
      </div>

      {mode === "battle" && history.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
            <div className="display text-[10px] uppercase tracking-widest text-muted-foreground">
              You
            </div>
            <div className="display text-3xl" style={{ color: style.accent }}>
              {Math.round(totalUser)}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
            <div className="display text-[10px] uppercase tracking-widest text-muted-foreground">
              {style.name}
            </div>
            <div className="display text-3xl text-foreground">{totalAi}</div>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Beat starts, AI drops a bar, then you spit one back. Allow mic access.
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

      {(phase === "userTurn" || phase === "scoring") && (
        <MicRecorder
          active={phase === "userTurn"}
          onDone={handleMicDone}
          accent={style.accent}
        />
      )}

      {phase === "scoring" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Judging your bar…
        </div>
      )}

      {phase === "result" && round?.score && (
        <>
          {round.userTranscript && (
            <BarDisplay
              bar={round.userTranscript}
              endWord={round.score.endWord}
              speaker="YOU"
              accent={style.accent}
            />
          )}
          <ScoreCard score={round.score} accent={style.accent} />
          <Button
            className="display w-full py-5 text-lg uppercase tracking-widest"
            style={{ background: style.accent, color: "#0a0a0a" }}
            onClick={() => void handleNext()}
          >
            {mode === "battle" && maxRounds && history.length + 1 >= maxRounds
              ? "See the verdict"
              : "Next bar"}
          </Button>
        </>
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