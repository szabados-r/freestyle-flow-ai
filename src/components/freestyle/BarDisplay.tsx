import { motion } from "framer-motion";
import { useState } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { rhymesFor } from "@/lib/freestyle.functions";

export function BarDisplay({
  bar,
  endWord,
  speaker,
  accent,
  language,
}: {
  bar: string;
  endWord?: string;
  speaker: "AI" | "YOU";
  accent: string;
  language?: "en" | "hu";
}) {
  const trimmed = bar.trim();
  const lower = trimmed.toLowerCase();
  const ew = (endWord ?? "").trim().toLowerCase();
  const idx = ew ? lower.lastIndexOf(ew) : -1;
  const before = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
  const word = idx >= 0 ? trimmed.slice(idx, idx + ew.length) : "";
  const after = idx >= 0 ? trimmed.slice(idx + ew.length) : "";

  const [rhymes, setRhymes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const showSheet = speaker === "AI" && !!endWord;

  const loadRhymes = async () => {
    if (rhymes || loading || !endWord) return;
    setLoading(true);
    try {
      const r = await rhymesFor({ data: { word: endWord, language } });
      setRhymes(r.rhymes);
    } catch {
      setRhymes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="display text-xs uppercase tracking-widest text-muted-foreground">
          {speaker === "AI" ? "AI BAR" : "YOUR BAR"}
        </div>
        {showSheet && (
          <div className="group relative">
            <button
              type="button"
              onMouseEnter={loadRhymes}
              onFocus={loadRhymes}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background/40 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
              style={{ borderColor: `${accent}55` }}
            >
              <BookOpen className="h-3 w-3" />
              Cheat sheet
            </button>
            <div
              className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 origin-top-right scale-95 rounded-md border border-border bg-card p-3 opacity-0 shadow-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:scale-100 group-focus-within:opacity-100"
              style={{ borderColor: `${accent}66` }}
            >
              <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Rhymes with{" "}
                <span style={{ color: accent }}>{endWord}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {loading && !rhymes && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
                {rhymes && rhymes.length === 0 && !loading && (
                  <span className="text-xs text-muted-foreground">No rhymes found.</span>
                )}
                {rhymes?.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px]"
                    style={{ color: accent, borderColor: `${accent}44` }}
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="display mt-2 text-2xl leading-tight md:text-3xl">
        {before}
        {word && (
          <span style={{ color: accent, textShadow: `0 0 18px ${accent}` }}>{word}</span>
        )}
        {after}
      </div>
    </motion.div>
  );
}