import { createFileRoute } from "@tanstack/react-router";

import { requireElevenLabsKey } from "@/lib/elevenlabs.server";

export const Route = createFileRoute("/api/scribe-token")({
  server: {
    handlers: {
      POST: async () => {
        const apiKey = requireElevenLabsKey();
        const r = await fetch(
          "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
          { method: "POST", headers: { "xi-api-key": apiKey } },
        );
        if (!r.ok) {
          const err = await r.text();
          return new Response(err || "token failed", { status: r.status });
        }
        const data = (await r.json()) as { token: string };
        return Response.json({ token: data.token });
      },
    },
  },
});