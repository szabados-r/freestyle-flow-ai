import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { VersusEngine } from "@/components/freestyle/VersusEngine";
import { StylePicker } from "@/components/freestyle/StylePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BPM_OPTIONS, STYLES, type StyleId } from "@/lib/styles";
import { cn } from "@/lib/utils";

const search = z.object({
  style: z.enum(["drake", "future", "nicki", "thug", "magyar", "hofi", "azahriah"]).optional(),
  bpm: z.coerce.number().optional(),
  p1: z.string().optional(),
  p2: z.string().optional(),
  bars: z.coerce.number().optional(),
  go: z.coerce.boolean().optional(),
  language: z.enum(["en", "hu"]).optional(),
  level: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.enum(["freestyle", "pop", "sports", "music"]).optional(),
});

export const Route = createFileRoute("/versus")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Versus Mode — Freestyle Trainer" },
      { name: "description", content: "Battle a friend on the same phone. AI judges every bar in your chosen artist's voice." },
    ],
  }),
  component: Versus,
});

function Versus() {
  const sp = Route.useSearch();
  const navigate = useNavigate();
  const [styleId, setStyleId] = useState<StyleId>(sp.style ?? "drake");
  const [bpm, setBpm] = useState(sp.bpm ?? 85);
  const [p1, setP1] = useState(sp.p1 ?? "");
  const [p2, setP2] = useState(sp.p2 ?? "");
  const [bars, setBars] = useState<number>(sp.bars ?? 8);

  if (sp.go && sp.p1 && sp.p2) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
        <VersusEngine
          styleId={(sp.style ?? "drake") as StyleId}
          bpm={sp.bpm ?? 85}
          p1Name={sp.p1}
          p2Name={sp.p2}
          rounds={sp.bars ?? 8}
          language={sp.language}
          level={sp.level}
          topic={sp.topic}
        />
      </main>
    );
  }

  const style = STYLES[styleId];
  const ready = p1.trim().length > 0 && p2.trim().length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
      <button
        onClick={() => navigate({ to: "/" })}
        className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
      >
        ← Back
      </button>
      <h1
        className="display mt-3 text-5xl md:text-6xl"
        style={{ color: style.accent, textShadow: `0 0 24px ${style.accent}80` }}
      >
        VERSUS
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pass-and-play. Two rappers, one phone. {style.name} hosts and judges every bar.
      </p>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <div>
          <label className="display text-[10px] uppercase tracking-widest text-muted-foreground">
            Player 1
          </label>
          <Input
            placeholder="MC name"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            className="mt-1"
            maxLength={16}
          />
        </div>
        <div>
          <label className="display text-[10px] uppercase tracking-widest text-muted-foreground">
            Player 2
          </label>
          <Input
            placeholder="MC name"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            className="mt-1"
            maxLength={16}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="display mb-3 text-sm uppercase tracking-widest text-muted-foreground">
          Battle style
        </h2>
        <StylePicker value={styleId} onChange={setStyleId} />
      </section>

      <section className="mt-8">
        <h2 className="display mb-3 text-sm uppercase tracking-widest text-muted-foreground">
          Tempo
        </h2>
        <div className="flex gap-2">
          {BPM_OPTIONS.map((o) => (
            <button
              key={o.bpm}
              type="button"
              onClick={() => setBpm(o.bpm)}
              className={cn(
                "rounded-md border-2 px-5 py-3 transition-all",
                bpm === o.bpm
                  ? "border-primary bg-card"
                  : "border-border bg-card/40 hover:border-primary/60",
              )}
            >
              <div className="display text-2xl">{o.bpm}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {o.label}
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="display mb-3 text-sm uppercase tracking-widest text-muted-foreground">
          Length
        </h2>
        <div className="flex gap-2">
          {[4, 8, 12].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setBars(n)}
              className={cn(
                "rounded-md border-2 px-5 py-3 transition-all",
                bars === n
                  ? "border-primary bg-card"
                  : "border-border bg-card/40 hover:border-primary/60",
              )}
            >
              <div className="display text-2xl">{n}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                bars
              </div>
            </button>
          ))}
        </div>
      </section>

      <Button
        disabled={!ready}
        className="display mt-10 h-auto w-full py-6 text-2xl uppercase tracking-widest disabled:opacity-50"
        style={ready ? { background: style.accent, color: "#0a0a0a" } : undefined}
        onClick={() =>
          navigate({
            to: "/versus",
            search: {
              style: styleId,
              bpm,
              p1: p1.trim(),
              p2: p2.trim(),
              bars,
              go: true,
              language: sp.language,
              level: sp.level,
              topic: sp.topic,
            },
          })
        }
      >
        Start the battle
      </Button>
      {!ready && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter both MC names to start.
        </p>
      )}
    </main>
  );
}