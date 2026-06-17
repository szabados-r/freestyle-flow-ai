import { createFileRoute } from "@tanstack/react-router";

import { requireElevenLabsKey } from "@/lib/elevenlabs.server";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = requireElevenLabsKey();
        const incoming = await request.formData();
        const file = incoming.get("file");
        if (!file || typeof file === "string") {
          return new Response("missing file", { status: 400 });
        }
        const language = (incoming.get("language") as string) || "";

        const form = new FormData();
        form.append("file", file, "bar.webm");
        form.append("model_id", "scribe_v2");
        form.append("tag_audio_events", "false");
        form.append("diarize", "false");
        if (language) form.append("language_code", language);

        const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": apiKey },
          body: form,
        });
        if (!r.ok) {
          const err = await r.text();
          return new Response(err || "transcribe failed", { status: r.status });
        }
        const data = (await r.json()) as { text: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});