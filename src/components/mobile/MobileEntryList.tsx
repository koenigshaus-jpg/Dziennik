"use client";

import * as React from "react";
import type { ClientEntry } from "@/lib/db-supabase";
import { formatLongPL, parseIsoLocalDate, toIsoLocalDate, isSameLocalDay } from "@/lib/dates";
import { MobileEntryCard } from "./MobileEntryCard";
import { MobileEmptyDay } from "./MobileEmptyDay";

interface Props {
  entries: ClientEntry[];
  selectedDay: string;
  recording?: boolean;
  onMicTap?: () => void;
}

export function MobileEntryList({ entries, selectedDay }: Props) {
  const date = React.useMemo(
    () => parseIsoLocalDate(selectedDay) ?? new Date(),
    [selectedDay]
  );
  const isToday = isSameLocalDay(date, new Date());

  const dayEntries = React.useMemo(
    () =>
      entries.filter(
        (e) => toIsoLocalDate(new Date(e.createdAt)) === selectedDay
      ),
    [entries, selectedDay]
  );

  return (
    <div className="px-3 pt-3 pb-[200px]">
      <header className="flex items-baseline justify-between mb-3 px-1">
        <h2 className="font-sans text-sm uppercase tracking-[0.18em] font-semibold text-foreground/80">
          {formatLongPL(date)}
        </h2>
        {isToday && (
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            Dziś
          </span>
        )}
      </header>
      {dayEntries.length === 0 ? (
        <MobileEmptyDay />
      ) : (
        <div className="flex flex-col gap-2">
          {dayEntries.map((e) => (
            <MobileEntryCard key={e.id} entry={e} />
          ))}
        </div>
      )}
    </div>
  );
}
