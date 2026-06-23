"use client";

import * as React from "react";
import {
  CalendarDays,
  Filter,
  Images,
  Loader2,
  Plus,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DesktopCalendarPopover } from "./DesktopCalendarPopover";
import { HamburgerDrawer } from "@/components/mobile/HamburgerDrawer";
import { useGallery } from "@/components/media/GalleryDialogProvider";

interface Props {
  todayIso: string;
  selectedDay: string;
  onSelectDay: (iso: string) => void;
  entryCountsByDay: Map<string, number>;
  q: string;
  searchDraft: string;
  onSearchDraftChange: (v: string) => void;
  onClearSearch: () => void;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  filtersPanel: React.ReactNode;
  onCreateToday: () => Promise<void>;
  creatingToday: boolean;
}

export function DesktopTopBar({
  todayIso,
  selectedDay,
  onSelectDay,
  entryCountsByDay,
  q,
  searchDraft,
  onSearchDraftChange,
  onClearSearch,
  filtersOpen,
  onToggleFilters,
  activeFilterCount,
  filtersPanel,
  onCreateToday,
  creatingToday,
}: Props) {
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { openGallery } = useGallery();
  const isToday = selectedDay === todayIso;

  return (
    <>
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <div className="h-12 px-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Button
              type="button"
              size="sm"
              onClick={() => void onCreateToday()}
              disabled={creatingToday}
              className="rounded-full"
            >
              {creatingToday ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Dodaj dzisiejszy wpis</span>
            </Button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen((v) => !v)}
                aria-label="Otwórz kalendarz"
                aria-expanded={calendarOpen}
                className={
                  "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors " +
                  (calendarOpen
                    ? "bg-foreground/5 text-foreground"
                    : "text-muted hover:bg-foreground/5 hover:text-foreground")
                }
              >
                <CalendarDays className="h-5 w-5" />
              </button>
              <DesktopCalendarPopover
                open={calendarOpen}
                onClose={() => setCalendarOpen(false)}
                selectedDay={selectedDay}
                onSelectDay={onSelectDay}
                entryCountsByDay={entryCountsByDay}
              />
            </div>
            <button
              type="button"
              onClick={openGallery}
              aria-label="Galeria"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
            >
              <Images className="h-5 w-5" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => onSelectDay(todayIso)}
                className="ml-1 inline-flex h-8 items-center px-3 rounded-full border border-border text-xs font-medium hover:bg-foreground/5"
                aria-label="Wróć do dzisiaj"
              >
                Dziś
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <form
              onSubmit={(e) => e.preventDefault()}
              className="relative w-56 sm:w-64 md:w-80"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <Input
                value={searchDraft}
                onChange={(e) => onSearchDraftChange(e.target.value)}
                placeholder="Szukaj w treści…"
                className="h-9 pl-9 pr-9 text-sm"
              />
              {q && (
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Wyczyść wyszukiwanie"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
            <button
              type="button"
              onClick={onToggleFilters}
              aria-expanded={filtersOpen}
              aria-label="Filtry"
              className={
                "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors " +
                (filtersOpen
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-foreground/5 hover:text-foreground")
              }
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && !filtersOpen && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-[10px] leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Otwórz menu"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        {filtersOpen && (
          <div className="px-3 pb-3 border-t border-border bg-background/95">
            {filtersPanel}
          </div>
        )}
      </div>
      <HamburgerDrawer open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
}
