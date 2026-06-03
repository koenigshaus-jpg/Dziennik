"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Editor, type EditorHandle } from "./Editor";
import { MoodPicker } from "./MoodPicker";
import { TagInput } from "./TagInput";
import { MediaThumbs } from "./MediaThumbs";
import { AudioList } from "./AudioList";
import type { UploadedMedia } from "./media-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTimeLocalInput, formatShortPL } from "@/lib/dates";
import {
  ImagePlus,
  Mic,
  Smile,
  Hash,
  Calendar,
  Square,
  Loader2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOOD_BY_KEY, serializeMoods, parseMoods } from "@/lib/moods";
import { createEntry, updateEntry, newId } from "@/lib/db-supabase";
import { compressImage } from "@/lib/clientImage";
import { blobToDataUrl } from "@/lib/clientMedia";

type PanelKey = "mood" | "tags" | "date" | null;

const PANEL_TITLES: Record<NonNullable<PanelKey>, string> = {
  mood: "Wybierz nastrój",
  tags: "Dodaj tagi",
  date: "Edytuj datę",
};

interface Props {
  mode: "create" | "edit";
  initial?: {
    id: string;
    contentHtml: string;
    mood: string | null;
    createdAt: string;
    tags: string[];
    media: UploadedMedia[];
  };
  onSaved?: (id: string) => void;
  onCancel?: () => void;
  bare?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSavingChange?: (saving: boolean) => void;
  onAudioRecordingChange?: (state: {
    recording: boolean;
    elapsed: number;
    processing: boolean;
  }) => void;
  actionsSlot?: React.ReactNode;
}

export interface EntryFormHandle {
  save: () => Promise<void>;
  openImagePicker: () => void;
  toggleAudioRecording: () => void;
  openPanel: (key: "mood" | "tags" | "date") => void;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const EntryForm = forwardRef<EntryFormHandle, Props>(function EntryForm(
  {
    mode,
    initial,
    onSaved,
    onCancel,
    bare = false,
    onDirtyChange,
    onSavingChange,
    onAudioRecordingChange,
    actionsSlot,
  },
  ref
) {
  const router = useRouter();
  const [content, setContent] = useState(initial?.contentHtml ?? "");
  const [moods, setMoods] = useState<string[]>(
    parseMoods(initial?.mood).map((m) => m.key)
  );
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [images, setImages] = useState<UploadedMedia[]>(
    initial?.media.filter((m) => m.kind === "image") ?? []
  );
  const [audio, setAudio] = useState<UploadedMedia[]>(
    initial?.media.filter((m) => m.kind === "audio") ?? []
  );
  const [createdAt, setCreatedAt] = useState<string>(
    initial?.createdAt
      ? formatDateTimeLocalInput(new Date(initial.createdAt))
      : formatDateTimeLocalInput(new Date())
  );
  const [openPanel, setOpenPanel] = useState<PanelKey>(null);
  const [saving, setSaving] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  // images
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragDepthRef = useRef(0);

  // audio
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processingAudio, setProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  // speech-to-text
  const STT_MAX_SECONDS = 60;
  const editorRef = useRef<EditorHandle>(null);
  const [sttRecording, setSttRecording] = useState(false);
  const [sttElapsed, setSttElapsed] = useState(0);
  const [sttProcessing, setSttProcessing] = useState(false);
  const sttRecorderRef = useRef<MediaRecorder | null>(null);
  const sttChunksRef = useRef<Blob[]>([]);
  const sttTimerRef = useRef<number | null>(null);
  const sttStartedAtRef = useRef<number>(0);
  const sttAutoStopRef = useRef<number | null>(null);

  async function startStt() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      sttRecorderRef.current = mr;
      sttChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) sttChunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mr.mimeType || "audio/webm";
        const blob = new Blob(sttChunksRef.current, { type: mime });
        setSttProcessing(true);
        try {
          const ext = mime.includes("ogg")
            ? "ogg"
            : mime.includes("mp4")
            ? "mp4"
            : "webm";
          const file = new File([blob], `voice.${ext}`, { type: blob.type });
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => null)) as {
              error?: string;
            } | null;
            throw new Error(err?.error || "Transkrypcja nie powiodła się.");
          }
          const data = (await res.json()) as { text?: string };
          const text = (data.text || "").trim();
          if (!text) {
            toast.message("Nie wykryto mowy.");
          } else {
            editorRef.current?.insertText(text);
          }
        } catch (e) {
          console.error(e);
          toast.error(
            e instanceof Error ? e.message : "Transkrypcja nie powiodła się."
          );
        } finally {
          setSttProcessing(false);
        }
      };
      mr.start();
      sttStartedAtRef.current = Date.now();
      setSttElapsed(0);
      sttTimerRef.current = window.setInterval(() => {
        setSttElapsed((Date.now() - sttStartedAtRef.current) / 1000);
      }, 250);
      sttAutoStopRef.current = window.setTimeout(() => {
        toast.message(`Osiągnięto limit ${STT_MAX_SECONDS}s.`);
        stopStt();
      }, STT_MAX_SECONDS * 1000);
      setSttRecording(true);
    } catch (e) {
      toast.error("Nie udało się włączyć mikrofonu.");
      console.error(e);
    }
  }

  function stopStt() {
    sttRecorderRef.current?.stop();
    if (sttTimerRef.current) {
      window.clearInterval(sttTimerRef.current);
      sttTimerRef.current = null;
    }
    if (sttAutoStopRef.current) {
      window.clearTimeout(sttAutoStopRef.current);
      sttAutoStopRef.current = null;
    }
    setSttRecording(false);
  }

  useEffect(() => {
    return () => {
      if (sttTimerRef.current) window.clearInterval(sttTimerRef.current);
      if (sttAutoStopRef.current) window.clearTimeout(sttAutoStopRef.current);
      if (sttRecorderRef.current && sttRecorderRef.current.state !== "inactive") {
        try {
          sttRecorderRef.current.stop();
        } catch {}
      }
    };
  }, []);

  function togglePanel(key: NonNullable<PanelKey>) {
    setOpenPanel((curr) => (curr === key ? null : key));
  }

  async function handleImageFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const added: UploadedMedia[] = [];
    for (const original of Array.from(files)) {
      try {
        const compressed = await compressImage(original);
        const dataUrl = await blobToDataUrl(compressed);
        added.push({
          id: newId(),
          path: dataUrl,
          mime: compressed.type || "image/jpeg",
          size: compressed.size,
          kind: "image",
        });
      } catch (e) {
        console.error(e);
        toast.error(`Nie udało się dodać ${original.name}.`);
      }
    }
    setImages((curr) => [...curr, ...added]);
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { audioBitsPerSecond: 32000 });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        setProcessingAudio(true);
        try {
          const mime = (blob.type || "audio/webm").split(";")[0];
          const dataUrl = await blobToDataUrl(blob);
          setAudio((curr) => [
            ...curr,
            {
              id: newId(),
              path: dataUrl,
              mime,
              size: blob.size,
              kind: "audio",
            },
          ]);
        } catch (e) {
          console.error(e);
          toast.error("Nie udało się zapisać nagrania.");
        } finally {
          setProcessingAudio(false);
        }
      };
      mr.start();
      startedAtRef.current = Date.now();
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((Date.now() - startedAtRef.current) / 1000);
      }, 250);
      setRecording(true);
    } catch (e) {
      toast.error("Nie udało się włączyć mikrofonu.");
      console.error(e);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
  }

  async function save() {
    const isEmpty = !content || content.replace(/<[^>]+>/g, "").trim() === "";
    if (isEmpty) {
      toast.error("Wpis nie może być pusty.");
      return;
    }
    setSaving(true);

    try {
      const allMedia = [...images, ...audio];
      if (mode === "create") {
        const id = await createEntry({
          contentHtml: content,
          mood: serializeMoods(moods),
          createdAt: new Date(createdAt),
          tags,
          media: allMedia,
        });
        toast.success("Wpis zapisany.");
        if (onSaved) {
          onSaved(id);
        } else {
          const isDesktop =
            typeof window !== "undefined" &&
            window.matchMedia("(min-width: 1024px)").matches;
          router.push(isDesktop ? `/historia?id=${id}` : `/wpis/${id}`);
        }
      } else {
        await updateEntry(initial!.id, {
          contentHtml: content,
          mood: serializeMoods(moods),
          createdAt: new Date(createdAt),
          tags,
          media: allMedia,
        });
        toast.success("Zaktualizowano.");
        if (onSaved) onSaved(initial!.id);
        else router.refresh();
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Nie udało się zapisać.");
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({
    save,
    openImagePicker: () => imageInputRef.current?.click(),
    toggleAudioRecording: () => (recording ? stopRecording() : startRecording()),
    openPanel: (key) => setOpenPanel(key),
  }));

  useEffect(() => {
    onAudioRecordingChange?.({ recording, elapsed, processing: processingAudio });
  }, [recording, elapsed, processingAudio, onAudioRecordingChange]);

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  useEffect(() => {
    if (!onDirtyChange) return;
    if (mode === "create") {
      const isEmpty = !content || content.replace(/<[^>]+>/g, "").trim() === "";
      onDirtyChange(!isEmpty);
      return;
    }
    if (!initial) {
      onDirtyChange(false);
      return;
    }
    const initialMoods = parseMoods(initial.mood).map((m) => m.key);
    const initialImages = initial.media.filter((m) => m.kind === "image");
    const initialAudio = initial.media.filter((m) => m.kind === "audio");
    const initialCreatedAt = formatDateTimeLocalInput(new Date(initial.createdAt));
    const sameArr = (a: string[], b: string[]) =>
      a.length === b.length && a.every((v, i) => v === b[i]);
    const sameMediaIds = (a: UploadedMedia[], b: UploadedMedia[]) =>
      a.length === b.length && a.every((m, i) => m.id === b[i].id);
    const dirty =
      content !== initial.contentHtml ||
      !sameArr(moods, initialMoods) ||
      !sameArr(tags, initial.tags) ||
      !sameMediaIds(images, initialImages) ||
      !sameMediaIds(audio, initialAudio) ||
      createdAt !== initialCreatedAt;
    onDirtyChange(dirty);
  }, [content, moods, tags, images, audio, createdAt, mode, initial, onDirtyChange]);

  const panelTools: {
    key: NonNullable<PanelKey>;
    label: string;
    icon: typeof ImagePlus;
    badge?: string | null;
  }[] = [
    {
      key: "mood",
      label: "Dodaj nastrój",
      icon: Smile,
      badge: null,
    },
    {
      key: "tags",
      label: "Dodaj tag",
      icon: Hash,
      badge: null,
    },
    {
      key: "date",
      label: "Edytuj datę",
      icon: Calendar,
      badge:
        formatDateTimeLocalInput(new Date()).slice(0, 10) !== createdAt.slice(0, 10)
          ? formatShortPL(new Date(createdAt))
          : null,
    },
  ];

  const imageBadge = images.length > 0 ? String(images.length) : null;
  const audioBadge = audio.length > 0 ? String(audio.length) : null;
  const selectedMoods = moods
    .map((k) => MOOD_BY_KEY[k])
    .filter((m): m is NonNullable<typeof m> => !!m);

  const baseBtn =
    "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm transition-colors";
  const idleBtn = "border-border hover:border-foreground/40 text-muted";
  const valueBtn = "bg-foreground/5 border-foreground/20 hover:bg-foreground/10";
  const activeBtn = "bg-foreground text-background border-foreground";

  const renderMicButton = (positionClassName: string) => (
    <button
      type="button"
      onClick={sttRecording ? stopStt : startStt}
      disabled={sttProcessing}
      aria-label={
        sttRecording
          ? "Zatrzymaj dyktowanie"
          : sttProcessing
          ? "Przetwarzanie"
          : "Dyktuj"
      }
      title={sttRecording ? "Zatrzymaj dyktowanie" : "Dyktuj (Speech-to-Text)"}
      className={cn(
        "z-20 inline-flex items-center justify-center gap-1.5 h-10 rounded-full transition-all",
        positionClassName,
        sttRecording
          ? "bg-recording text-on-destructive px-3 shadow-[var(--elevation-2)] hover:bg-recording/90"
          : "w-10 text-muted hover:text-foreground hover:bg-foreground/5",
        sttProcessing ? "opacity-70 cursor-not-allowed" : ""
      )}
    >
      {sttProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : sttRecording ? (
        <>
          <Square className="h-4 w-4 fill-current" />
          <span className="text-sm tabular-nums">
            {formatSeconds(sttElapsed)}
          </span>
        </>
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-3.5",
        bare ? "pb-44 lg:pb-0 lg:flex-1 lg:min-h-0" : ""
      )}
    >
      {(selectedMoods.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedMoods.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-foreground/20 text-sm select-none"
            >
              <span className="text-base leading-none">{m.emoji}</span>
              <span>{m.label}</span>
            </span>
          ))}
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center h-9 px-3 rounded-full border border-foreground/20 text-sm text-muted select-none"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
      <div
        onDragEnter={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          dragDepthRef.current += 1;
          setDragOver(true);
        }}
        onDragOver={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragOver(false);
        }}
        onDrop={(e) => {
          if (!Array.from(e.dataTransfer.types).includes("Files")) return;
          e.preventDefault();
          dragDepthRef.current = 0;
          setDragOver(false);
          const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/")
          );
          if (imageFiles.length === 0) {
            toast.error("Upuść plik graficzny.");
            return;
          }
          handleImageFiles(imageFiles);
        }}
        className={cn(
          "relative transition-colors",
          bare
            ? cn(
                "rounded-md min-h-32",
                dragOver
                  ? "outline-2 outline-dashed outline-foreground/40 bg-foreground/[0.04]"
                  : ""
              )
            : cn(
                "rounded-2xl border bg-background/60 px-6 pt-0.5 pb-7 sm:px-8 sm:pt-0.5 sm:pb-8 min-h-[224px] sm:min-h-[336px] lg:min-h-[416px] shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_30px_-12px_rgba(0,0,0,0.08)] lg:flex lg:flex-col",
                dragOver
                  ? "border-foreground/50 bg-foreground/[0.04]"
                  : "border-border"
              )
        )}
      >
        <Editor
          ref={editorRef}
          value={content}
          onChange={setContent}
          placeholder="Zacznij pisać…"
        />
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-foreground/40 bg-background/70 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted">
              <ImagePlus className="h-4 w-4" />
              Upuść zdjęcia, żeby dodać
            </div>
          </div>
        )}
        {renderMicButton(
          bare
            ? "hidden lg:inline-flex lg:absolute lg:bottom-3 lg:right-3"
            : "absolute bottom-3 right-3"
        )}
        {!bare && (images.length > 0 || audio.length > 0) && (
          <div className="hidden lg:flex flex-col gap-3 lg:mt-auto lg:pt-4 lg:pr-12">
            <MediaThumbs
              value={images}
              onRemove={(id) => setImages(images.filter((x) => x.id !== id))}
            />
            <AudioList
              value={audio}
              onRemove={(id) => setAudio(audio.filter((x) => x.id !== id))}
            />
          </div>
        )}
      </div>

      {(images.length > 0 || audio.length > 0) && (
        <div
          className={cn(
            "flex flex-col gap-3",
            !bare && "lg:hidden",
            bare && "lg:mt-auto"
          )}
        >
          <MediaThumbs
            value={images}
            onRemove={(id) => setImages(images.filter((x) => x.id !== id))}
          />
          <AudioList
            value={audio}
            onRemove={(id) => setAudio(audio.filter((x) => x.id !== id))}
          />
        </div>
      )}


      <div
        className={cn(
          "flex flex-col gap-3",
          bare
            ? "lg:hidden fixed bottom-14 left-0 right-0 z-30 bg-background border-t border-border px-4 pt-3 pb-4"
            : ""
        )}
      >
      {bare &&
        renderMicButton(
          "lg:hidden absolute -top-12 right-4"
        )}
      {bare &&
        (recording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center justify-center gap-1.5 w-full h-9 px-3 rounded-full border bg-recording text-on-destructive border-recording hover:bg-recording/90 text-sm transition-colors"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
            <span>Nagrywam {formatSeconds(elapsed)}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            className="inline-flex items-center justify-between gap-2 w-full h-9 px-3 rounded-full border border-border text-sm text-muted hover:bg-foreground/5 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" />
              Dodaj element
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                toolsOpen ? "rotate-180" : ""
              )}
            />
          </button>
        ))}
      <div
        className={cn(
          "flex flex-wrap gap-2",
          bare
            ? recording || !toolsOpen
              ? "hidden"
              : "justify-start"
            : "justify-center"
        )}
      >
        {/* Photos: one-click → file picker */}
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className={cn(baseBtn, imageBadge ? valueBtn : idleBtn)}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span>Dodaj zdjęcie</span>
          {imageBadge && (
            <span className="ml-0.5 text-xs font-medium opacity-70">
              {imageBadge}
            </span>
          )}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageFiles(e.target.files)}
        />

        {/* Audio: one-click → start/stop recording */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={processingAudio}
          className={cn(
            baseBtn,
            recording
              ? "bg-recording text-on-destructive border-recording hover:bg-recording/90"
              : audioBadge
              ? valueBtn
              : idleBtn
          )}
        >
          {processingAudio ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : recording ? (
            <Square className="h-4 w-4 fill-current" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
          <span>
            {recording
              ? `Zatrzymaj (${formatSeconds(elapsed)})`
              : "Nagraj audio"}
          </span>
          {!recording && audioBadge && (
            <span className="ml-0.5 text-xs font-medium opacity-70">
              {audioBadge}
            </span>
          )}
        </button>

        {/* Panel-based tools */}
        {panelTools.map((t) => {
          const Icon = t.icon;
          const active = openPanel === t.key;
          const hasValue = !!t.badge;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => togglePanel(t.key)}
              className={cn(
                baseBtn,
                active ? activeBtn : hasValue ? valueBtn : idleBtn
              )}
              aria-expanded={active}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={cn(
                    "ml-0.5 text-xs font-medium",
                    active ? "opacity-80" : "opacity-70"
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {actionsSlot && <div className="lg:hidden">{actionsSlot}</div>}
      </div>

      <Dialog
        open={!!openPanel}
        onOpenChange={(o) => !o && setOpenPanel(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {openPanel ? PANEL_TITLES[openPanel] : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {openPanel === "mood" && (
              <MoodPicker value={moods} onChange={setMoods} />
            )}
            {openPanel === "tags" && (
              <TagInput value={tags} onChange={setTags} />
            )}
            {openPanel === "date" && (
              <input
                type="datetime-local"
                value={createdAt}
                onChange={(e) => setCreatedAt(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-background px-3 text-base"
              />
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setOpenPanel(null)}>Gotowe</Button>
          </div>
        </DialogContent>
      </Dialog>

      {!bare && (
        <div className="flex flex-col sm:flex-row sm:justify-center gap-3 pt-10">
          <Button
            size="lg"
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto sm:min-w-52"
          >
            {saving ? "Zapisuję…" : mode === "create" ? "Zapisz wpis" : "Zapisz zmiany"}
          </Button>
          {onCancel && (
            <Button
              size="lg"
              variant="outline"
              onClick={onCancel}
              className="w-full sm:w-auto"
            >
              Anuluj
            </Button>
          )}
        </div>
      )}
    </div>
  );
});
