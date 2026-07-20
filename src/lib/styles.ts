export type StyleId = "drake" | "nicki" | "hofi";

export interface ArtistStyle {
  id: StyleId;
  name: string;
  blurb: string;
  vibe: string;
  cadence: string;
  adlibs: string[];
  voiceId: string; // ElevenLabs voice
  accent: string; // hex / css color
  language: "en" | "hu";
  languageLabel: string;
}

export const STYLES: Record<StyleId, ArtistStyle> = {
  drake: {
    id: "drake",
    name: "The 6 God",
    blurb: "Moody Toronto melodic flows, introspective brags.",
    vibe: "melodic, half-sung, reflective, late-night; themes of loyalty vs. betrayal, come-up nostalgia, love-life regret, and quiet-flex wealth talk",
    cadence: "smooth triplets, occasional sing-rap, end words held and stretched, conversational pocket delivery",
    adlibs: ["yeah", "you know", "girl"],
    voiceId: "P3TGjm2n0VMOjnMS0QR5", // custom Drake clone
    accent: "#c9a37a",
    language: "en",
    languageLabel: "English",
  },
  nicki: {
    id: "nicki",
    name: "The Queen",
    blurb: "Switching voices, technical NY-Trinidad bars.",
    vibe: "playful, switching voices, fierce wordplay",
    cadence: "fast double-time, character voices, hard punchlines",
    adlibs: ["okurr", "yass", "uh"],
    voiceId: "Xb7hH8MSUJpSbSDYk0k2", // Alice
    accent: "#c96f4a",
    language: "en",
    languageLabel: "English",
  },
  hofi: {
    id: "hofi",
    name: "Beton Hofi",
    blurb: "Nyers magyar drill — sötét, kemény, utcai.",
    vibe: "magyar drill, sötét hangulat, nyers utcai energia, hideg flex",
    cadence: "lassú drill kadencia, súlyos végrímek, szaggatott flow",
    adlibs: ["yo", "beton", "ah"],
    voiceId: "r2ej5ZQWgnB9OsNnW1ey", // custom Beton Hofi clone
    accent: "#8a8060",
    language: "hu",
    languageLabel: "Magyar",
  },
};

export const STYLE_LIST = Object.values(STYLES);

// Tempo is fixed app-wide, independent of difficulty level.
export const DEFAULT_BPM = 95;

export type LevelId = "easy" | "medium" | "hard";

export interface Level {
  id: LevelId;
  label: string;
  syllables: string;
  complexity: string;
  blurb: string;
}

// Difficulty controls word/rhyme complexity only — tempo is fixed (see DEFAULT_BPM).
export const LEVELS: Record<LevelId, Level> = {
  easy: {
    id: "easy",
    label: "Easy",
    syllables: "6-8 syllables",
    complexity: "simple, common words. single-syllable end rhymes.",
    blurb: "Short bars, easy rhymes.",
  },
  medium: {
    id: "medium",
    label: "Medium",
    syllables: "8-12 syllables",
    complexity: "everyday vocabulary, occasional internal rhyme.",
    blurb: "Mid-length bars.",
  },
  hard: {
    id: "hard",
    label: "Hard",
    syllables: "12-16 syllables",
    complexity: "advanced vocabulary, multisyllabic rhymes, dense wordplay.",
    blurb: "Long dense bars, complex rhymes.",
  },
};

export type TopicId = "freestyle" | "pop" | "sports" | "music" | "whatever";

export interface Topic {
  id: TopicId;
  label: string;
  blurb: string;
  prompt: string;
}

export const TOPICS: Record<TopicId, Topic> = {
  freestyle: {
    id: "freestyle",
    label: "Freestyle",
    blurb: "Anything goes — brags, flexes, wordplay.",
    prompt: "any topic — classic freestyle brags, flexes, wordplay.",
  },
  pop: {
    id: "pop",
    label: "Pop Culture",
    blurb: "Celebs, movies, memes, trends.",
    prompt: "pop culture — reference celebrities, movies, TV shows, memes, internet trends.",
  },
  sports: {
    id: "sports",
    label: "Sports",
    blurb: "Hoops, soccer, athletes, trophies.",
    prompt: "sports — reference basketball, soccer, football, athletes, championships, sneakers.",
  },
  music: {
    id: "music",
    label: "Music",
    blurb: "Beats, studios, rappers, charts.",
    prompt: "music industry — reference beats, studios, producers, rappers, charts, tours, vinyl.",
  },
  whatever: {
    id: "whatever",
    label: "Whatever",
    blurb: "No theme — let the AI go wherever it wants.",
    prompt: "no fixed topic — drift between subjects, get weird, follow whatever the previous bar suggests.",
  },
};