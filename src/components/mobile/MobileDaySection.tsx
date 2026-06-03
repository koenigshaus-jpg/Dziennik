"use client";

import * as React from "react";
import { formatLongPL, parseIsoLocalDate, isSameLocalDay } from "@/lib/dates";

interface Props {
  iso: string;
  registerDay: (el: HTMLElement | null, iso: string) => void;
  children: React.ReactNode;
}

export function MobileDaySection({ iso, registerDay, children }: Props) {
  const date = React.useMemo(
    () => parseIsoLocalDate(iso) ?? new Date(),
    [iso]
  );
  const isToday = isSameLocalDay(date, new Date());

  return (
    <section
      ref={(el) => registerDay(el, iso)}
      data-day={iso}
      className="px-3 mb-6 scroll-mt-[140px]"
    >
      <header className="flex items-baseline justify-between mb-2 px-1">
        <h2 className="font-sans text-sm uppercase tracking-[0.18em] font-semibold text-foreground/80">
          {formatLongPL(date)}
        </h2>
        {isToday && (
          <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">
            Dziś
          </span>
        )}
      </header>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
