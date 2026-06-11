import { motion } from "framer-motion";

export interface ScoreData {
  rhyme: number;
  flow: number;
  onBeat: number;
  styleFit: number;
  overall: number;
  endWord: string;
  feedback: string;
}

function Bar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: accent }}
        />
      </div>
    </div>
  );
}

export function ScoreCard({ score, accent }: { score: ScoreData; accent: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-lg border-2 border-primary/40 bg-card p-5"
      style={{ boxShadow: `0 0 32px -8px ${accent}` }}
    >
      <div className="flex items-baseline justify-between">
        <div className="display text-xs uppercase tracking-widest text-muted-foreground">
          Round score
        </div>
        <div className="display text-5xl" style={{ color: accent }}>
          {Math.round(score.overall)}
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <Bar label="Rhyme" value={score.rhyme} accent={accent} />
        <Bar label="Flow" value={score.flow} accent={accent} />
        <Bar label="On beat" value={score.onBeat} accent={accent} />
        <Bar label="Style fit" value={score.styleFit} accent={accent} />
      </div>
      <div className="mt-4 rounded bg-muted/40 p-3 text-sm italic text-muted-foreground">
        "{score.feedback}"
      </div>
      {score.endWord && (
        <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
          Landed on: <span className="text-foreground">{score.endWord}</span>
        </div>
      )}
    </motion.div>
  );
}