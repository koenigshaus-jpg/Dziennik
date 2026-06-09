"use client";

import * as React from "react";
import { Mic, Loader2 } from "lucide-react";
import { CountdownRing, formatCountdown } from "./CountdownRing";
import { toast } from "sonner";
import { createEntry } from "@/lib/db-supabase";
import { createdAtForDay } from "@/lib/dates";
import { useStt } from "@/lib/useStt";
import { cn } from "@/lib/utils";

interface Props {
  selectedDay: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function MicFab({ selectedDay }: Props) {
  const [creating, setCreating] = React.useState(false);

  // Trzymamy aktualny selectedDay w refie, żeby onTranscript widział aktualną
  // wartość (callback jest tworzony raz przez useStt).
  const selectedDayRef = React.useRef(selectedDay);
  React.useEffect(() => {
    selectedDayRef.current = selectedDay;
  }, [selectedDay]);

  const { recording, processing, elapsed, maxSeconds, start, stop } = useStt({
    onTranscript: async (text) => {
      const t = text.trim();
      if (!t) return;
      setCreating(true);
      try {
        await createEntry({
          contentHtml: `<p>${escapeHtml(t).replace(/\n/g, "<br/>")}</p>`,
          mood: null,
          createdAt: createdAtForDay(selectedDayRef.current),
          tags: [],
          media: [],
        });
      } catch (e) {
        console.error(e);
        toast.error(
          e instanceof Error ? e.message : "Nie udało się utworzyć wpisu."
        );
      } finally {
        setCreating(false);
      }
    },
  });

  const isBusy = processing || creating;
  const handleClick = () => {
    if (recording) stop();
    else if (!isBusy) void start();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-label={
        recording
          ? "Zatrzymaj nagrywanie"
          : isBusy
          ? "Tworzę wpis"
          : "Nagraj nowy wpis"
      }
      className={cn(
        "lg:hidden fixed right-4 bottom-[calc(var(--composer-h,5rem)+0.75rem)] z-40",
        "inline-flex h-14 w-14 items-center justify-center rounded-full",
        "shadow-[var(--elevation-3)] transition-transform",
        recording
          ? "bg-recording text-on-destructive"
          : "bg-foreground text-background hover:scale-105 active:scale-95",
        isBusy && "opacity-70 cursor-not-allowed"
      )}
    >
      {recording && (
        <CountdownRing remaining={Math.max(0, maxSeconds - elapsed)} total={maxSeconds} />
      )}
      {isBusy ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : recording ? (
        <span className="text-[11px] font-medium tabular-nums leading-none">
          {formatCountdown(Math.max(0, maxSeconds - elapsed))}
        </span>
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </button>
  );
}
