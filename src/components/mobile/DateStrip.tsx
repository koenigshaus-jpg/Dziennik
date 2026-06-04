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
  /** Counter — gdy się zmieni, strip scrolla się do `scrollToTarget`.
   *  Mechanizm trigger pattern: increment by parent na klik "Dziś". */
  scrollTrigger?: number;
  /** Dzień do scrolla gdy scrollTrigger się zmienia. */
  scrollTarget?: string;
  /** "smooth" = płynna animacja (np. klik "Dziś"), "auto" = instant
   *  (np. initial mount po powrocie z edycji). Default "smooth". */
  scrollBehavior?: "smooth" | "auto";
  /** Wywoływane gdy użytkownik dochodzi do lewej krawędzi (przeszłość). */
  onExtendBack?: () => void;
  /** Wywoływane gdy użytkownik dochodzi do prawej krawędzi (przyszłość). */
  onExtendAhead?: () => void;
}

const ROMAN_MONTHS = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
];

type Item =
  | { kind: "day"; date: Date; iso: string }
  | { kind: "month"; key: string; year: number; monthIndex: number };

const EDGE_THRESHOLD_PX = 240;

export function DateStrip({
  selectedDay,
  onSelectDay,
  entryCountsByDay,
  windowStart,
  windowEnd,
  scrollTrigger = 0,
  scrollTarget,
  scrollBehavior = "smooth",
  onExtendBack,
  onExtendAhead,
}: Props) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const today = React.useMemo(() => new Date(), []);

  // Buduj listę itemów: dla każdego dnia, jeśli zaczyna nowy miesiąc
  // (różny od poprzedniego dnia w oknie), wstaw marker miesiąca przed nim.
  const items = React.useMemo<Item[]>(() => {
    const out: Item[] = [];
    const start = new Date(windowStart);
    const end = new Date(windowEnd);
    let prevMonth = -1;
    let prevYear = -1;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const m = d.getMonth();
      const y = d.getFullYear();
      if (m !== prevMonth || y !== prevYear) {
        out.push({
          kind: "month",
          key: `m-${y}-${m}`,
          year: y,
          monthIndex: m,
        });
        prevMonth = m;
        prevYear = y;
      }
      out.push({ kind: "day", date: new Date(d), iso: toIsoLocalDate(d) });
    }
    return out;
  }, [windowStart, windowEnd]);

  // Trigger scroll do targetu — strzela tylko gdy parent inkrementuje
  // scrollTrigger (klik "Dziś"). Próbujemy 3 razy żeby trafić w aktualne
  // okno (race z auto-expand po fetchu).
  React.useEffect(() => {
    if (scrollTrigger === 0 || !scrollTarget) return;
    const scrollOnce = () => {
      const el = itemRefs.current.get(scrollTarget);
      const scroller = scrollerRef.current;
      if (!el || !scroller || scroller.clientWidth === 0) return;
      const target = Math.max(
        0,
        el.offsetLeft - scroller.clientWidth / 2 + el.clientWidth / 2
      );
      scroller.scrollTo({ left: target, behavior: scrollBehavior });
    };
    const timers = [
      window.setTimeout(scrollOnce, 0),
      window.setTimeout(scrollOnce, 200),
      window.setTimeout(scrollOnce, 600),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [scrollTrigger, scrollTarget, scrollBehavior]);

  // Infinite scroll — gdy zbliżamy się do krawędzi, prosimy parent o
  // rozszerzenie okna. Przy rozszerzeniu w lewo zachowujemy widoczną pozycję
  // kompensując scrollLeft o przyrost scrollWidth.
  const prevScrollWidthRef = React.useRef<number | null>(null);
  const pendingBackRef = React.useRef(false);

  const handleScroll = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const { scrollLeft, scrollWidth, clientWidth } = scroller;
    if (scrollLeft < EDGE_THRESHOLD_PX && onExtendBack) {
      // Zapamiętaj szerokość przed rozszerzeniem.
      prevScrollWidthRef.current = scrollWidth;
      pendingBackRef.current = true;
      onExtendBack();
    } else if (
      scrollWidth - scrollLeft - clientWidth < EDGE_THRESHOLD_PX &&
      onExtendAhead
    ) {
      onExtendAhead();
    }
  }, [onExtendBack, onExtendAhead]);

  // Po rozszerzeniu okna do tyłu — koryguj scrollLeft żeby widok stał w
  // miejscu (nowe pigułki dodały się po lewej).
  React.useLayoutEffect(() => {
    if (!pendingBackRef.current) return;
    const scroller = scrollerRef.current;
    const prev = prevScrollWidthRef.current;
    if (scroller && prev != null) {
      const delta = scroller.scrollWidth - prev;
      if (delta > 0) {
        scroller.scrollLeft += delta;
      }
    }
    pendingBackRef.current = false;
    prevScrollWidthRef.current = null;
  }, [items]);

  return (
    <div
      ref={scrollerRef}
      onScroll={handleScroll}
      className="lg:hidden sticky top-14 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border overflow-x-auto no-scrollbar"
    >
      <div className="flex gap-2 px-3 py-2 min-w-max">
        {items.map((it) => {
          if (it.kind === "month") {
            return (
              <div
                key={it.key}
                className="shrink-0 flex flex-col items-center justify-center gap-0.5 w-14 h-16 select-none"
                aria-hidden="true"
              >
                <span className="text-[10px] tracking-wider text-muted tabular-nums">
                  {it.year}
                </span>
                <span className="text-lg font-semibold leading-none text-foreground/80">
                  {ROMAN_MONTHS[it.monthIndex]}
                </span>
              </div>
            );
          }
          const d = it.date;
          const iso = it.iso;
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
