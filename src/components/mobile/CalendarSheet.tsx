"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  formatMonthYearPL,
  isSameLocalDay,
  parseIsoLocalDate,
  toIsoLocalDate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  entryCountsByDay: Map<string, number>;
}

const WEEKDAY_HEADERS = ["pn", "wt", "śr", "czw", "pt", "sob", "ndz"];

// Ile miesięcy renderujemy w obie strony od dzisiaj.
const MONTHS_BACK = 36;
const MONTHS_FORWARD = 12;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

interface MonthCell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

function buildMonthCells(viewMonth: Date): MonthCell[] {
  const first = startOfMonth(viewMonth);
  const last = endOfMonth(viewMonth);
  // ISO Monday-first: getDay() returns 0=Sunday
  const dow = first.getDay();
  const leadingEmpty = (dow + 6) % 7; // ile pustych slotów przed dniem 1
  const cells: MonthCell[] = [];
  // Padding na początku jako "puste" sloty (poprzedni miesiąc, niewidoczne)
  for (let i = 0; i < leadingEmpty; i++) {
    cells.push({ date: new Date(0), iso: `pad-${i}`, inMonth: false });
  }
  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
    cells.push({ date: d, iso: toIsoLocalDate(d), inMonth: true });
  }
  return cells;
}

export function CalendarSheet({
  open,
  onOpenChange,
  selectedDay,
  onSelectDay,
  entryCountsByDay,
}: Props) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const monthRefs = React.useRef<Map<string, HTMLElement>>(new Map());

  const today = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(() => toIsoLocalDate(today), [today]);
  const selected = parseIsoLocalDate(selectedDay);

  // Lista miesięcy do wyrenderowania — od dziś -MONTHS_BACK do dziś +MONTHS_FORWARD.
  const months = React.useMemo(() => {
    const arr: Date[] = [];
    const base = startOfMonth(today);
    for (let i = -MONTHS_BACK; i <= MONTHS_FORWARD; i++) {
      arr.push(new Date(base.getFullYear(), base.getMonth() + i, 1));
    }
    return arr;
  }, [today]);

  // Po otwarciu kalendarza: scroll do miesiąca wybranego dnia (bez animacji).
  React.useLayoutEffect(() => {
    if (!open) return;
    const target = selected ?? today;
    const key = monthKey(startOfMonth(target));
    // Czekamy frame, żeby DOM zdążył się zmontować po animacji wjazdu
    const raf = requestAnimationFrame(() => {
      const el = monthRefs.current.get(key);
      if (el && scrollRef.current) {
        // offsetTop względem kontenera scrollującego
        const containerTop = scrollRef.current.getBoundingClientRect().top;
        const elTop = el.getBoundingClientRect().top;
        scrollRef.current.scrollTop += elTop - containerTop;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [open, selected, today]);

  function scrollToToday() {
    const key = monthKey(startOfMonth(today));
    const el = monthRefs.current.get(key);
    if (!el || !scrollRef.current) return;
    const containerTop = scrollRef.current.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollTop + elTop - containerTop,
      behavior: "smooth",
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-2xl",
            "bg-background border-t border-border shadow-2xl",
            "flex flex-col pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
          )}
        >
          {/* Header z X */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-base font-semibold">
              Kalendarz
            </DialogPrimitive.Title>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={scrollToToday}
                className="inline-flex h-9 items-center justify-center px-3 rounded-full text-sm font-medium hover:bg-foreground/5"
              >
                Dziś
              </button>
              <DialogPrimitive.Close
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
                aria-label="Zamknij kalendarz"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Wybór daty dla nawigacji po wpisach
          </DialogPrimitive.Description>

          {/* Sticky pasek dni tygodnia */}
          <div className="px-3 pt-2 pb-2 border-b border-border/60 shrink-0 bg-background">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted">
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          </div>

          {/* Scrollowane miesiące */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-3 pb-4 overscroll-contain"
          >
            {months.map((m) => {
              const key = monthKey(m);
              const cells = buildMonthCells(m);
              const isThisMonth =
                m.getMonth() === today.getMonth() &&
                m.getFullYear() === today.getFullYear();
              return (
                <section
                  key={key}
                  ref={(el) => {
                    if (el) monthRefs.current.set(key, el);
                    else monthRefs.current.delete(key);
                  }}
                  className="pt-5 first:pt-3"
                >
                  <h3
                    className={cn(
                      "px-1 mb-2 text-base font-semibold capitalize",
                      isThisMonth && "text-foreground",
                      !isThisMonth && "text-foreground/85"
                    )}
                  >
                    {formatMonthYearPL(m)}
                  </h3>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((c) => {
                      if (!c.inMonth) {
                        return <div key={c.iso} aria-hidden />;
                      }
                      const isToday = c.iso === todayIso;
                      const isSelected = selected
                        ? isSameLocalDay(c.date, selected)
                        : false;
                      const count = entryCountsByDay.get(c.iso) ?? 0;
                      return (
                        <button
                          key={c.iso}
                          type="button"
                          onClick={() => {
                            onSelectDay(c.iso);
                            onOpenChange(false);
                          }}
                          className={cn(
                            "relative aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 text-sm tabular-nums transition-colors",
                            !isSelected && "hover:bg-foreground/5",
                            isSelected &&
                              "bg-foreground text-background font-semibold",
                            !isSelected &&
                              isToday &&
                              "ring-1 ring-foreground/40"
                          )}
                          aria-label={
                            count > 0
                              ? `${c.date.getDate()}, ${count} wpisów`
                              : `${c.date.getDate()}`
                          }
                        >
                          <span className="leading-none">
                            {c.date.getDate()}
                          </span>
                          {count > 0 && (
                            <span
                              className={cn(
                                "absolute bottom-1 inline-block h-1 w-1 rounded-full",
                                isSelected
                                  ? "bg-background/80"
                                  : "bg-foreground/70"
                              )}
                              aria-hidden
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
