import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CypherEngine } from "@/components/freestyle/CypherEngine";

const search = z.object({
  style: z.enum(["drake", "future", "nicki", "thug", "magyar", "hofi", "azahriah"]).default("drake"),
  bpm: z.coerce.number().default(85),
  language: z.enum(["en", "hu"]).optional(),
  level: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.enum(["freestyle", "pop", "sports", "music"]).optional(),
});

export const Route = createFileRoute("/practice")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Practice Cypher — Freestyle Trainer" },
      { name: "description", content: "Endless freestyle practice with an AI rap opponent." },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { style, bpm, language, level, topic } = Route.useSearch();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <CypherEngine
        styleId={style}
        bpm={bpm}
        mode="practice"
        language={language}
        level={level}
        topic={topic}
      />
    </main>
  );
}