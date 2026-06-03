"use client";

import * as React from "react";
import { addDays, formatDayShortPL, isSameLocalDay, parseIsoLocalDate, toIsoLocalDate } from "@/lib/dates";
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
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
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

  // Centruje selected day. Smooth dla user-triggered, instant przy initial.
  const didInitialCenterRef = React.useRef(false);
  const selectedDayRef = React.useRef(selectedDay);
  React.useEffect(() => {
    selectedDayRef.current = selectedDay;
  }, [selectedDay]);

  // Stabilny callback — nie zależy od selectedDay (czyta z refa)
  const centerNow = React.useCallback((smooth: boolean) => {
    const day = selectedDayRef.current;
    const el = itemRefs.current.get(day);
    const scroller = scrollerRef.current;
    if (!el || !scroller || scroller.clientWidth === 0 || el.clientWidth === 0)
      return false;
    const target = Math.max(
      0,
      el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2
    );
    if (smooth) {
      scroller.scrollTo({ left: target, behavior: "smooth" });
    } else {
      scroller.scrollLeft = target;
    }
    return true;
  }, []);

  // Reakcja na zmianę selectedDay — single smooth scroll
  React.useLayoutEffect(() => {
    const smooth = didInitialCenterRef.current;
    if (centerNow(smooth)) {
      didInitialCenterRef.current = true;
    }
  }, [selectedDay, centerNow]);

  // Initial mount: ResizeObserver + fallback timeouty (uruchamiane RAZ,
  // bo deps puste — refs zapewniają dostęp do aktualnego selectedDay).
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => {
      if (centerNow(didInitialCenterRef.current)) {
        didInitialCenterRef.current = true;
      }
    });
    ro.observe(scroller);
    const timers = [
      window.setTimeout(() => centerNow(false), 200),
      window.setTimeout(() => centerNow(false), 600),
    ];
    return () => {
      ro.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [centerNow]);

  return (
    <div
      ref={scrollerRef}
      className="lg:hidden sticky top-12 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border overflow-x-auto no-scrollbar"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <div className="flex gap-2 px-3 py-2 min-w-max">
        {days.map((d) => {
          const iso = toIsoLocalDate(d);
          const isSelected = iso === selectedDay;
          const isToday = isSameLocalDay(d, today);
          const count = entryCountsByDay.get(iso) ?? 0;
          return (
            <button
              key={iso}
              ref={(el) => {
                if (el) itemRefs.current.set(iso, el);
                else itemRefs.current.delete(iso);
              }}
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

// Helper: pure-function for callers
export function buildWindow(today: Date, daysBack: number, daysAhead: number) {
  return {
    start: addDays(today, -daysBack),
    end: addDays(today, daysAhead),
  };
}

// Util: parse and clamp ISO to window — exported for /page.tsx usage
export function clampToWindow(
  iso: string | null,
  todayIso: string,
  windowStart: Date,
  windowEnd: Date
): string {
  if (!iso) return todayIso;
  const d = parseIsoLocalDate(iso);
  if (!d) return todayIso;
  if (d < windowStart || d > windowEnd) return todayIso;
  return iso;
}
