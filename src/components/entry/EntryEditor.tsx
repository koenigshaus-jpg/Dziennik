"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatWithWeekdayPL, formatTimePL } from "@/lib/dates";
import { deleteEntry, getEntry, type ClientEntry } from "@/lib/db-client";
import { EntryForm, type EntryFormHandle } from "./EntryForm";

interface Props {
  entry: ClientEntry;
  onUpdated?: (fresh: ClientEntry) => void;
  onDeleted?: () => void;
  bodyClassName?: string;
}

const AUTOSAVE_DELAY_MS = 800;

export function EntryEditor({ entry, onUpdated, onDeleted, bodyClassName }: Props) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const formRef = useRef<EntryFormHandle>(null);

  useEffect(() => {
    if (!dirty || saving) return;
    const t = setTimeout(() => {
      formRef.current?.save().catch(() => {});
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [dirty, saving]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteEntry(entry.id);
      toast.success("Wpis usunięty.");
      onDeleted?.();
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się usunąć.");
      setDeleting(false);
    }
  }

  const date = new Date(entry.createdAt);
  const status = saving
    ? "Zapisywanie…"
    : dirty
    ? "Niezapisane zmiany"
    : savedAt
    ? "Zapisano"
    : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm uppercase tracking-wider text-muted pt-2">
          {formatWithWeekdayPL(date)} · {formatTimePL(date)}
        </p>
        <div className="flex items-center gap-4">
          <span
            className="text-xs text-muted tabular-nums"
            aria-live="polite"
          >
            {status}
          </span>
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Usuń wpis"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Usunąć wpis?</DialogTitle>
                <DialogDescription>
                  Tej operacji nie da się cofnąć. Wpis i wszystkie media zostaną
                  usunięte.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 mt-4">
                <DialogClose asChild>
                  <Button variant="outline">Anuluj</Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Usuwam…" : "Usuń wpis"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className={bodyClassName}>
        <EntryForm
          ref={formRef}
          key={entry.id}
          mode="edit"
          bare
          initial={{
            id: entry.id,
            contentHtml: entry.contentHtml,
            mood: entry.mood,
            createdAt: new Date(entry.createdAt).toISOString(),
            tags: entry.tags,
            media: entry.media,
          }}
          onDirtyChange={setDirty}
          onSavingChange={setSaving}
          onSaved={async (id) => {
            setDirty(false);
            setSavedAt(Date.now());
            try {
              const fresh = await getEntry(id);
              if (fresh) onUpdated?.(fresh);
            } catch {}
          }}
        />
      </div>
    </div>
  );
}
