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
import { generateBar, scoreBar, versusVerdict } from "@/lib/freestyle.functions";
import { STYLES, type StyleId } from "@/lib/styles";

type Phase =
  | "idle"
  | "aiThinking"
  | "aiSpeaking"
  | "handoff"
  | "countdown"
  | "userTurn"
  | "scoringAll"
  | "done";

type Slot = "ai1" | "p1" | "ai2" | "p2";
const SLOTS: Slot[] = ["ai1", "p1", "ai2", "p2"];

interface TurnEntry {
  slot: Slot;
  bar: string;
  endWord: string;
  durationMs?: number;
  score?: ScoreData;
  pending?: boolean;
}

export function VersusEngine({
  styleId,
  bpm,
  p1Name,
  p2Name,
  rounds: _rounds,
  language,
  level,
  topic,
}: {
  styleId: StyleId;
  bpm: number;
  p1Name: string;
  p2Name: string;
  rounds: number; // ignored — fixed 4-bar cycle: AI, P1, AI, P2
  language?: "en" | "hu";
  level?: "easy" | "medium" | "hard";
  topic?: "freestyle" | "pop" | "sports" | "music" | "whatever";
}) {
  const navigate = useNavigate();
  const style = STYLES[styleId];
  const clock = useBeatClock(bpm);
  const [phase, setPhase] = useState<Phase>("idle");
  const [slotIndex, setSlotIndex] = useState(0); // 0..3 in [ai1,p1,ai2,p2]
  const [history, setHistory] = useState<TurnEntry[]>([]);
  const [countdown, setCountdown] = useState(4);
  const [verdict, setVerdict] = useState<{ winner: string; recap: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingRef = useRef<Map<number, Promise<string>>>(new Map());
  const totalSlots = SLOTS.length;
  const currentSlot = SLOTS[slotIndex];
  const isPlayerSlot = currentSlot === "p1" || currentSlot === "p2";
  const currentPlayer: 1 | 2 = currentSlot === "p1" ? 1 : 2;
  const currentName = currentPlayer === 1 ? p1Name : p2Name;

  const p1Total = history
    .filter((h) => h.slot === "p1")
    .reduce((s, h) => s + (h.score?.overall ?? 0), 0);
  const p2Total = history
    .filter((h) => h.slot === "p2")
    .reduce((s, h) => s + (h.score?.overall ?? 0), 0);

  const playTts = useCallback(async (text: string) => {
    try {
      const r = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: style.voiceId }),
      });
      if (!r.ok) return;
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
    } catch {
      // ignore tts failure
    }
  }, [style.voiceId]);

  const runCountdown = useCallback(async () => {
    setPhase("countdown");
    for (let i = 4; i >= 1; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 60_000 / bpm));
    }
    setPhase("userTurn");
  }, [bpm]);

  // Run an AI slot: generate, speak, then hand off to the next player
  const runAiSlot = useCallback(
    async (slot: "ai1" | "ai2") => {
      setPhase("aiThinking");
      try {
        // For ai2, respond to p1's bar
        const prevPlayerEntry =
          slot === "ai2" ? history.find((h) => h.slot === "p1") : undefined;
        const bar = await generateBar({
          data: {
            styleId,
            previousUserBar: prevPlayerEntry?.bar,
            previousEndWord: prevPlayerEntry?.endWord,
            roundIndex: slot === "ai1" ? 0 : 1,
            language,
            level,
            topic,
          },
        });
        const entry: TurnEntry = {
          slot,
          bar: bar.bar,
          endWord: bar.endWord,
        };
        setHistory((h) => [...h, entry]);
        setPhase("aiSpeaking");
        const intro =
          slot === "ai1"
            ? `Aight ${p1Name} versus ${p2Name}. ${p1Name} you up first.`
            : `Not bad. ${p2Name} — your turn.`;
        await playTts(`${intro} ${bar.bar}`);
        setPhase("handoff");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "AI failed");
        setPhase("idle");
      }
    },
    [styleId, history, language, level, topic, p1Name, p2Name, playTts],
  );

  const startBattle = useCallback(async () => {
    await clock.start();
    await runAiSlot("ai1");
  }, [clock, runAiSlot]);

  const handleMicDone = useCallback(
    async (result: MicResult) => {
      const slot: Slot = currentSlot;
      const entry: TurnEntry = {
        slot,
        bar: "",
        endWord: "",
        durationMs: result.durationMs,
        pending: true,
      };
      const newHistory = [...history, entry];
      const idx = newHistory.length - 1;
      pendingRef.current.set(idx, result.transcriptPromise);
      void result.transcriptPromise.then((text) => {
        setHistory((h) =>
          h.map((t, i) =>
            i === idx
              ? {
                  ...t,
                  bar: text,
                  endWord: text.trim().split(/\s+/).pop() ?? "",
                  pending: false,
                }
              : t,
          ),
        );
      });
      setHistory(newHistory);

      // Advance
      const nextIndex = slotIndex + 1;
      if (nextIndex >= totalSlots) {
        // End of battle — score everything now.
        setPhase("scoringAll");
        clock.stop();
        try {
          // Wait for any still-transcribing player bars.
          const transcripts = await Promise.all(
            newHistory.map((_, i) =>
              pendingRef.current.get(i) ?? Promise.resolve(""),
            ),
          );
          const resolved = newHistory.map((t, i) => {
            if (!pendingRef.current.has(i)) return t;
            const text = transcripts[i] || "";
            return {
              ...t,
              bar: text,
              endWord: text.trim().split(/\s+/).pop() ?? "",
              pending: false,
            };
          });
          const ai1 = resolved.find((h) => h.slot === "ai1");
          const ai2 = resolved.find((h) => h.slot === "ai2");
          const p1 = resolved.find((h) => h.slot === "p1");
          const p2 = resolved.find((h) => h.slot === "p2");
          const [p1Score, p2Score] = await Promise.all([
            p1 && ai1
              ? scoreBar({
                  data: {
                    styleId,
                    aiBar: ai1.bar,
                    aiEndWord: ai1.endWord,
                    userBar: p1.bar,
                    bpm,
                    durationMs: p1.durationMs,
                    language,
                  },
                })
              : Promise.resolve(null),
            p2 && ai2
              ? scoreBar({
                  data: {
                    styleId,
                    aiBar: ai2.bar,
                    aiEndWord: ai2.endWord,
                    userBar: p2.bar,
                    bpm,
                    durationMs: p2.durationMs,
                    language,
                  },
                })
              : Promise.resolve(null),
          ]);
          const scoredHistory = resolved.map((h) => {
            if (h.slot === "p1" && p1Score) return { ...h, score: p1Score };
            if (h.slot === "p2" && p2Score) return { ...h, score: p2Score };
            return h;
          });
          setHistory(scoredHistory);
          const p1Tot = p1Score?.overall ?? 0;
          const p2Tot = p2Score?.overall ?? 0;
          try {
            const v = await versusVerdict({
              data: {
                styleId,
                p1Name,
                p2Name,
                p1Total: p1Tot,
                p2Total: p2Tot,
                rounds: 2,
              },
            });
            setVerdict(v);
            void playTts(v.recap);
          } catch {
            setVerdict({
              winner: p1Tot > p2Tot ? p1Name : p2Tot > p1Tot ? p2Name : "draw",
              recap: "Stalemate. Run it back.",
            });
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Scoring failed");
        }
        setPhase("done");
        return;
      }
      setSlotIndex(nextIndex);
      // If next is an AI slot, run it; otherwise show handoff to next player
      const nextSlot = SLOTS[nextIndex];
      if (nextSlot === "ai2") {
        void runAiSlot("ai2");
      } else {
        setPhase("handoff");
      }
    },
    [
      currentSlot,
      slotIndex,
      history,
      styleId,
      bpm,
      language,
      clock,
      p1Name,
      p2Name,
      playTts,
      runAiSlot,
    ],
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clock.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent = style.accent;
  const lastAiEntry = [...history].reverse().find((h) => h.slot === "ai1" || h.slot === "ai2");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
          >
            ← Exit
          </button>
          <div className="display text-lg" style={{ color: accent }}>
            {style.name} hosts
          </div>
          <div className="text-xs text-muted-foreground">{bpm} BPM</div>
        </div>
        <div className="flex items-center gap-3">
          <BeatIndicator beat={clock.beat} accent={accent} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => (clock.isPlaying ? clock.stop() : void clock.start())}
          >
            {clock.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="text-xs text-muted-foreground">
            Step {Math.min(slotIndex + 1, totalSlots)} / {totalSlots}
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {style.name} drops a bar → {p1Name} answers → {style.name} drops again → {p2Name} closes it.
            All four bars are judged at the end.
          </p>
          <Button
            className="display mt-4 text-lg uppercase tracking-widest"
            style={{ background: accent, color: "#0a0a0a" }}
            onClick={() => void startBattle()}
          >
            Start the battle
          </Button>
        </div>
      )}

      {phase === "aiThinking" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is cooking…
        </div>
      )}

      {lastAiEntry && (phase === "aiSpeaking" || phase === "handoff" || phase === "countdown" || phase === "userTurn") && (
        <BarDisplay
          bar={lastAiEntry.bar}
          endWord={lastAiEntry.endWord}
          speaker="AI"
          accent={accent}
        />
      )}

      {phase === "handoff" && isPlayerSlot && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border-2 p-8 text-center"
          style={{ borderColor: accent }}
        >
          <div className="display text-xs uppercase tracking-widest text-muted-foreground">
            Pass the phone to
          </div>
          <div className="display mt-2 text-5xl" style={{ color: accent }}>
            {currentName}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Respond to {style.name}'s bar above.
          </div>
          <Button
            className="display mt-5 uppercase tracking-widest"
            style={{ background: accent, color: "#0a0a0a" }}
            onClick={() => void runCountdown()}
          >
            I'm ready
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {phase === "countdown" && (
          <motion.div
            key={countdown}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            className="display py-6 text-center text-7xl"
            style={{ color: accent }}
          >
            {countdown === 1 ? "GO!" : countdown}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "userTurn" && (
        <>
          <div className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            <span style={{ color: accent }}>{currentName}</span>'s turn
          </div>
          <MicRecorder
            active={phase === "userTurn"}
            onDone={handleMicDone}
            accent={accent}
          />
        </>
      )}

      {phase === "scoringAll" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is judging the whole battle…
        </div>
      )}

      {phase === "done" && (
        <div className="rounded-lg border-2 border-primary bg-card p-6 text-center">
          <div className="display text-xs uppercase tracking-widest text-muted-foreground">
            Final
          </div>
          <div className="display mt-2 text-5xl" style={{ color: accent }}>
            {verdict?.winner === "draw" || !verdict ? "DRAW" : `${verdict.winner.toUpperCase()} WINS`}
          </div>
          <div className="mt-2 font-mono text-sm text-muted-foreground">
            {p1Name} {Math.round(p1Total)} — {Math.round(p2Total)} {p2Name}
          </div>
          {verdict && (
            <p className="mt-4 italic text-foreground">"{verdict.recap}"</p>
          )}
          <div className="mt-6 space-y-3 text-left">
            {history.map((h, i) => (
              <div key={i} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {h.slot === "ai1" || h.slot === "ai2"
                    ? `${style.name} (bar ${h.slot === "ai1" ? 1 : 2})`
                    : h.slot === "p1"
                      ? p1Name
                      : p2Name}
                </div>
                <div className="mt-1 text-sm">{h.bar}</div>
                {h.score && (
                  <div className="mono mt-1 text-xs" style={{ color: accent }}>
                    {Math.round(h.score.overall)} / 100 — {h.score.feedback}
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
              style={{ background: accent, color: "#0a0a0a" }}
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