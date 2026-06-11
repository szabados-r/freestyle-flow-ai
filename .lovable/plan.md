
# Hip-Hop Freestyle Trainer — Build Plan

A single-page TanStack Start app. No accounts, no persistence — sessions are in-memory only. Bars are written by AI, spoken by a TTS voice over a beat, the user freestyles back into the mic, and an AI judge scores rhyme, flow, and style.

## 1. Core experience

**Home screen**
- App title + tagline
- Style picker (Drake, Future, Nicki Minaj, Young Thug — each with a vibe blurb)
- Tempo selector (slow 75 / mid 85 / fast 95 BPM)
- Two big mode buttons:
  - **Practice** — endless single-bar trading
  - **Battle Mode** — best-of 8 bars vs the AI, final verdict

**Practice round loop**
1. A simple loopable beat starts (one beat per BPM preset, bundled as a short mp3 in `src/assets/beats/`).
2. AI generates a 1-bar line in the selected style, ending on a clear rhyme word. The end-word is highlighted on screen.
3. TTS speaks the bar in time with the beat (4 beats).
4. A 4-beat countdown "YOUR TURN" appears; the mic opens.
5. User raps one bar; live partial transcript shows under a waveform indicator.
6. On silence (VAD) or "Done" tap, mic closes, transcript is finalized, and a score card slides in.
7. "Next bar" continues the cypher — AI picks up off the user's last word.

**Battle mode**
- 8 rounds, AI and user alternate bars (AI goes first).
- Each round scored individually; running totals shown.
- After round 8: full breakdown, a final "W / L / Draw" verdict, and a one-paragraph AI roast/hype recap in the chosen artist's voice.

## 2. Scoring

After each user bar, the server sends to Gemini: the AI's bar, the user's transcript, the bar's word timings (from STT), the BPM, and the chosen style. Gemini returns a structured score:

- **Rhyme** (0–10): does the user's end-word and internal rhymes echo the AI's end-word?
- **Flow / syllable timing** (0–10): syllable count close to AI's bar, even cadence (computed from STT word timestamps vs beat grid, then judged).
- **On-beat** (0–10): are stressed syllables landing near beats 1–4 (also derived from STT timestamps).
- **Style fit** (0–10): does it sound like the selected artist's vocabulary, ad-libs, cadence?
- **Overall** (0–100) + one-line punch-up suggestion + the rhyme word the user landed on.

Scores render as animated bars on the score card. No persistence — totals live in component state during the session.

## 3. Style presets

Each artist preset is a small server-side config: short style description, signature ad-libs, cadence notes, an ElevenLabs voice ID, and a few seed example bars used for in-context prompting (paraphrased, not copied lyrics). Names used as flavor only; no copyrighted lyric reproduction.

## 4. Tech approach

**Stack**: TanStack Start (already in project). No Lovable Cloud / database needed.

**AI services**
- **Lovable AI Gateway → `google/gemini-3-flash-preview`** for bar generation and scoring (server functions, structured `Output.object` schemas).
- **ElevenLabs TTS** (`/v1/text-to-speech/{voiceId}`) for the AI rapping — one voice per artist preset.
- **ElevenLabs Realtime STT** (`useScribe`, `scribe_v2_realtime`, VAD) for the live mic input with word timestamps.

Both ElevenLabs calls go through the standard ElevenLabs connector (server reads `ELEVENLABS_API_KEY`). Token mint endpoint for STT, audio-stream proxy endpoint for TTS — keys never reach the browser.

**Beat playback**: a bundled mp3 per BPM looped via `<audio loop>`. A small `useBeatClock` hook derives the beat grid (4 beats per bar) from `audio.currentTime` so on-beat scoring uses the same clock the user hears.

**No persistence**: session/battle state is plain React state. Refresh = new session.

## 5. Routes & files

```
src/routes/
  index.tsx                 -- home: style picker, BPM, mode buttons
  practice.tsx              -- endless practice loop
  battle.tsx                -- 8-bar battle
  api/
    tts.ts                  -- POST { text, voiceId } -> audio/mpeg stream
    scribe-token.ts         -- POST -> { token } for realtime STT
src/lib/
  freestyle.functions.ts    -- generateBar, scoreBar, battleVerdict (createServerFn + Gemini)
  ai-gateway.server.ts      -- Lovable AI Gateway provider helper
  elevenlabs.server.ts      -- ElevenLabs fetch helpers, API-key guard
  styles.ts                 -- artist presets (name, blurb, voiceId, cadence notes, seed bars)
  beat-clock.ts             -- useBeatClock hook
src/components/freestyle/
  StylePicker.tsx
  BeatPlayer.tsx
  BarDisplay.tsx            -- shows AI bar with highlighted end-word
  MicRecorder.tsx           -- ElevenLabs useScribe wrapper, waveform, VAD
  ScoreCard.tsx             -- animated 0-10 bars + overall
  BattleScoreboard.tsx
src/assets/beats/
  slow.mp3, mid.mp3, fast.mp3
```

## 6. Design direction

Bold, club-flyer energy: heavy display type (e.g. a condensed sans like Bebek/Anton), deep black + electric accent (magenta or acid green), subtle film-grain texture, big numeric scores, equalizer-style score bars, slight glitch on round transitions, framer-motion for the score reveal and "YOUR TURN" countdown.

## 7. Build order

1. Connect ElevenLabs (standard connector) and confirm `ELEVENLABS_API_KEY` is present.
2. Add beat mp3s (3 short loops) and `useBeatClock`.
3. `ai-gateway.server.ts` + `freestyle.functions.ts` with `generateBar` and `scoreBar` (Zod schemas, Gemini structured output).
4. `tts.ts` and `scribe-token.ts` API routes.
5. Home page + style/BPM picker.
6. Practice page: beat → AI bar → TTS → mic → score → next.
7. Battle page: 8-round loop + scoreboard + final verdict.
8. Polish: animations, error toasts for 429/402, empty/mic-denied states.

## 8. Out of scope (for this build)

- Saving sessions, leaderboards, sharing.
- Real beat library / beat upload.
- Multiplayer battles.
- Lyric reproduction of real songs — style fit only, never quoting copyrighted lyrics.

Sound good, or want to tweak modes, scoring, or the visual direction before I build?
