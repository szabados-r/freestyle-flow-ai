import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  LEVELS,
  STYLE_LIST,
  STYLES,
  type StyleId,
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

type ModeType = "solo" | "battle";

// System-level defaults (previously user-selectable steps).
const DEFAULT_LEVEL: "easy" | "medium" | "hard" = "medium";
const DEFAULT_TOPIC = "freestyle" as const;

function Index() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ModeType | null>(null);
  const [styleId, setStyleId] = useState<StyleId | null>(null);

  const totalSteps = 2;

  const goNext = (s: number) => setStep(s);
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const launch = () => {
    if (!mode || !styleId) return;
    const language = STYLES[styleId].language;
    const lvl = LEVELS[DEFAULT_LEVEL];
    if (mode === "battle") {
      navigate({
        to: "/versus",
        search: {
          style: styleId,
          bpm: lvl.bpm,
          language,
          level: DEFAULT_LEVEL,
          topic: DEFAULT_TOPIC,
        },
      });
      return;
    }
    navigate({
      to: "/battle",
      search: {
        style: styleId,
        bpm: lvl.bpm,
        language,
        level: DEFAULT_LEVEL,
        topic: DEFAULT_TOPIC,
      },
    });
  };

  useEffect(() => {
    if (step === 2 && mode && styleId) {
      launch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId]);

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex flex-col">
          <span className="script neon text-7xl leading-none md:text-9xl">Cypher</span>
        </h1>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-[color:var(--neon-pink)] via-[color:var(--gold-1)] to-transparent" />
      </motion.div>

      <div className="mt-8 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <div className="mono">
          Step {String(step).padStart(2, "0")} · of · {String(totalSteps).padStart(2, "0")}
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
            <StepMode
              value={mode}
              onPick={(m) => {
                setMode(m);
                goNext(2);
              }}
            />
          )}
          {step === 2 && (
            <StepRapper
              mode={mode}
              value={styleId}
              onPick={(s) => {
                setStyleId(s);
              }}
            />
          )}
        </motion.section>
      </AnimatePresence>

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
        Step {String(n).padStart(2, "0")}
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

function StepMode({
  value,
  onPick,
}: {
  value: ModeType | null;
  onPick: (m: ModeType) => void;
}) {
  const opts: { id: ModeType; label: string; blurb: string; accent: string }[] = [
    {
      id: "solo",
      label: "Vs Rapper",
      blurb: "You against the selected AI rapper. Trade bars, judged at the end.",
      accent: "#ff2d9c",
    },
    {
      id: "battle",
      label: "2-Player Battle",
      blurb: "Pass the phone. AI rapper opens, you and a friend trade back. Judged at the end.",
      accent: "#facc15",
    },
  ];
  return (
    <div>
      <StepTitle n={1} title="Pick your mode" subtitle="Solo vs the AI, or 2-player with an AI host." />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {opts.map((o) => (
          <Card key={o.id} active={value === o.id} accent={o.accent} onClick={() => onPick(o.id)}>
            <div className="script text-2xl leading-tight">{o.label}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{o.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StepRapper({
  mode,
  value,
  onPick,
}: {
  mode: ModeType | null;
  value: StyleId | null;
  onPick: (s: StyleId) => void;
}) {
  const title = mode === "battle" ? "Pick the host" : "Pick your opponent";
  const subtitle =
    mode === "battle"
      ? "This AI rapper opens the cypher and trades bars between players."
      : "The AI rapper you'll battle.";
  return (
    <div>
      <StepTitle n={2} title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {STYLE_LIST.map((s) => (
          <Card
            key={s.id}
            active={value === s.id}
            accent={s.accent}
            onClick={() => onPick(s.id)}
          >
            <div className="mono text-[9px] uppercase tracking-[0.3em] opacity-60">
              No. {String(STYLE_LIST.indexOf(s) + 1).padStart(2, "0")}
            </div>
            <div className="script mt-1 text-2xl leading-tight">{s.name}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{s.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
