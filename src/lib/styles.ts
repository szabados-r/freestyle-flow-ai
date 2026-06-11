export type StyleId = "drake" | "future" | "nicki" | "thug";

export interface ArtistStyle {
  id: StyleId;
  name: string;
  blurb: string;
  vibe: string;
  cadence: string;
  adlibs: string[];
  voiceId: string; // ElevenLabs voice
  accent: string; // hex / css color
}

export const STYLES: Record<StyleId, ArtistStyle> = {
  drake: {
    id: "drake",
    name: "The 6 God",
    blurb: "Moody Toronto melodic flows, introspective brags.",
    vibe: "melodic, half-sung, reflective, late-night",
    cadence: "smooth triplets, occasional sing-rap, end words held",
    adlibs: ["yeah", "you know", "girl"],
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian
    accent: "#f0abfc",
  },
  future: {
    id: "future",
    name: "Pluto",
    blurb: "Atlanta auto-tune trap, codeine cadence.",
    vibe: "auto-tune trap, slurred melodies, hard flexes",
    cadence: "syrupy triplets, mumble-rap, hard trap punches",
    adlibs: ["ay", "hold up", "pluto"],
    voiceId: "cjVigY5qzO86Huf0OWal", // Eric
    accent: "#a3e635",
  },
  nicki: {
    id: "nicki",
    name: "The Queen",
    blurb: "Switching voices, technical NY-Trinidad bars.",
    vibe: "playful, switching voices, fierce wordplay",
    cadence: "fast double-time, character voices, hard punchlines",
    adlibs: ["okurr", "yass", "uh"],
    voiceId: "Xb7hH8MSUJpSbSDYk0k2", // Alice
    accent: "#f472b6",
  },
  thug: {
    id: "thug",
    name: "Slime",
    blurb: "ATL melodic experimentalist, weird flexes.",
    vibe: "yelpy, weird melodic flows, slime adlibs",
    cadence: "unpredictable, falsetto runs, choppy delivery",
    adlibs: ["slime", "skrt", "yuh"],
    voiceId: "IKne3meq5aSn9XLyUdCD", // Charlie
    accent: "#22d3ee",
  },
};

export const STYLE_LIST = Object.values(STYLES);

export const BPM_OPTIONS = [
  { label: "Slow", bpm: 75 },
  { label: "Mid", bpm: 85 },
  { label: "Fast", bpm: 95 },
];