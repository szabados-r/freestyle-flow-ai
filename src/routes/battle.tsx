import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { CypherEngine } from "@/components/freestyle/CypherEngine";

const search = z.object({
  style: z.enum(["drake", "future", "nicki", "thug"]).default("drake"),
  bpm: z.coerce.number().default(85),
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
  const { style, bpm } = Route.useSearch();
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <CypherEngine styleId={style} bpm={bpm} mode="battle" maxRounds={8} />
    </main>
  );
}