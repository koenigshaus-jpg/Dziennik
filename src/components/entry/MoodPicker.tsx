"use client";

import { MOODS } from "@/lib/moods";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (moods: string[]) => void;
}

export function MoodPicker({ value, onChange }: Props) {
  function toggle(key: string) {
    if (value.includes(key)) {
      onChange(value.filter((m) => m !== key));
    } else {
      onChange([...value, key]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {MOODS.map((m) => {
        const active = value.includes(m.key);
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => toggle(m.key)}
            className={cn(
              "h-11 px-3 rounded-full border text-sm flex items-center gap-2 transition-colors",
              active
                ? "bg-foreground text-background border-foreground"
                : "border-border hover:border-foreground/40"
            )}
            aria-pressed={active}
          >
            <span className="text-base">{m.emoji}</span>
            <span>{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}
