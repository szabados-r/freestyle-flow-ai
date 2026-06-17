import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LEVELS,
  STYLE_LIST,
  STYLES,
  TOPICS,
  type LevelId,
  type StyleId,
  type TopicId,
} from "@/lib/styles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cypher — AI Freestyle Trainer" },
      {
        name: "description",
        content: "Trade bars with an AI freestyle opponent. Real-time scoring on rhyme, flow, and beat.",
      },
      { property: "og:title", content: "Cypher — AI Freestyle Trainer" },
      {
        property: "og:description",
        content: "Trade bars with an AI freestyle opponent. Real-time scoring on rhyme, flow, and beat.",
      },
    ],
  }),
  component: Index,
});

type Opponent = { kind: "ai"; styleId: StyleId } | { kind: "versus" };
type ModeType = "practice" | "battle";
type Lang = "en" | "hu";

function Index() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [mode, setMode] = useState<ModeType | null>(null);
  const [language, setLanguage] = useState<Lang | null>(null);
  const [level, setLevel] = useState<LevelId | null>(null);
  const [topic, setTopic] = useState<TopicId | null>(null);

  const accent =
    opponent?.kind === "ai" ? STYLES[opponent.styleId].accent : "#facc15";

  const totalSteps = opponent?.kind === "versus" ? 4 : 5; // skip mode step for versus

  const goNext = (s: number) => setStep(s);
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const launch = () => {
    if (!opponent || !language || !level || !topic) return;
    const lvl = LEVELS[level];
    if (opponent.kind === "versus") {
      navigate({
        to: "/versus",
        search: {
          style: "drake",
          bpm: lvl.bpm,
          language,
          level,
          topic,
        },
      });
      return;
    }
    const base = {
      style: opponent.styleId,
      bpm: lvl.bpm,
      language,
      level,
      topic,
    } as const;
    navigate({ to: mode === "battle" ? "/battle" : "/practice", search: base });
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          AI Freestyle Trainer
        </div>
        <h1
          className="display mt-2 text-5xl leading-none md:text-7xl"
          style={{ color: accent, textShadow: `0 0 32px ${accent}80` }}
        >
          CYPHER
        </h1>
      </motion.div>

      <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <div>
          Step {step} / {totalSteps}
        </div>
        {step > 1 && (
          <button onClick={goBack} className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
        )}
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-border">
        <div
          className="h-1 rounded-full transition-all"
          style={{ width: `${(step / totalSteps) * 100}%`, background: accent }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="mt-8"
        >
          {step === 1 && (
            <StepOpponent
              value={opponent}
              onPick={(o) => {
                setOpponent(o);
                // Versus skips the mode step; go to language
                goNext(o.kind === "versus" ? 3 : 2);
              }}
            />
          )}
          {step === 2 && (
            <StepMode
              accent={accent}
              value={mode}
              onPick={(m) => {
                setMode(m);
                goNext(3);
              }}
            />
          )}
          {step === 3 && (
            <StepLanguage
              accent={accent}
              value={language}
              onPick={(l) => {
                setLanguage(l);
                goNext(4);
              }}
            />
          )}
          {step === 4 && (
            <StepLevel
              accent={accent}
              value={level}
              onPick={(l) => {
                setLevel(l);
                goNext(5);
              }}
            />
          )}
          {step === 5 && (
            <StepTopic
              accent={accent}
              value={topic}
              onPick={(t) => {
                setTopic(t);
              }}
            />
          )}
        </motion.section>
      </AnimatePresence>

      {step === 5 && topic && (
        <Button
          className="display mt-8 h-auto w-full py-6 text-2xl uppercase tracking-widest"
          style={{ background: accent, color: "#0a0a0a" }}
          onClick={launch}
        >
          Drop the beat
        </Button>
      )}

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Mic required. Style names are creative homages — original bars only.
      </footer>
    </main>
  );
}

function StepTitle({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <div className="display text-xs uppercase tracking-widest text-muted-foreground">
        Step {n}
      </div>
      <h2 className="display mt-1 text-3xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Card({
  active,
  accent,
  onClick,
  children,
}: {
  active?: boolean;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border-2 p-4 text-left transition-all",
        active
          ? "bg-card"
          : "border-border bg-card/40 hover:border-primary/60",
      )}
      style={active && accent ? { borderColor: accent, boxShadow: `0 0 24px -6px ${accent}` } : undefined}
    >
      {children}
    </button>
  );
}

function StepOpponent({
  value,
  onPick,
}: {
  value: Opponent | null;
  onPick: (o: Opponent) => void;
}) {
  return (
    <div>
      <StepTitle n={1} title="Pick your opponent" subtitle="Battle an AI rapper or pass the phone with a friend." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {STYLE_LIST.map((s) => {
          const active = value?.kind === "ai" && value.styleId === s.id;
          return (
            <Card
              key={s.id}
              active={active}
              accent={s.accent}
              onClick={() => onPick({ kind: "ai", styleId: s.id })}
            >
              <div className="display text-xl" style={{ color: active ? s.accent : undefined }}>
                {s.name}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.blurb}</div>
            </Card>
          );
        })}
        <Card
          active={value?.kind === "versus"}
          accent="#facc15"
          onClick={() => onPick({ kind: "versus" })}
        >
          <div className="display text-xl" style={{ color: value?.kind === "versus" ? "#facc15" : undefined }}>
            2-Player
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Pass the phone. AI hosts and judges every bar.
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepMode({
  accent,
  value,
  onPick,
}: {
  accent: string;
  value: ModeType | null;
  onPick: (m: ModeType) => void;
}) {
  const opts: { id: ModeType; label: string; blurb: string }[] = [
    { id: "practice", label: "Practice", blurb: "Endless single-bar trading. Warm up your flow." },
    { id: "battle", label: "Battle · 8 bars", blurb: "Trade 8 bars. Final verdict in the rapper's voice." },
  ];
  return (
    <div>
      <StepTitle n={2} title="Pick your mode" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {opts.map((o) => (
          <Card key={o.id} active={value === o.id} accent={accent} onClick={() => onPick(o.id)}>
            <div className="display text-xl" style={{ color: value === o.id ? accent : undefined }}>
              {o.label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{o.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StepLanguage({
  accent,
  value,
  onPick,
}: {
  accent: string;
  value: Lang | null;
  onPick: (l: Lang) => void;
}) {
  const opts: { id: Lang; label: string; blurb: string }[] = [
    { id: "en", label: "English", blurb: "AI writes and judges bars in English." },
    { id: "hu", label: "Magyar", blurb: "AI magyarul ír és értékel." },
  ];
  return (
    <div>
      <StepTitle n={3} title="Pick the language" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {opts.map((o) => (
          <Card key={o.id} active={value === o.id} accent={accent} onClick={() => onPick(o.id)}>
            <div className="display text-xl" style={{ color: value === o.id ? accent : undefined }}>
              {o.label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{o.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StepLevel({
  accent,
  value,
  onPick,
}: {
  accent: string;
  value: LevelId | null;
  onPick: (l: LevelId) => void;
}) {
  return (
    <div>
      <StepTitle n={4} title="Pick the difficulty" subtitle="Sets tempo, bar length, and rhyme complexity." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Object.values(LEVELS).map((l) => (
          <Card key={l.id} active={value === l.id} accent={accent} onClick={() => onPick(l.id)}>
            <div className="display text-xl" style={{ color: value === l.id ? accent : undefined }}>
              {l.label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{l.blurb}</div>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">
              {l.bpm} BPM · {l.syllables}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StepTopic({
  accent,
  value,
  onPick,
}: {
  accent: string;
  value: TopicId | null;
  onPick: (t: TopicId) => void;
}) {
  return (
    <div>
      <StepTitle n={5} title="Pick the topic" subtitle="Bars and rhymes will lean into this theme." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-2">
        {Object.values(TOPICS).map((t) => (
          <Card key={t.id} active={value === t.id} accent={accent} onClick={() => onPick(t.id)}>
            <div className="display text-xl" style={{ color: value === t.id ? accent : undefined }}>
              {t.label}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{t.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
