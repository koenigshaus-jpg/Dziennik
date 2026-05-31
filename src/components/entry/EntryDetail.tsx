"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
import type { UploadedMedia } from "./ImageUploader";
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
    <article className="flex flex-col gap-6">
      <header>
        <p className="text-sm uppercase tracking-wider text-muted">
          {formatWithWeekdayPL(date)} · {formatTimePL(date)}
        </p>
        {moods.length > 0 && (
          <p className="mt-2 flex flex-wrap items-center gap-3 text-base">
            {moods.map((m) => (
              <span key={m.key} className="inline-flex items-center gap-1.5">
                <span className="text-xl">{m.emoji}</span>
                <span className="text-muted">{m.label}</span>
              </span>
            ))}
          </p>
        )}
      </header>

      <div
        className="entry-content text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
      />

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
            <span key={t.id} className="text-sm text-muted">
              #{t.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-6 border-t border-border">
        <Button onClick={() => setEditing(true)} variant="outline">
          <Pencil className="h-4 w-4" /> Edytuj
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Usuń
            </Button>
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
