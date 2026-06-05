"use client";

import * as React from "react";
import { Mic, Send, Loader2, Square } from "lucide-react";
import { toast } from "sonner";
import { useStt } from "@/lib/useStt";
import { cn } from "@/lib/utils";

interface Props {
  variant: "mobile" | "desktop";
  selectedDay: string;
  onRecordingChange?: (recording: boolean) => void;
}

export interface ComposerBarHandle {
  startDictation: () => void;
  stopDictation: () => void;
  focus: () => void;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const ComposerBar = React.forwardRef<ComposerBarHandle, Props>(
  function ComposerBar({ variant, onRecordingChange }, ref) {
    const [value, setValue] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

    const { recording, processing, elapsed, start, stop } = useStt({
      onTranscript: (text) => {
        setValue((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
        inputRef.current?.focus();
      },
    });

    React.useEffect(() => {
      onRecordingChange?.(recording);
    }, [recording, onRecordingChange]);

    React.useImperativeHandle(ref, () => ({
      startDictation: () => {
        if (!recording && !processing) void start();
      },
      stopDictation: () => {
        if (recording) stop();
      },
      focus: () => inputRef.current?.focus(),
    }));

    async function handleSend() {
      const text = value.trim();
      if (!text || sending) return;
      setSending(true);
      try {
        // TODO: integracja z AI — na razie tylko placeholder
        toast.message("Zapytania do AI — wkrótce.");
        setValue("");
        inputRef.current?.focus();
      } finally {
        setSending(false);
      }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    }

    function adjustHeight(el: HTMLTextAreaElement | null) {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }

    React.useEffect(() => {
      adjustHeight(inputRef.current);
    }, [value]);

    const showSend = value.trim().length > 0;

    const outerClass =
      variant === "mobile"
        ? "px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        : "hidden lg:block fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(640px,90vw)]";

    return (
      <div className={outerClass}>
        <div className="relative">
          {/* Delikatna kolorowa poświata à la Gemini */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[3px] rounded-[1.65rem] bg-[conic-gradient(from_180deg_at_50%_50%,#7dd3fc,#c4b5fd,#f9a8d4,#fcd34d,#7dd3fc)] opacity-60 blur-[10px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[1px] rounded-[1.55rem] bg-[conic-gradient(from_180deg_at_50%_50%,#7dd3fc,#c4b5fd,#f9a8d4,#fcd34d,#7dd3fc)] opacity-50"
          />
          <div className="relative flex items-end gap-2 bg-background/95 backdrop-blur border border-border/60 rounded-3xl px-2 py-1.5 shadow-[var(--elevation-3)]">
            {recording ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Zatrzymaj dyktowanie"
                className="shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full bg-recording text-on-destructive hover:bg-recording/90 transition-colors"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span className="text-xs tabular-nums">
                  {formatSeconds(elapsed)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void start()}
                disabled={processing || sending}
                aria-label="Dyktuj"
                className={cn(
                  "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-foreground/5 transition-colors",
                  (processing || sending) && "opacity-70 cursor-not-allowed"
                )}
              >
                {processing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            )}

            <div className="flex-1 min-w-0">
              <textarea
                ref={(el) => {
                  inputRef.current = el;
                  adjustHeight(el);
                }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={recording ? "Słucham…" : "Zapytaj asystenta…"}
                disabled={sending}
                rows={1}
                className="w-full resize-none bg-transparent border-0 outline-none focus:ring-0 text-sm leading-6 py-2 px-1 placeholder:text-muted/70"
              />
            </div>

            {showSend && (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending}
                aria-label="Wyślij"
                className={cn(
                  "shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors",
                  sending && "opacity-70 cursor-not-allowed"
                )}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
