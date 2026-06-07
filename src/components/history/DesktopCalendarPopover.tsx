"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  formatMonthYearPL,
  isSameLocalDay,
  parseIsoLocalDate,
  toIsoLocalDate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { useConversationsMeta } from "@/lib/agent/use-conversations-meta";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  entryCountsByDay: Map<string, number>;
}

const WEEKDAY_HEADERS = ["pn", "wt", "śr", "czw", "pt", "sob", "ndz"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function gridStart(viewMonth: Date): Date {
  const first = startOfMonth(viewMonth);
  const dow = first.getDay();
  const back = (dow + 6) % 7;
  return addDays(first, -back);
}

export function DesktopCalendarPopover({
  open,
  onClose,
  selectedDay,
  onSelectDay,
  entryCountsByDay,
}: Props) {
  const [viewMonth, setViewMonth] = React.useState<Date>(() => {
    const d = parseIsoLocalDate(selectedDay) ?? new Date();
    return startOfMonth(d);
  });
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (open) {
      const d = parseIsoLocalDate(selectedDay) ?? new Date();
      setViewMonth(startOfMonth(d));
    }
  }, [open, selectedDay]);

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const today = new Date();
  const { daysWithConversations } = useConversationsMeta();
  const start = gridStart(viewMonth);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  const last = cells[cells.length - 1];
  if (
    last.getMonth() !== viewMonth.getMonth() &&
    cells[cells.length - 7].getMonth() !== viewMonth.getMonth()
  ) {
    cells.splice(35, 7);
  }

  const selected = parseIsoLocalDate(selectedDay);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Kalendarz"
      className="absolute top-full left-0 mt-1 z-30 w-80 rounded-xl border border-border bg-background shadow-[var(--elevation-3)]"
    >
      <div className="flex items-center justify-between px-3 h-10 border-b border-border">
        <div className="text-sm font-semibold capitalize">
          {formatMonthYearPL(viewMonth)}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() =>
              setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-foreground/5"
            aria-label="Poprzedni miesiąc"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-foreground/5"
            aria-label="Następny miesiąc"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] uppercase text-muted mb-1">
          {WEEKDAY_HEADERS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((d) => {
            const iso = toIsoLocalDate(d);
            const inMonth = d.getMonth() === viewMonth.getMonth();
            const isToday = isSameLocalDay(d, today);
            const isSelected = selected ? isSameLocalDay(d, selected) : false;
            const count = entryCountsByDay.get(iso) ?? 0;
            const hasConv = daysWithConversations.has(iso);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  onSelectDay(iso);
                  onClose();
                }}
                className={cn(
                  "relative aspect-square rounded-md flex flex-col items-center justify-center gap-0 text-sm tabular-nums",
                  !inMonth && "text-muted/40",
                  inMonth && !isSelected && "hover:bg-foreground/5",
                  isSelected && "bg-foreground text-background font-semibold",
                  !isSelected && isToday && "ring-1 ring-foreground/40"
                )}
                aria-label={count > 0 ? `${d.getDate()}, ${count} wpisów` : `${d.getDate()}`}
              >
                <span className="leading-none">{d.getDate()}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-[9px] leading-none tabular-nums font-medium mt-0.5",
                      isSelected ? "text-background/80" : "text-muted"
                    )}
                  >
                    {count}
                  </span>
                )}
                {hasConv && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 inline-block h-1 w-1 rounded-full",
                      isSelected ? "bg-background/80" : "bg-accent"
                    )}
                    title="Rozmowa z agentem"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
