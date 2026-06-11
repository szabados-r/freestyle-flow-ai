import { createFileRoute } from "@tanstack/react-router";

import { requireElevenLabsKey } from "@/lib/elevenlabs.server";

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { text?: string; voiceId?: string };
        if (!body.text || !body.voiceId) {
          return new Response("text and voiceId required", { status: 400 });
        }
        const apiKey = requireElevenLabsKey();
        const upstream = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}/stream?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: body.text,
              model_id: "eleven_turbo_v2_5",
              voice_settings: {
                stability: 0.35,
                similarity_boost: 0.75,
                style: 0.65,
                use_speaker_boost: true,
                speed: 1.05,
              },
            }),
          },
        );
        if (!upstream.ok || !upstream.body) {
          const msg = await upstream.text();
          return new Response(msg || "tts failed", { status: upstream.status });
        }
        return new Response(upstream.body, {
          status: 200,
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});