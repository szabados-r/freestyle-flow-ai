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
import { generateBar, scoreBar, versusVerdict } from "@/lib/freestyle.functions";
import { STYLES, type StyleId } from "@/lib/styles";

type Phase =
  | "idle"
  | "intro"
  | "introSpeaking"
  | "handoff"
  | "countdown"
  | "userTurn"
  | "scoring"
  | "result"
  | "done";

interface TurnEntry {
  player: 1 | 2;
  bar: string;
  endWord: string;
  score: ScoreData;
}

export function VersusEngine({
  styleId,
  bpm,
  p1Name,
  p2Name,
  rounds,
}: {
  styleId: StyleId;
  bpm: number;
  p1Name: string;
  p2Name: string;
  rounds: number; // total bars (split between players)
}) {
  const navigate = useNavigate();
  const style = STYLES[styleId];
  const clock = useBeatClock(bpm);
  const [phase, setPhase] = useState<Phase>("idle");
  const [turn, setTurn] = useState(0); // 0..rounds-1
  const [history, setHistory] = useState<TurnEntry[]>([]);
  const [intro, setIntro] = useState<{ bar: string; endWord: string } | null>(null);
  const [lastEntry, setLastEntry] = useState<TurnEntry | null>(null);
  const [countdown, setCountdown] = useState(4);
  const [verdict, setVerdict] = useState<{ winner: string; recap: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPlayer: 1 | 2 = (turn % 2 === 0 ? 1 : 2);
  const currentName = currentPlayer === 1 ? p1Name : p2Name;

  const p1Total = history.filter((h) => h.player === 1).reduce((s, h) => s + h.score.overall, 0);
  const p2Total = history.filter((h) => h.player === 2).reduce((s, h) => s + h.score.overall, 0);

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

  const startBattle = useCallback(async () => {
    try {
      await clock.start();
      setPhase("intro");
      // Generate an opening "topic" bar from the host artist
      const opener = await generateBar({
        data: { styleId, roundIndex: 0 },
      });
      setIntro({ bar: opener.bar, endWord: opener.endWord });
      setPhase("introSpeaking");
      await playTts(`Aight ${p1Name} versus ${p2Name}. ${p1Name} you up first. ${opener.bar}`);
      await runCountdown();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to start");
      setPhase("idle");
    }
  }, [clock, styleId, p1Name, p2Name, playTts, runCountdown]);

  const handleMicDone = useCallback(
    async (result: MicResult) => {
      if (!result.transcript) {
        toast.error("Didn't catch that. Try again.");
        setPhase("userTurn");
        return;
      }
      // Score against the previous bar (last entry's bar, or the intro for turn 0)
      const prevBar = lastEntry?.bar ?? intro?.bar ?? "";
      const prevEnd = lastEntry?.endWord ?? intro?.endWord ?? "";
      setPhase("scoring");
      try {
        const score = await scoreBar({
          data: {
            styleId,
            aiBar: prevBar,
            aiEndWord: prevEnd,
            userBar: result.transcript,
            bpm,
            durationMs: result.durationMs,
          },
        });
        const entry: TurnEntry = {
          player: currentPlayer,
          bar: result.transcript,
          endWord: score.endWord,
          score,
        };
        setLastEntry(entry);
        setHistory((h) => [...h, entry]);
        setPhase("result");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Scoring failed");
        setPhase("result");
      }
    },
    [styleId, bpm, currentPlayer, lastEntry, intro],
  );

  const handleNext = useCallback(async () => {
    const nextTurn = turn + 1;
    if (nextTurn >= rounds) {
      setPhase("done");
      clock.stop();
      try {
        const v = await versusVerdict({
          data: {
            styleId,
            p1Name,
            p2Name,
            p1Total,
            p2Total,
            rounds,
          },
        });
        setVerdict(v);
        void playTts(v.recap);
      } catch {
        setVerdict({ winner: "draw", recap: "Stalemate. Run it back." });
      }
      return;
    }
    setTurn(nextTurn);
    setPhase("handoff");
  }, [turn, rounds, clock, styleId, p1Name, p2Name, p1Total, p2Total, playTts]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clock.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accent = style.accent;

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
            Bar {Math.min(turn + 1, rounds)} / {rounds}
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      {history.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className={`rounded-lg border-2 px-4 py-3 ${
              currentPlayer === 1 && phase !== "done" ? "bg-card" : "border-border bg-card/40"
            }`}
            style={currentPlayer === 1 && phase !== "done" ? { borderColor: accent } : undefined}
          >
            <div className="display text-[10px] uppercase tracking-widest text-muted-foreground">
              {p1Name}
            </div>
            <div className="display text-3xl" style={{ color: accent }}>
              {Math.round(p1Total)}
            </div>
          </div>
          <div
            className={`rounded-lg border-2 px-4 py-3 ${
              currentPlayer === 2 && phase !== "done" ? "bg-card" : "border-border bg-card/40"
            }`}
            style={currentPlayer === 2 && phase !== "done" ? { borderColor: accent } : undefined}
          >
            <div className="display text-[10px] uppercase tracking-widest text-muted-foreground">
              {p2Name}
            </div>
            <div className="display text-3xl" style={{ color: accent }}>
              {Math.round(p2Total)}
            </div>
          </div>
        </div>
      )}

      {phase === "idle" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {style.name} drops an opening bar, then {p1Name} and {p2Name} trade {rounds} bars total.
            Pass the phone after each turn.
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

      {phase === "intro" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is opening the cypher…
        </div>
      )}

      {intro && phase !== "intro" && (
        <BarDisplay bar={intro.bar} endWord={intro.endWord} speaker="AI" accent={accent} />
      )}

      {phase === "handoff" && (
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
            Respond to {lastEntry ? `${lastEntry.player === 1 ? p1Name : p2Name}'s last bar` : "the opener"}
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

      {(phase === "userTurn" || phase === "scoring") && (
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

      {phase === "scoring" && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {style.name} is judging…
        </div>
      )}

      {phase === "result" && lastEntry && (
        <>
          <BarDisplay
            bar={lastEntry.bar}
            endWord={lastEntry.endWord}
            speaker="YOU"
            accent={accent}
          />
          <ScoreCard score={lastEntry.score} accent={accent} />
          <Button
            className="display w-full py-5 text-lg uppercase tracking-widest"
            style={{ background: accent, color: "#0a0a0a" }}
            onClick={() => void handleNext()}
          >
            {turn + 1 >= rounds ? "See the verdict" : `Pass to ${currentPlayer === 1 ? p2Name : p1Name}`}
          </Button>
        </>
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