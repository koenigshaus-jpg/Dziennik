"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Editor } from "./Editor";
import { MoodPicker } from "./MoodPicker";
import { TagInput } from "./TagInput";
import { MediaThumbs } from "./MediaThumbs";
import { AudioList } from "./AudioList";
import type { UploadedMedia } from "./media-types";
import { Button } from "@/components/ui/button";
import { formatDateTimeLocalInput, formatShortPL } from "@/lib/dates";
import {
  ImagePlus,
  Mic,
  Smile,
  Hash,
  Calendar,
  Check,
  Square,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOOD_BY_KEY, serializeMoods, parseMoods } from "@/lib/moods";
import { createEntry, updateEntry, newId } from "@/lib/db-client";
import { compressImage } from "@/lib/clientImage";
import { blobToDataUrl } from "@/lib/clientMedia";

type PanelKey = "mood" | "tags" | "date" | null;

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
}

export interface EntryFormHandle {
  save: () => Promise<void>;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export const EntryForm = forwardRef<EntryFormHandle, Props>(function EntryForm(
  { mode, initial, onSaved, onCancel, bare = false, onDirtyChange, onSavingChange },
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

  useImperativeHandle(ref, () => ({ save }));

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

  return (
    <div className="flex flex-col gap-5">
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
                "rounded-md min-h-[120px]",
                dragOver
                  ? "outline-2 outline-dashed outline-foreground/40 bg-foreground/[0.04]"
                  : ""
              )
            : cn(
                "rounded-2xl border bg-background/60 px-6 py-7 sm:px-8 sm:py-8 min-h-[224px] sm:min-h-[336px] lg:min-h-[416px] shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_30px_-12px_rgba(0,0,0,0.08)]",
                dragOver
                  ? "border-foreground/50 bg-foreground/[0.04]"
                  : "border-border"
              )
        )}
      >
        <Editor
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
      </div>

      {(images.length > 0 || audio.length > 0) && (
        <div className="flex flex-col gap-3">
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

      {(selectedMoods.length > 0 || tags.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedMoods.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => togglePanel("mood")}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border bg-foreground/5 border-foreground/20 text-sm hover:bg-foreground/10"
            >
              <span className="text-base leading-none">{m.emoji}</span>
              <span>{m.label}</span>
            </button>
          ))}
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => togglePanel("tags")}
              className="inline-flex items-center h-9 px-3 rounded-full border border-foreground/20 text-sm text-muted hover:bg-foreground/5"
            >
              #{t}
            </button>
          ))}
        </div>
      )}

      <div className={cn("flex flex-wrap gap-2", bare ? "justify-start" : "justify-center")}>
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
              ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
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
              : "Dodaj audio"}
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

      {openPanel && (
        <div className="border border-border rounded-xl p-4 bg-foreground/[0.02] animate-in fade-in slide-in-from-top-1 duration-150">
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
              className="h-11 rounded-md border border-border bg-background px-3 text-base"
            />
          )}
          <button
            type="button"
            onClick={() => setOpenPanel(null)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <Check className="h-3.5 w-3.5" /> Gotowe
          </button>
        </div>
      )}

      {!bare && (
        <div className="flex flex-col sm:flex-row sm:justify-center gap-3 pt-10">
          <Button
            size="lg"
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto sm:min-w-[200px]"
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
