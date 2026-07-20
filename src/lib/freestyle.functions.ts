import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

import { LEVELS, STYLES, TOPICS, type StyleId } from "./styles";

const BarSchema = z.object({
  bar: z.string().describe("A single 4-beat rap bar, 8-14 syllables, ending on a clear rhyme word."),
  endWord: z.string().describe("The final rhyming word of the bar"),
});

const ScoreSchema = z.object({
  rhyme: z.number().min(0).max(10),
  flow: z.number().min(0).max(10),
  onBeat: z.number().min(0).max(10),
  styleFit: z.number().min(0).max(10),
  overall: z.number().min(0).max(100),
  endWord: z.string(),
  feedback: z.string().describe("One short punch-up line, 1 sentence."),
});

function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

const styleIdSchema = z.enum(["drake", "nicki", "hofi"]);
const languageSchema = z.enum(["en", "hu"]).optional();
const levelSchema = z.enum(["easy", "medium", "hard"]).optional();
const topicSchema = z
  .enum(["freestyle", "pop", "sports", "music", "whatever"])
  .optional();

export const generateBar = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      styleId: styleIdSchema,
      previousUserBar: z.string().optional(),
      previousEndWord: z.string().optional(),
      roundIndex: z.number().int().min(0).default(0),
      language: languageSchema,
      level: levelSchema,
      topic: topicSchema,
    }),
  )
  .handler(async ({ data }) => {
    const style = STYLES[data.styleId as StyleId];
    const gateway = getGateway();
    const lang = data.language ?? style.language;
    const level = data.level ? LEVELS[data.level] : LEVELS.easy;
    const topic = data.topic ? TOPICS[data.topic] : TOPICS.freestyle;

    const langRule =
      lang === "hu"
        ? `LANGUAGE: Write the bar in HUNGARIAN (magyar nyelven). Use natural Hungarian slang, no English words except common loanwords. Rhyme using Hungarian word endings.`
        : `LANGUAGE: Write the bar in English.`;

    const system = `You are a freestyle rap battle opponent channeling the energy of ${style.name} (${style.vibe}). Cadence: ${style.cadence}. Occasionally use adlibs like ${style.adlibs.join(", ")}.

${langRule}

DIFFICULTY (${level.label}): Aim for ${level.syllables}. ${level.complexity}
TOPIC: Focus the bar on ${topic.prompt}

RULES:
- Output ONE bar only (4 beats, ${level.syllables}).
- End on a strong, clearly-rhymable word (the "endWord").
- Stay clean of slurs and real-person disses. Brag, flex, wordplay, punchlines.
- Do NOT quote copyrighted lyrics. Original lines only.
- No quotation marks. No emojis.`;

    const prompt = data.previousUserBar
      ? `The user just rapped: "${data.previousUserBar}" (ended on "${data.previousEndWord ?? ""}"). Hit back with one bar that responds and one-ups them. This is round ${data.roundIndex + 1}.`
      : `Open the cypher. Drop your first bar to set the tone. Round ${data.roundIndex + 1}.`;

    return await generateBarWithFallback(gateway, system, prompt);
  });

async function generateBarWithFallback(
  gateway: ReturnType<typeof getGateway>,
  system: string,
  prompt: string,
): Promise<{ bar: string; endWord: string }> {
  // Try structured output first.
  try {
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
      experimental_output: Output.object({ schema: BarSchema }),
    });
    if (experimental_output?.bar) return experimental_output;
  } catch {
    // fall through to text fallback
  }

  // Fallback: ask for JSON in plain text and parse defensively.
  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: `${system}\n\nReturn ONLY raw JSON of shape {"bar": string, "endWord": string}. No prose, no code fences.`,
    prompt,
  });
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      if (parsed?.bar) {
        return {
          bar: String(parsed.bar),
          endWord: String(parsed.endWord ?? String(parsed.bar).trim().split(/\s+/).pop() ?? ""),
        };
      }
    } catch {
      // fall through
    }
  }
  // Last resort: treat the whole text as the bar.
  const bar = cleaned.split("\n").find((l) => l.trim().length > 0) ?? cleaned;
  const endWord = bar.trim().replace(/[.,!?"']+$/g, "").split(/\s+/).pop() ?? "";
  return { bar: bar.trim(), endWord };
}

export const scoreBar = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      styleId: styleIdSchema,
      aiBar: z.string(),
      aiEndWord: z.string(),
      userBar: z.string(),
      bpm: z.number(),
      durationMs: z.number().optional(),
      language: languageSchema,
    }),
  )
  .handler(async ({ data }) => {
    const style = STYLES[data.styleId as StyleId];
    const gateway = getGateway();

    const expectedBarMs = (60_000 / data.bpm) * 4;
    const timingNote = data.durationMs
      ? `User took ${Math.round(data.durationMs)}ms; a clean 4-beat bar at ${data.bpm} BPM is ~${Math.round(expectedBarMs)}ms.`
      : "No precise timing available; judge from text rhythm.";

    const lang = data.language ?? style.language;
    const langNote =
      lang === "hu"
        ? `Both bars should be in Hungarian. Judge Hungarian rhyme and flow naturally.`
        : `Both bars should be in English.`;

    const system = `You are a strict but fun hip-hop freestyle judge. Score the USER's bar against the AI's bar, in the style of ${style.name} (${style.vibe}). ${langNote}

Score each 0-10:
- rhyme: how well the user's end-word and internal rhymes echo the AI's end-word "${data.aiEndWord}".
- flow: syllable count match (target ${expectedBarMs.toFixed(0)}ms / ~10 syllables), even cadence.
- onBeat: ${timingNote} Penalize if way too short or rambling.
- styleFit: matches ${style.name}'s vibe & cadence.
- overall: 0-100 holistic.
- endWord: the user's last meaningful word.
- feedback: ONE short hype-or-roast line (under 15 words).

Be honest; a weak bar should score low. A great bar should score high. Avg should be ~60-75 for casual users.`;

    const prompt = `AI bar: "${data.aiBar}"
User bar: "${data.userBar}"

Score it.`;

    return await scoreBarWithFallback(gateway, system, prompt);
  });

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
}

async function scoreBarWithFallback(
  gateway: ReturnType<typeof getGateway>,
  system: string,
  prompt: string,
): Promise<z.infer<typeof ScoreSchema>> {
  try {
    const { experimental_output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt,
      experimental_output: Output.object({ schema: ScoreSchema }),
    });
    if (experimental_output) return experimental_output;
  } catch {
    // fall through
  }

  const { text } = await generateText({
    model: gateway("google/gemini-3-flash-preview"),
    system: `${system}\n\nReturn ONLY raw JSON: {"rhyme":0-10,"flow":0-10,"onBeat":0-10,"styleFit":0-10,"overall":0-100,"endWord":string,"feedback":string}. No prose, no code fences.`,
    prompt,
  });
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  let parsed: Record<string, unknown> = {};
  if (start !== -1 && end !== -1) {
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      // ignore
    }
  }
  return {
    rhyme: clamp(parsed.rhyme, 0, 10, 6),
    flow: clamp(parsed.flow, 0, 10, 6),
    onBeat: clamp(parsed.onBeat, 0, 10, 6),
    styleFit: clamp(parsed.styleFit, 0, 10, 6),
    overall: clamp(parsed.overall, 0, 100, 65),
    endWord: String(parsed.endWord ?? ""),
    feedback: String(parsed.feedback ?? "Solid bar — keep it pushing."),
  };
}

export const battleVerdict = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      styleId: styleIdSchema,
      userTotal: z.number(),
      aiTotal: z.number(),
      rounds: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const style = STYLES[data.styleId as StyleId];
    const gateway = getGateway();

    const winner =
      data.userTotal > data.aiTotal ? "user" : data.userTotal < data.aiTotal ? "ai" : "draw";

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are ${style.name}. After an ${data.rounds}-round battle, deliver a 2-3 sentence closing verdict in your vibe (${style.vibe}). Be playful, not vulgar. No real-person disses.`,
      prompt: `Final score — You (AI): ${data.aiTotal}, Challenger: ${data.userTotal}. Winner: ${winner}. Drop the closing words.`,
    });

    return { winner, recap: text };
  });

export const versusVerdict = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      styleId: styleIdSchema,
      p1Name: z.string(),
      p2Name: z.string(),
      p1Total: z.number(),
      p2Total: z.number(),
      rounds: z.number(),
    }),
  )
  .handler(async ({ data }) => {
    const style = STYLES[data.styleId as StyleId];
    const gateway = getGateway();

    const winner =
      data.p1Total > data.p2Total ? data.p1Name : data.p2Total > data.p1Total ? data.p2Name : "draw";

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: `You are ${style.name}, hosting a ${data.rounds}-round freestyle battle between two challengers. Deliver a 2-3 sentence closing verdict in your vibe (${style.vibe}). Be playful, hype the winner, roast the loser lightly. No real-person disses, no slurs.`,
      prompt: `Battle ended. ${data.p1Name}: ${Math.round(data.p1Total)} points. ${data.p2Name}: ${Math.round(data.p2Total)} points. Winner: ${winner}. Drop the closing words.`,
    });

    return { winner, recap: text };
  });