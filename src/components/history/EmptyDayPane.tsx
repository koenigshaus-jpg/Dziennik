"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import { createEntry } from "@/lib/db-supabase";
import {
  createdAtForDay,
  formatWithWeekdayPL,
  parseIsoLocalDate,
} from "@/lib/dates";
import { useStt } from "@/lib/useStt";
import { cn } from "@/lib/utils";

interface Props {
  selectedDay: string;
  todayIso: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function EmptyDayPane({ selectedDay, todayIso }: Props) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const dayDate = parseIsoLocalDate(selectedDay);

  const dayRef = React.useRef(selectedDay);
  React.useEffect(() => {
    dayRef.current = selectedDay;
  }, [selectedDay]);

  const { recording, processing, start, stop } = useStt({
    onTranscript: async (text) => {
      const t = text.trim();
      if (!t) return;
      setCreating(true);
      try {
        const id = await createEntry({
          contentHtml: `<p>${escapeHtml(t).replace(/\n/g, "<br/>")}</p>`,
          mood: null,
          createdAt: createdAtForDay(dayRef.current),
          tags: [],
          media: [],
        });
        const dParam = dayRef.current !== todayIso ? `&d=${dayRef.current}` : "";
        router.replace(`/?id=${id}${dParam}`);
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

  async function handleAdd() {
    if (isBusy) return;
    setCreating(true);
    try {
      const id = await createEntry({
        contentHtml: "",
        mood: null,
        createdAt: createdAtForDay(selectedDay),
        tags: [],
        media: [],
      });
      const dParam = selectedDay !== todayIso ? `&d=${selectedDay}` : "";
      router.replace(`/?id=${id}${dParam}`);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Nie udało się utworzyć wpisu."
      );
      setCreating(false);
    }
  }

  function handleMic() {
    if (recording) stop();
    else if (!isBusy) void start();
  }

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      <p className="text-sm uppercase tracking-wider text-muted mb-2">
        {dayDate ? formatWithWeekdayPL(dayDate) : selectedDay}
      </p>
      <p className="text-lg text-foreground/80 mb-10">Brak wpisów na ten dzień.</p>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={handleAdd}
          disabled={isBusy}
          aria-label="Dodaj wpis na ten dzień"
          className={cn(
            "inline-flex h-20 w-20 items-center justify-center rounded-full",
            "border border-border bg-background text-foreground shadow-[var(--elevation-2)]",
            "transition-transform hover:scale-105 active:scale-95",
            isBusy && "opacity-70 cursor-not-allowed"
          )}
        >
          {creating && !recording ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <Plus className="h-9 w-9" />
          )}
        </button>
        <button
          type="button"
          onClick={handleMic}
          disabled={isBusy && !recording}
          aria-label={
            recording
              ? "Zatrzymaj nagrywanie"
              : isBusy
              ? "Tworzę wpis"
              : "Nagraj wpis na ten dzień"
          }
          className={cn(
            "inline-flex h-20 w-20 items-center justify-center rounded-full",
            "shadow-[var(--elevation-3)] transition-transform",
            recording
              ? "bg-recording text-on-destructive animate-pulse"
              : "bg-foreground text-background hover:scale-105 active:scale-95",
            isBusy && !recording && "opacity-70 cursor-not-allowed"
          )}
        >
          {processing ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : recording ? (
            <Square className="h-7 w-7 fill-current" />
          ) : (
            <Mic className="h-9 w-9" />
          )}
        </button>
      </div>
      <p className="text-xs text-muted mt-8">
        {"Kliknij „+” aby napisać, lub mikrofon aby nagrać."}
      </p>
    </div>
  );
}
