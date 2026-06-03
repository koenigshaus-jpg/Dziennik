"use client";

import { Mic, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  recording?: boolean;
  onMicTap?: () => void;
}

export function MobileEmptyDay({ recording = false, onMicTap }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <button
        type="button"
        onClick={onMicTap}
        aria-label={recording ? "Zatrzymaj nagrywanie" : "Nagraj wpis"}
        className={cn(
          "inline-flex h-20 w-20 items-center justify-center rounded-full transition-colors shadow-[var(--elevation-3)]",
          recording
            ? "bg-recording text-on-destructive animate-pulse"
            : "bg-foreground text-background hover:scale-105"
        )}
      >
        {recording ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-8 w-8" />}
      </button>
      <p className="mt-6 text-sm text-muted max-w-xs">
        {recording
          ? "Słucham… Tap, by zatrzymać."
          : "Brak wpisów na ten dzień. Nagraj pierwszy lub napisz w pasku poniżej."}
      </p>
    </div>
  );
}
