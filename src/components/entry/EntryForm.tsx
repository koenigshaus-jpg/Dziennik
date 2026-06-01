"use client";

import { useRef, useState } from "react";
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
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function EntryForm({ mode, initial, onSaved, onCancel }: Props) {
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

  async function handleImageFiles(files: FileList | null) {
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
          router.push(`/wpis/${id}`);
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

  const panelTools: {
    key: NonNullable<PanelKey>;
    label: string;
    icon: typeof ImagePlus;
    badge?: string | null;
  }[] = [
    {
      key: "mood",
      label: "Nastrój",
      icon: Smile,
      badge: moods.length > 0
        ? moods.map((k) => MOOD_BY_KEY[k]?.emoji).filter(Boolean).join("")
        : null,
    },
    {
      key: "tags",
      label: "Tagi",
      icon: Hash,
      badge: tags.length > 0 ? String(tags.length) : null,
    },
    {
      key: "date",
      label: "Data",
      icon: Calendar,
      badge:
        formatDateTimeLocalInput(new Date()).slice(0, 10) !== createdAt.slice(0, 10)
          ? formatShortPL(new Date(createdAt))
          : null,
    },
  ];

  const imageBadge = images.length > 0 ? String(images.length) : null;
  const audioBadge = audio.length > 0 ? String(audio.length) : null;

  const baseBtn =
    "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm transition-colors";
  const idleBtn = "border-border hover:border-foreground/40 text-muted";
  const valueBtn = "bg-foreground/5 border-foreground/20 hover:bg-foreground/10";
  const activeBtn = "bg-foreground text-background border-foreground";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-background/60 px-6 py-7 sm:px-8 sm:py-8 min-h-[240px] shadow-[0_1px_0_rgba(0,0,0,0.02),0_8px_30px_-12px_rgba(0,0,0,0.08)]">
        <Editor
          value={content}
          onChange={setContent}
          placeholder="Zacznij pisać…"
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
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
          <span>Zdjęcia</span>
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
              : "Audio"}
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

      <div className="flex justify-center gap-3 pt-2">
        <Button
          size="lg"
          onClick={save}
          disabled={saving}
          className="min-w-[200px]"
        >
          {saving ? "Zapisuję…" : mode === "create" ? "Zapisz wpis" : "Zapisz zmiany"}
        </Button>
        {onCancel && (
          <Button size="lg" variant="outline" onClick={onCancel}>
            Anuluj
          </Button>
        )}
      </div>
    </div>
  );
}
