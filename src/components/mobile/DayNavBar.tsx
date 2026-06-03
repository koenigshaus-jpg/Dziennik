"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, isSameLocalDay, parseIsoLocalDate, toIsoLocalDate } from "@/lib/dates";

interface Props {
  selectedDay: string;
  onSelectDay: (iso: string) => void;
}

export function DayNavBar({ selectedDay, onSelectDay }: Props) {
  const today = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(() => toIsoLocalDate(today), [today]);
  const selectedDate = React.useMemo(
    () => parseIsoLocalDate(selectedDay) ?? today,
    [selectedDay, today]
  );
  const isToday = isSameLocalDay(selectedDate, today);

  const goPrev = () => onSelectDay(toIsoLocalDate(addDays(selectedDate, -1)));
  const goNext = () => onSelectDay(toIsoLocalDate(addDays(selectedDate, 1)));
  const goToday = () => onSelectDay(todayIso);

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <button
        type="button"
        onClick={goPrev}
        aria-label="Poprzedni dzień"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted hover:text-foreground hover:bg-foreground/5 transition-colors shadow-[var(--elevation-1)]"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex-1 flex items-center justify-center">
        {!isToday && (
          <button
            type="button"
            onClick={goToday}
            className="inline-flex h-9 items-center justify-center px-4 rounded-full bg-foreground text-background text-xs font-semibold tracking-wide uppercase hover:bg-foreground/90 transition-colors shadow-[var(--elevation-2)]"
            aria-label="Wróć do dzisiaj"
          >
            Dziś
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={goNext}
        aria-label="Następny dzień"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-muted hover:text-foreground hover:bg-foreground/5 transition-colors shadow-[var(--elevation-1)]"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
