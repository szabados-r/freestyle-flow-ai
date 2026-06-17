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
        <div className="mono text-[10px] uppercase tracking-[0.5em] text-[color:var(--neon-pink)]">
          ✦ Open · Til · Late ✦
        </div>
        <h1 className="mt-3 flex flex-col">
          <span className="script neon text-7xl leading-none md:text-9xl">Cypher</span>
          <span className="display mt-1 text-xl uppercase tracking-[0.5em] text-[color:var(--gold-1)] md:text-2xl">
            ★ Gentlemen's · Mic · Club ★
          </span>
        </h1>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-[color:var(--neon-pink)] via-[color:var(--gold-1)] to-transparent" />
      </motion.div>

      <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <div className="mono">
          Chapter {String(step).padStart(2, "0")} · of · {String(totalSteps).padStart(2, "0")}
        </div>
        {step > 1 && (
          <button onClick={goBack} className="flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Back
          </button>
        )}
      </div>
      <div className="mt-3 h-px w-full bg-border">
        <div
          className="h-px transition-all"
          style={{
            width: `${(step / totalSteps) * 100}%`,
            background: "linear-gradient(90deg, var(--neon-pink), var(--neon-magenta), var(--gold-1))",
            boxShadow: "0 0 12px var(--neon-pink)",
          }}
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
          className="display mt-10 h-auto w-full rounded-none border-2 border-[color:var(--neon-pink)] bg-transparent py-6 text-3xl uppercase tracking-[0.4em] hover:bg-[color:var(--neon-pink)]/15"
          style={{ boxShadow: "0 0 24px var(--neon-pink), inset 0 0 18px rgba(255,45,156,0.25)" }}
          onClick={launch}
        >
          <span className="neon">Drop the beat</span>
        </Button>
      )}

      <footer className="mono mt-16 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Mic required · Style names are creative homages · Original bars only
      </footer>
    </main>
  );
}

function StepTitle({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--neon-pink)]">
        ✦ Round {String(n).padStart(2, "0")}
      </div>
      <h2 className="script neon mt-1 text-5xl text-foreground md:text-6xl">{title}</h2>
      {subtitle && (
        <p className="mt-2 max-w-md text-sm italic text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}

function Card({
  active,
  accent,
  onClick,
  children,
  tape: _tape = false,
}: {
  active?: boolean;
  accent?: string;
  onClick: () => void;
  children: React.ReactNode;
  tape?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "velvet group relative w-full rounded-[3px] p-5 text-left text-foreground transition-all duration-300",
        "hover:-translate-y-0.5",
        active ? "scale-[1.02]" : "",
      )}
      style={
        active && accent
          ? {
              borderColor: accent,
              boxShadow: `0 0 0 1px ${accent} inset, 0 0 24px ${accent}99, 0 18px 40px -16px ${accent}66`,
            }
          : undefined
      }
    >
      <span className="relative z-[1] block">{children}</span>
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
              <div className="mono text-[9px] uppercase tracking-[0.3em] opacity-60">
                No. {String(STYLE_LIST.indexOf(s) + 1).padStart(2, "0")}
              </div>
              <div className="script mt-1 text-2xl leading-tight">{s.name}</div>
              <div className="mt-2 text-[11px] italic opacity-75">{s.blurb}</div>
            </Card>
          );
        })}
        <Card
          active={value?.kind === "versus"}
          accent="#facc15"
          onClick={() => onPick({ kind: "versus" })}
        >
          <div className="mono text-[9px] uppercase tracking-[0.3em] opacity-60">Duet</div>
          <div className="script mt-1 text-2xl leading-tight">2-Player</div>
          <div className="mt-2 text-[11px] italic opacity-75">
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
            <div className="script text-2xl leading-tight">{o.label}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{o.blurb}</div>
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
            <div className="script text-2xl leading-tight">{o.label}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{o.blurb}</div>
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
            <div className="script text-2xl leading-tight">{l.label}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{l.blurb}</div>
            <div className="mono mt-3 text-[10px] uppercase tracking-[0.3em] opacity-70">
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
            <div className="script text-2xl leading-tight">{t.label}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{t.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
