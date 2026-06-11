import { cn } from "@/lib/utils";

export function BeatIndicator({ beat, accent }: { beat: number; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3].map((i) => {
        const on = i === beat;
        return (
          <div
            key={i}
            className={cn(
              "h-3 w-8 rounded-full transition-all",
              on ? "scale-110" : "opacity-30",
            )}
            style={{ background: on ? accent : "var(--color-muted)" }}
          />
        );
      })}
    </div>
  );
}