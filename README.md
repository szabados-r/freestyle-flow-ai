# Cypher — AI Freestyle Trainer

Trade bars with an AI freestyle opponent. Real-time scoring on rhyme, flow, and
whether you stayed on beat. Built for the mic on your phone.

## Modes

- **Practice Cypher** — endless single-bar trading, warm up the flow.
- **Battle Mode** — 8 bars, AI judges every round, closing verdict in your opponent's voice.
- **Versus (1v1)** — pass-and-play with a friend on one phone; the host artist judges every bar.

## Styles

English:
- **The 6 God** — moody Toronto melodic flows.
- **Pluto** — Atlanta auto-tune trap.
- **The Queen** — switching voices, technical NY-Trinidad bars.
- **Slime** — ATL melodic experimentalist.

Magyar:
- **Magyar MC** — általános magyar freestyle.
- **Beton** — nyers magyar drill, sötét utcai energia.
- **Azarja** — dallamos magyar pop-rap, érzelmes flow.

Hungarian styles auto-detect magyar speech from the mic and judge bars using
magyar rím- és prozódia-szabályok.

## Stack

- **TanStack Start v1** (React 19, Vite 7, file-based routing)
- **Tailwind CSS v4** via `src/styles.css`
- **Framer Motion** + **shadcn/ui**
- **Lovable AI Gateway** (Gemini 3 Flash) for bars, scoring, verdicts (`createServerFn`)
- **ElevenLabs** — Scribe (speech-to-text) + TTS for opponent voices

## Local development

```bash
bun install
cp .env.example .env.local   # then fill in your own keys
bun run dev
```

Open http://localhost:8080.

### Required env vars (server-only)

These are read from the server runtime (`process.env`) and are **never
committed** to git. If you cloned this repo from GitHub, you'll need to add
your own:

- `LOVABLE_API_KEY` — Lovable AI Gateway key (https://lovable.dev)
- `ELEVENLABS_API_KEY` — ElevenLabs account key (https://elevenlabs.io/app/settings/api-keys)

Put them in `.env.local` (gitignored via `*.local`) for local dev, or set
them as runtime secrets in your hosting environment.

If ElevenLabs returns `{"detail":{"status":"detected_unusual_activity",...}}`,
the free tier was blocked — upgrade to Creator at
https://elevenlabs.io/app/subscription/api.

## Project layout

```
src/
  routes/                file-based routes (index, practice, battle, versus)
    api/                 server routes (scribe-token, tts)
  components/freestyle/  CypherEngine, VersusEngine, MicRecorder, ...
  lib/
    styles.ts            artist style + voice config
    freestyle.functions.ts  generateBar, scoreBar, battleVerdict, versusVerdict
    elevenlabs.server.ts ElevenLabs server helpers
```

## Deploy

Ships via Lovable on a Cloudflare Workers edge runtime. If self-hosting, target
an edge runtime with `nodejs_compat` and set the env vars above.

## Notes

Style names are creative homages. The model only writes original bars — no
quoted lyrics, no real-person disses.
