import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CypherEngine } from "@/components/freestyle/CypherEngine";

const search = z.object({
  style: z.enum(["drake", "nicki", "hofi"]).default("drake"),
  bpm: z.coerce.number().default(95),
  language: z.enum(["en", "hu"]).optional(),
  level: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.enum(["freestyle", "pop", "sports", "music", "whatever"]).optional(),
});

export const Route = createFileRoute("/battle")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Battle Mode — Freestyle Trainer" },
      { name: "description", content: "Trade 8 bars against an AI freestyle opponent." },
    ],
  }),
  component: Battle,
});

function Battle() {
  const { style, bpm, language, level, topic } = Route.useSearch();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <CypherEngine
        styleId={style}
        bpm={bpm}
        mode="battle"
        maxRounds={4}
        language={language}
        level={level}
        topic={topic}
      />
    </main>
  );
}