"use client";

import * as React from "react";
import {
  Mic,
  Paperclip,
  Send,
  Loader2,
  Square,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  createEntry,
  newId,
  type ClientMedia,
} from "@/lib/db-supabase";
import { parseIsoLocalDate, isSameLocalDay } from "@/lib/dates";
import { useStt } from "@/lib/useStt";
import { compressImage } from "@/lib/clientImage";
import { blobToDataUrl } from "@/lib/clientMedia";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createdAtForDay(iso: string): Date {
  const day = parseIsoLocalDate(iso);
  if (!day) return new Date();
  if (isSameLocalDay(day, new Date())) return new Date();
  day.setHours(12, 0, 0, 0);
  return day;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const ComposerBar = React.forwardRef<ComposerBarHandle, Props>(
  function ComposerBar({ variant, selectedDay, onRecordingChange }, ref) {
    const [value, setValue] = React.useState("");
    const [sending, setSending] = React.useState(false);
    const [attachments, setAttachments] = React.useState<ClientMedia[]>([]);
    const [uploadingImage, setUploadingImage] = React.useState(false);
    const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
    const imageInputRef = React.useRef<HTMLInputElement | null>(null);

    const { recording, processing, elapsed, start, stop } = useStt({
      onTranscript: (text) => {
        setValue((prev) => (prev ? `${prev.trimEnd()} ${text}` : text));
        inputRef.current?.focus();
      },
    });

    // Propaguj zmianę recording do rodzica (np. dla MobileEmptyDay)
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

    async function handleImageFiles(files: FileList | File[] | null) {
      if (!files || files.length === 0) return;
      setUploadingImage(true);
      const added: ClientMedia[] = [];
      for (const original of Array.from(files)) {
        try {
          const compressed = await compressImage(original);
          const dataUrl = await blobToDataUrl(compressed);
          added.push({
            id: newId(),
            kind: "image",
            path: dataUrl,
            mime: compressed.type || original.type || "image/jpeg",
            size: compressed.size,
          });
        } catch (e) {
          console.error(e);
          toast.error("Nie udało się dodać zdjęcia.");
        }
      }
      setAttachments((prev) => [...prev, ...added]);
      setUploadingImage(false);
    }

    function removeAttachment(id: string) {
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    }

    async function handleSend() {
      const text = value.trim();
      if ((!text && attachments.length === 0) || sending) return;
      setSending(true);
      try {
        const contentHtml = text
          ? `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`
          : "";
        await createEntry({
          contentHtml,
          mood: null,
          createdAt: createdAtForDay(selectedDay),
          tags: [],
          media: attachments,
        });
        setValue("");
        setAttachments([]);
        inputRef.current?.focus();
      } catch (e) {
        console.error(e);
        toast.error(
          e instanceof Error ? e.message : "Nie udało się dodać wpisu."
        );
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

    const containerClass =
      variant === "mobile"
        ? "px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"
        : "hidden lg:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(640px,90vw)] px-3 py-2 bg-background border border-border rounded-3xl shadow-[var(--elevation-3)]";

    const showSend = value.trim().length > 0 || attachments.length > 0;

    // Mobile variant — uproszczony: tylko textarea jako placeholder dla
    // zapytań AI. Bez mic, paperclip, send. Wpisy tworzymy przez MicFab.
    if (variant === "mobile") {
      return (
        <div className={containerClass}>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                toast.message("Zapytania do AI — wkrótce.");
              }
            }}
            placeholder="Zapytaj asystenta… (wkrótce)"
            rows={1}
            className="w-full resize-none bg-foreground/[0.04] border-0 outline-none focus:ring-0 rounded-2xl text-sm leading-6 py-2.5 px-4 placeholder:text-muted/70"
          />
        </div>
      );
    }

    return (
      <div className={containerClass}>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={async (e) => {
            await handleImageFiles(e.target.files);
            if (imageInputRef.current) imageInputRef.current.value = "";
          }}
        />

        {/* Lista podglądu załączników */}
        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="relative shrink-0 h-14 w-14 rounded-lg border border-border overflow-hidden bg-foreground/[0.04]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.path}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(a.id)}
                  aria-label="Usuń załącznik"
                  className="absolute top-0.5 right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "flex items-end gap-2",
            variant === "desktop" && "w-full"
          )}
        >
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
              placeholder={recording ? "Słucham…" : "Co masz na myśli?"}
              disabled={sending}
              rows={1}
              className="w-full resize-none bg-transparent border-0 outline-none focus:ring-0 text-sm leading-6 py-2 px-1 placeholder:text-muted/70"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={sending}
                aria-label="Dodaj załącznik"
                className="relative shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                {uploadingImage ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
                {attachments.length > 0 && (
                  <span
                    aria-label={`${attachments.length} załączników`}
                    className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center px-1 rounded-full bg-foreground text-background text-[10px] font-semibold leading-none tabular-nums"
                  >
                    {attachments.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  imageInputRef.current?.click();
                }}
              >
                <ImagePlus className="h-4 w-4 text-muted" />
                <span>Dodaj zdjęcie</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  toast.message("Nagrywanie audio — wkrótce w composerze.");
                }}
              >
                <Mic className="h-4 w-4 text-muted" />
                <span>Nagraj audio</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
    );
  }
);
