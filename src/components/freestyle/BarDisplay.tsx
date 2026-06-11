import { motion } from "framer-motion";

export function BarDisplay({
  bar,
  endWord,
  speaker,
  accent,
}: {
  bar: string;
  endWord?: string;
  speaker: "AI" | "YOU";
  accent: string;
}) {
  const trimmed = bar.trim();
  const lower = trimmed.toLowerCase();
  const ew = (endWord ?? "").trim().toLowerCase();
  const idx = ew ? lower.lastIndexOf(ew) : -1;
  const before = idx >= 0 ? trimmed.slice(0, idx) : trimmed;
  const word = idx >= 0 ? trimmed.slice(idx, idx + ew.length) : "";
  const after = idx >= 0 ? trimmed.slice(idx + ew.length) : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-5"
    >
      <div className="display text-xs uppercase tracking-widest text-muted-foreground">
        {speaker === "AI" ? "AI BAR" : "YOUR BAR"}
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