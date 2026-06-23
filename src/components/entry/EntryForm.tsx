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
  Mic,
  ImagePlus,
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
import { blobToDataUrl } from "@/lib/clientMedia";
import { compressImage } from "@/lib/clientImage";
import { useStt } from "@/lib/useStt";

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
  actionsSlot?: React.ReactNode;
}

export interface EntryFormHandle {
  save: () => Promise<void>;
  openImagePicker: () => void;
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

  // audio: dodawanie wyłączone (narazie). Stan trzymamy tylko po to, by
  // wyświetlać/zapisywać istniejące nagrania ze starych wpisów.

  // speech-to-text (via shared hook)
  const editorRef = useRef<EditorHandle>(null);
  const {
    recording: sttRecording,
    processing: sttProcessing,
    elapsed: sttElapsed,
    start: startStt,
    stop: stopStt,
  } = useStt({
    onTranscript: (text) => editorRef.current?.insertText(text),
  });

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

  async function save() {
    const noText = !content || content.replace(/<[^>]+>/g, "").trim() === "";
    const noMedia = images.length === 0 && audio.length === 0;
    if (noText && noMedia) {
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
          router.push(isDesktop ? `/?id=${id}` : `/wpis/${id}`);
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
    openPanel: (key) => setOpenPanel(key),
  }));

  useEffect(() => {
    onSavingChange?.(saving);
  }, [saving, onSavingChange]);

  useEffect(() => {
    if (!onDirtyChange) return;
    if (mode === "create") {
      const noText = !content || content.replace(/<[^>]+>/g, "").trim() === "";
      const noMedia = images.length === 0 && audio.length === 0;
      onDirtyChange(!(noText && noMedia));
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
    icon: typeof Smile;
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
      {/* Zdjęcia: nad treścią wpisu */}
      {images.length > 0 && (
        <MediaThumbs
          value={images}
          onRemove={(id) => setImages(images.filter((x) => x.id !== id))}
        />
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
        {renderMicButton(
          bare
            ? "hidden lg:inline-flex lg:absolute lg:top-0 lg:right-0"
            : "absolute top-0 right-0"
        )}
        {dragOver && (
          <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-foreground/40 bg-background/70 flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted">
              <ImagePlus className="h-4 w-4" />
              Upuść zdjęcia, żeby dodać
            </div>
          </div>
        )}
      </div>

      {audio.length > 0 && (
        <AudioList
          value={audio}
          onRemove={(id) => setAudio(audio.filter((x) => x.id !== id))}
        />
      )}

      <div
        className={cn(
          "flex flex-col gap-3",
          bare
            ? "lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border px-4 pt-3 pb-4"
            : ""
        )}
      >
      {bare &&
        renderMicButton(
          "lg:hidden absolute -top-12 right-4"
        )}
      {/* Mobile: „Dodaj zdjęcie" po lewej stronie, mikrofon po prawej */}
      {bare && (
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          aria-label="Dodaj zdjęcie"
          className={cn(
            "lg:hidden absolute -top-12 left-4 z-20",
            "inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-full",
            "border border-border bg-background text-muted text-sm transition-colors",
            "shadow-[var(--elevation-2)] hover:text-foreground hover:bg-foreground/5",
            uploadingImage && "opacity-70 cursor-not-allowed"
          )}
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span>Dodaj zdjęcie</span>
        </button>
      )}
      {bare && (
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
      )}
      <div
        className={cn(
          "flex flex-wrap gap-2",
          bare ? (!toolsOpen ? "hidden" : "justify-start") : "justify-center"
        )}
      >
        {/* Zdjęcia: na desktopie/stronie tworzenia pill w toolbarze.
            Na mobile/bare jest osobny przycisk przy mikrofonie wyżej. */}
        {!bare && (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImage}
            className={cn(baseBtn, images.length > 0 ? valueBtn : idleBtn)}
          >
            {uploadingImage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            <span>Dodaj zdjęcie</span>
            {images.length > 0 && (
              <span className="ml-0.5 text-xs font-medium opacity-70">
                {images.length}
              </span>
            )}
          </button>
        )}

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

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageFiles(e.target.files)}
      />

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
