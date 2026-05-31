"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Editor } from "./Editor";
import { MoodPicker } from "./MoodPicker";
import { TagInput } from "./TagInput";
import { ImageUploader, UploadedMedia } from "./ImageUploader";
import { AudioRecorder } from "./AudioRecorder";
import { Button } from "@/components/ui/button";
import { formatDateTimeLocalInput, formatShortPL } from "@/lib/dates";
import {
  ImagePlus,
  Mic,
  Smile,
  Hash,
  Calendar,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOOD_BY_KEY, serializeMoods, parseMoods } from "@/lib/moods";
import { createEntry, updateEntry } from "@/lib/db-client";

type PanelKey = "image" | "audio" | "mood" | "tags" | "date" | null;

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

  function togglePanel(key: NonNullable<PanelKey>) {
    setOpenPanel((curr) => (curr === key ? null : key));
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

  const tools: {
    key: NonNullable<PanelKey>;
    label: string;
    icon: typeof ImagePlus;
    badge?: string | null;
  }[] = [
    {
      key: "image",
      label: "Zdjęcia",
      icon: ImagePlus,
      badge: images.length > 0 ? String(images.length) : null,
    },
    {
      key: "audio",
      label: "Audio",
      icon: Mic,
      badge: audio.length > 0 ? String(audio.length) : null,
    },
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
        {tools.map((t) => {
          const Icon = t.icon;
          const active = openPanel === t.key;
          const hasValue = !!t.badge;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => togglePanel(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm transition-colors",
                active
                  ? "bg-foreground text-background border-foreground"
                  : hasValue
                  ? "bg-foreground/5 border-foreground/20 hover:bg-foreground/10"
                  : "border-border hover:border-foreground/40 text-muted"
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
          {openPanel === "image" && (
            <ImageUploader value={images} onChange={setImages} />
          )}
          {openPanel === "audio" && (
            <AudioRecorder value={audio} onChange={setAudio} />
          )}
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
