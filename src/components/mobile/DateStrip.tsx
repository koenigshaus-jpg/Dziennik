"use client";

import * as React from "react";
import { addDays, formatDayShortPL, isSameLocalDay, toIsoLocalDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Props {
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  entryCountsByDay: Map<string, number>;
  windowStart: Date;
  windowEnd: Date;
}

export function DateStrip({
  selectedDay,
  onSelectDay,
  entryCountsByDay,
  windowStart,
  windowEnd,
}: Props) {
  const today = React.useMemo(() => new Date(), []);

  const days = React.useMemo(() => {
    const out: Date[] = [];
    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      out.push(new Date(d));
    }
    return out;
  }, [windowStart, windowEnd]);

  return (
    <div className="lg:hidden sticky top-12 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border overflow-x-auto no-scrollbar">
      <div className="flex gap-2 px-3 py-2 min-w-max">
        {days.map((d) => {
          const iso = toIsoLocalDate(d);
          const isSelected = iso === selectedDay;
          const isToday = isSameLocalDay(d, today);
          const count = entryCountsByDay.get(iso) ?? 0;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={cn(
                "relative shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 h-16 rounded-xl border transition-colors",
                isSelected
                  ? "bg-foreground text-background border-foreground"
                  : "border-border hover:bg-foreground/5",
                !isSelected && isToday && "ring-1 ring-foreground/40"
              )}
              aria-pressed={isSelected}
              aria-label={`${formatDayShortPL(d)} ${d.getDate()}`}
            >
              <span
                className={cn(
                  "text-[10px] uppercase tracking-wider",
                  isSelected ? "text-background/80" : "text-muted"
                )}
              >
                {formatDayShortPL(d)}
              </span>
              <span className="text-lg font-semibold tabular-nums leading-none">
                {d.getDate()}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-medium tabular-nums",
                    isSelected
                      ? "bg-background text-foreground"
                      : "bg-foreground text-background"
                  )}
                  aria-label={`${count} wpisów`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
