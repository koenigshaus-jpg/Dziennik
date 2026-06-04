"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Plus, Square } from "lucide-react";
import { toast } from "sonner";
import { createEntry } from "@/lib/db-supabase";
import { createdAtForDay } from "@/lib/dates";
import { useStt } from "@/lib/useStt";
import { cn } from "@/lib/utils";

interface Props {
  dayIso: string;
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

export function DayHeaderActions({ dayIso, todayIso }: Props) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  const dayRef = React.useRef(dayIso);
  React.useEffect(() => {
    dayRef.current = dayIso;
  }, [dayIso]);

  const { recording, processing, start, stop } = useStt({
    onTranscript: async (text) => {
      const t = text.trim();
      if (!t) return;
      setCreating(true);
      try {
        await createEntry({
          contentHtml: `<p>${escapeHtml(t).replace(/\n/g, "<br/>")}</p>`,
          mood: null,
          createdAt: createdAtForDay(dayRef.current),
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

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isBusy) return;
    setCreating(true);
    try {
      const id = await createEntry({
        contentHtml: "",
        mood: null,
        createdAt: createdAtForDay(dayIso),
        tags: [],
        media: [],
      });
      const dParam = dayIso !== todayIso ? `&d=${dayIso}` : "";
      router.replace(`/?id=${id}${dParam}`);
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Nie udało się utworzyć wpisu."
      );
      setCreating(false);
    }
  }

  function handleMic(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (recording) stop();
    else if (!isBusy) void start();
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 transition-opacity",
        recording ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
      )}
    >
      <button
        type="button"
        onClick={handleAdd}
        disabled={isBusy}
        aria-label="Dodaj wpis na ten dzień"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "text-muted hover:bg-foreground/5 hover:text-foreground transition-colors",
          isBusy && "opacity-70 cursor-not-allowed"
        )}
      >
        {creating && !recording ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </button>
      <button
        type="button"
        onClick={handleMic}
        disabled={isBusy && !recording}
        aria-label={recording ? "Zatrzymaj nagrywanie" : "Nagraj wpis na ten dzień"}
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors",
          recording
            ? "bg-recording text-on-destructive animate-pulse"
            : "text-muted hover:bg-foreground/5 hover:text-foreground",
          isBusy && !recording && "opacity-70 cursor-not-allowed"
        )}
      >
        {processing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : recording ? (
          <Square className="h-3 w-3 fill-current" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
