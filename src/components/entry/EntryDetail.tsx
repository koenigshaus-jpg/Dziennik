"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { parseMoods } from "@/lib/moods";
import { formatWithWeekdayPL, formatTimePL } from "@/lib/dates";
import { EntryForm } from "./EntryForm";
import type { UploadedMedia } from "./media-types";
import { deleteEntry as dbDeleteEntry } from "@/lib/db-client";

interface Props {
  entry: {
    id: string;
    contentHtml: string;
    mood: string | null;
    createdAt: string;
    tags: { id: string; name: string }[];
    media: UploadedMedia[];
  };
  onChanged?: () => void;
}

export function EntryDetail({ entry, onChanged }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function onDelete() {
    setDeleting(true);
    try {
      await dbDeleteEntry(entry.id);
      toast.success("Wpis usunięty.");
      router.push("/historia");
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się usunąć.");
      setDeleting(false);
    }
  }

  if (editing) {
    return (
      <EntryForm
        mode="edit"
        initial={{
          id: entry.id,
          contentHtml: entry.contentHtml,
          mood: entry.mood,
          createdAt: entry.createdAt,
          tags: entry.tags.map((t) => t.name),
          media: entry.media,
        }}
        onSaved={() => {
          setEditing(false);
          onChanged?.();
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const date = new Date(entry.createdAt);
  const moods = parseMoods(entry.mood);
  const images = entry.media.filter((m) => m.kind === "image");
  const audio = entry.media.filter((m) => m.kind === "audio");

  return (
    <article className="relative flex flex-col gap-5">
      <button
        type="button"
        onClick={() => router.push("/")}
        aria-label="Zamknij"
        className="absolute -top-2 -right-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-1.5 pr-10">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Edytuj"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <Dialog>
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label="Usuń"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Usunąć wpis?</DialogTitle>
              <DialogDescription>
                Tej operacji nie da się cofnąć. Wpis i wszystkie media zostaną usunięte.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <DialogClose asChild>
                <Button variant="outline">Anuluj</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting ? "Usuwam…" : "Usuń wpis"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <header className="pr-10 mt-2.5">
        <p className="text-sm uppercase tracking-wider text-muted">
          {formatWithWeekdayPL(date)} · {formatTimePL(date)}
        </p>
      </header>

      <div
        className="entry-content text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
      />

      {moods.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {moods.map((m) => (
            <span
              key={m.key}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full border bg-foreground/5 border-foreground/20 text-sm"
            >
              <span className="text-base leading-none">{m.emoji}</span>
              <span>{m.label}</span>
            </span>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLightbox(m.path)}
              className="relative aspect-square rounded-md overflow-hidden border border-border bg-foreground/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.path}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {audio.length > 0 && (
        <div className="flex flex-col gap-2">
          {audio.map((m) => (
            <audio key={m.id} src={m.path} controls className="w-full" />
          ))}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {entry.tags.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center h-9 px-3 rounded-full border border-foreground/20 text-sm text-muted"
            >
              #{t.name}
            </span>
          ))}
        </div>
      )}

      {lightbox && (
        <Dialog open onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-4xl p-2 bg-black border-black">
            <DialogTitle className="sr-only">Podgląd zdjęcia</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt=""
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}
