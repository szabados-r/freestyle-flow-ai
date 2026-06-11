import { STYLE_LIST, type StyleId } from "@/lib/styles";
import { cn } from "@/lib/utils";

export function StylePicker({
  value,
  onChange,
}: {
  value: StyleId;
  onChange: (id: StyleId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STYLE_LIST.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "group relative overflow-hidden rounded-lg border-2 p-4 text-left transition-all",
              active
                ? "border-primary bg-card shadow-[0_0_24px_-4px_var(--color-primary)]"
                : "border-border bg-card/40 hover:border-primary/60",
            )}
            style={active ? { boxShadow: `0 0 28px -6px ${s.accent}` } : undefined}
          >
            <div
              className="display text-2xl"
              style={{ color: active ? s.accent : undefined }}
            >
              {s.name}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.blurb}</div>
          </button>
        );
      })}
    </div>
  );
}