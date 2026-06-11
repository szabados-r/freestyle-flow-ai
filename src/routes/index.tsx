import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";

import { StylePicker } from "@/components/freestyle/StylePicker";
import { Button } from "@/components/ui/button";
import { BPM_OPTIONS, STYLES, type StyleId } from "@/lib/styles";
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

function Index() {
  const [styleId, setStyleId] = useState<StyleId>("drake");
  const [bpm, setBpm] = useState(85);
  const style = STYLES[styleId];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="display text-xs uppercase tracking-[0.3em] text-muted-foreground">
          AI Freestyle Trainer
        </div>
        <h1
          className="display mt-2 text-6xl leading-none md:text-8xl"
          style={{ color: style.accent, textShadow: `0 0 32px ${style.accent}80` }}
        >
          CYPHER
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          AI drops a bar. You drop one back. We score the rhyme, the flow, and whether
          you stayed on beat. Pick your opponent.
        </p>
      </motion.div>

      <section className="mt-10">
        <h2 className="display mb-3 text-sm uppercase tracking-widest text-muted-foreground">
          1. Pick your opponent
        </h2>
        <StylePicker value={styleId} onChange={setStyleId} />
      </section>

      <section className="mt-10">
        <h2 className="display mb-3 text-sm uppercase tracking-widest text-muted-foreground">
          2. Set the tempo
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

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <Link to="/practice" search={{ style: styleId, bpm }}>
          <Button
            className="display h-auto w-full py-6 text-2xl uppercase tracking-widest"
            style={{ background: style.accent, color: "#0a0a0a" }}
          >
            Practice Cypher
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Endless single-bar trading. Warm up the flow.
          </p>
        </Link>
        <Link to="/battle" search={{ style: styleId, bpm }}>
          <Button
            variant="outline"
            className="display h-auto w-full border-2 py-6 text-2xl uppercase tracking-widest"
            style={{ borderColor: style.accent, color: style.accent }}
          >
            Battle Mode · 8 Bars
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Trade 8 bars. Final verdict in {style.name}'s voice.
          </p>
        </Link>
      </section>

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Mic required. Style names are creative homages — original bars only.
      </footer>
    </main>
  );
}
