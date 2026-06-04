"use client";

import * as React from "react";
import { Mic, Square, Loader2 } from "lucide-react";
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

  const { recording, processing, start, stop } = useStt({
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
        "lg:hidden fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40",
        "inline-flex h-14 w-14 items-center justify-center rounded-full",
        "shadow-[var(--elevation-3)] transition-transform",
        recording
          ? "bg-recording text-on-destructive animate-pulse"
          : "bg-foreground text-background hover:scale-105 active:scale-95",
        isBusy && "opacity-70 cursor-not-allowed"
      )}
    >
      {isBusy ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : recording ? (
        <Square className="h-5 w-5 fill-current" />
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </button>
  );
}
