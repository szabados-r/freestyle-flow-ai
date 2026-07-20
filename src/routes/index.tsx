import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Settings2 } from "lucide-react";

import {
  DEFAULT_BPM,
  STYLE_LIST,
  STYLES,
  TOPICS,
  type LevelId,
  type TopicId,
  type StyleId,
} from "@/lib/styles";
import { cn } from "@/lib/utils";

const DEFAULT_LEVEL: LevelId = "easy";

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

// Difficulty is fixed app-wide (see src/lib/styles.ts LEVELS/DEFAULT_BPM) — only topic is user-tunable.
const DEFAULT_TOPIC: TopicId = "freestyle";
const CONFIG_KEY = "cypher.systemConfig.v1";

type SystemConfig = { topic: TopicId };

function loadConfig(): SystemConfig {
  if (typeof window === "undefined") return { topic: DEFAULT_TOPIC };
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (!raw) return { topic: DEFAULT_TOPIC };
    const parsed = JSON.parse(raw) as Partial<SystemConfig>;
    return {
      topic: (parsed.topic && TOPICS[parsed.topic as TopicId] ? parsed.topic : DEFAULT_TOPIC) as TopicId,
    };
  } catch {
    return { topic: DEFAULT_TOPIC };
  }
}

function Index() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<ModeType | null>(null);
  const [styleId, setStyleId] = useState<StyleId | null>(null);
  const [config, setConfig] = useState<SystemConfig>({ topic: DEFAULT_TOPIC });
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  const updateConfig = (patch: Partial<SystemConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const totalSteps = 2;

  const goNext = (s: number) => setStep(s);
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const launch = () => {
    if (!mode || !styleId) return;
    const language = STYLES[styleId].language;
    if (mode === "battle") {
      navigate({
        to: "/versus",
        search: {
          style: styleId,
          bpm: DEFAULT_BPM,
          language,
          level: DEFAULT_LEVEL,
          topic: config.topic,
        },
      });
      return;
    }
    navigate({
      to: "/battle",
      search: {
        style: styleId,
        bpm: DEFAULT_BPM,
        language,
        level: DEFAULT_LEVEL,
        topic: config.topic,
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
        <div className="mono text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          <span className="text-[color:var(--ember)]">NY</span> · Freestyle Trainer · Est. 2026
        </div>
        <h1 className="mt-2 flex flex-col">
          <span className="script text-7xl italic leading-[0.9] text-foreground md:text-8xl">
            Cy<span className="text-[color:var(--ember)]">p</span>her
          </span>
        </h1>
        <div className="mt-4 h-px w-full bg-gradient-to-r from-[color:var(--ember)] via-[color:var(--mustard)] to-transparent" />
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
            background: "linear-gradient(90deg, var(--ember), var(--mustard))",
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

      <SystemConfigPanel
        open={configOpen}
        onToggle={() => setConfigOpen((v) => !v)}
        config={config}
        onChange={updateConfig}
      />

      <footer className="mono mt-16 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Mic required · Style names are creative homages · Original bars only
      </footer>
    </main>
  );
}

function StepTitle({ n, title, subtitle }: { n: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <div className="mono text-[10px] uppercase tracking-[0.4em] text-[color:var(--ember)]">
        Step {String(n).padStart(2, "0")}
      </div>
      <h2 className="script mt-1 text-5xl italic text-foreground md:text-6xl">{title}</h2>
      {subtitle && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{subtitle}</p>
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
              boxShadow: `0 0 0 1px ${accent} inset`,
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
      accent: "#c96f4a",
    },
    {
      id: "battle",
      label: "2-Player Battle",
      blurb: "Pass the phone. AI rapper opens, you and a friend trade back. Judged at the end.",
      accent: "#3f8a8a",
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

function SystemConfigPanel({
  open,
  onToggle,
  config,
  onChange,
}: {
  open: boolean;
  onToggle: () => void;
  config: SystemConfig;
  onChange: (patch: Partial<SystemConfig>) => void;
}) {
  const topicOrder: TopicId[] = ["freestyle", "pop", "sports", "music", "whatever"];
  const currentTopic = TOPICS[config.topic];

  return (
    <div className="mt-12 border-t border-border pt-6">
      <button
        type="button"
        onClick={onToggle}
        className="mono flex w-full items-center justify-between text-[10px] uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          <Settings2 className="h-3 w-3" />
          System Config
        </span>
        <span className="opacity-70">
          {currentTopic.label}
          <span className="ml-3">{open ? "—" : "+"}</span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-6">
              <div>
                <div className="mono mb-2 text-[10px] uppercase tracking-[0.3em] text-[color:var(--ember)]">
                  Topic
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                  {topicOrder.map((id) => {
                    const t = TOPICS[id];
                    const active = config.topic === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onChange({ topic: id })}
                        className={cn(
                          "velvet rounded-[3px] p-3 text-left transition-all",
                          active ? "scale-[1.02]" : "opacity-70 hover:opacity-100",
                        )}
                        style={
                          active
                            ? {
                                borderColor: "var(--ember)",
                                boxShadow: "0 0 0 1px var(--ember) inset",
                              }
                            : undefined
                        }
                      >
                        <div className="script text-xl italic leading-none">{t.label}</div>
                        <div className="mt-1 text-[11px] italic opacity-75">{t.blurb}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
            <div className="script mt-1 text-3xl italic leading-tight">{s.name}</div>
            <div className="mt-2 text-[11px] italic opacity-75">{s.blurb}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
