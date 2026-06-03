"use client";

import * as React from "react";
import { CalendarDays, Menu } from "lucide-react";
import { HamburgerDrawer } from "./HamburgerDrawer";
import { CalendarSheet } from "./CalendarSheet";
import { toIsoLocalDate } from "@/lib/dates";

interface Props {
  selectedDay?: string;
  onSelectDay?: (iso: string) => void;
  entryCountsByDay?: Map<string, number>;
}

export function MobileHeader({
  selectedDay,
  onSelectDay,
  entryCountsByDay,
}: Props) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const today = React.useMemo(() => toIsoLocalDate(new Date()), []);
  const calendarSelected = selectedDay ?? today;
  const counts = entryCountsByDay ?? new Map<string, number>();

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 h-12 flex items-center justify-between px-2 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
          aria-label="Otwórz menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-sm font-semibold tracking-wide select-none">
          Dziennik
        </div>
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
          aria-label="Otwórz kalendarz"
        >
          <CalendarDays className="h-5 w-5" />
        </button>
      </header>
      <HamburgerDrawer open={menuOpen} onOpenChange={setMenuOpen} />
      <CalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        selectedDay={calendarSelected}
        onSelectDay={(iso) => onSelectDay?.(iso)}
        entryCountsByDay={counts}
      />
    </>
  );
}
