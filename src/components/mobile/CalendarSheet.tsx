"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  addDays,
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

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function gridStart(viewMonth: Date): Date {
  const first = startOfMonth(viewMonth);
  // ISO Monday-first: getDay() returns 0=Sunday, 1=Mon...
  const dow = first.getDay();
  const back = (dow + 6) % 7; // days back to Monday
  return addDays(first, -back);
}

export function CalendarSheet({
  open,
  onOpenChange,
  selectedDay,
  onSelectDay,
  entryCountsByDay,
}: Props) {
  const [viewMonth, setViewMonth] = React.useState<Date>(() => {
    const d = parseIsoLocalDate(selectedDay) ?? new Date();
    return startOfMonth(d);
  });

  React.useEffect(() => {
    if (open) {
      const d = parseIsoLocalDate(selectedDay) ?? new Date();
      setViewMonth(startOfMonth(d));
    }
  }, [open, selectedDay]);

  const today = new Date();
  const start = gridStart(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  // Trim trailing week if entirely next-month
  const last = cells[cells.length - 1];
  if (last.getMonth() !== viewMonth.getMonth() && cells[cells.length - 7].getMonth() !== viewMonth.getMonth()) {
    cells.splice(35, 7);
  }

  const selected = parseIsoLocalDate(selectedDay);

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
            "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] rounded-t-2xl",
            "bg-background border-t border-border shadow-2xl",
            "flex flex-col pb-[env(safe-area-inset-bottom)]",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
          )}
        >
          <div className="flex items-center justify-between px-4 h-12 border-b border-border">
            <DialogPrimitive.Title className="text-base font-semibold capitalize">
              {formatMonthYearPL(viewMonth)}
            </DialogPrimitive.Title>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
                aria-label="Poprzedni miesiąc"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
                aria-label="Następny miesiąc"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <DialogPrimitive.Close
                className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5"
                aria-label="Zamknij kalendarz"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>
          <DialogPrimitive.Description className="sr-only">
            Wybór daty dla nawigacji po wpisach
          </DialogPrimitive.Description>
          <div className="px-3 pt-3">
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted mb-2">
              {WEEKDAY_HEADERS.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 pb-4">
              {cells.map((d) => {
                const iso = toIsoLocalDate(d);
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const isToday = isSameLocalDay(d, today);
                const isSelected = selected ? isSameLocalDay(d, selected) : false;
                const count = entryCountsByDay.get(iso) ?? 0;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onSelectDay(iso);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "relative aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 text-sm tabular-nums",
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
                          "text-[9px] leading-none tabular-nums font-medium",
                          isSelected ? "text-background/80" : "text-muted"
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
