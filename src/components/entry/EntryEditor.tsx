"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  ChevronDown,
  ImagePlus,
  Mic,
  Smile,
  Hash,
  Calendar,
  Square,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatWithWeekdayPL, formatTimePL, toIsoLocalDate } from "@/lib/dates";
import { deleteEntry, getEntry, type ClientEntry } from "@/lib/db-supabase";
import { EntryForm, type EntryFormHandle } from "./EntryForm";
import { useConversationsMeta } from "@/lib/agent/use-conversations-meta";
import { PersonaBadgeRow } from "@/components/agent/PersonaBadge";

interface Props {
  entry: ClientEntry;
  onUpdated?: (fresh: ClientEntry) => void;
  onDeleted?: () => void;
  bodyClassName?: string;
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function EntryEditor({ entry, onUpdated, onDeleted, bodyClassName }: Props) {
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [audioState, setAudioState] = useState({
    recording: false,
    elapsed: 0,
    processing: false,
  });
  const formRef = useRef<EntryFormHandle>(null);

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
  const { personasByDay } = useConversationsMeta();
  const dayPersonas = personasByDay.get(toIsoLocalDate(date)) ?? [];

  return (
    <div className="flex flex-col gap-5 lg:flex-1 lg:min-h-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 pt-2">
          <p className="text-sm uppercase tracking-wider text-muted">
            {formatWithWeekdayPL(date)} · {formatTimePL(date)}
          </p>
          {dayPersonas.length > 0 && (
            <PersonaBadgeRow personaKeys={dayPersonas} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {audioState.recording ? (
            <button
              type="button"
              onClick={() => formRef.current?.toggleAudioRecording()}
              className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border bg-recording text-on-destructive border-recording hover:bg-recording/90 text-sm transition-colors"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Nagrywam {formatSeconds(audioState.elapsed)}</span>
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-muted hover:bg-foreground/5 hover:text-foreground text-sm transition-colors data-[state=open]:bg-foreground/5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Dodaj element</span>
                  <ChevronDown className="h-4 w-4 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={() => formRef.current?.openImagePicker()}
                >
                  <ImagePlus className="h-4 w-4 text-muted" />
                  <span>Dodaj zdjęcie</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => formRef.current?.toggleAudioRecording()}
                >
                  <Mic className="h-4 w-4 text-muted" />
                  <span>Nagraj audio</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => formRef.current?.openPanel("mood")}
                >
                  <Smile className="h-4 w-4 text-muted" />
                  <span>Dodaj nastrój</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => formRef.current?.openPanel("tags")}
                >
                  <Hash className="h-4 w-4 text-muted" />
                  <span>Dodaj tag</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => formRef.current?.openPanel("date")}
                >
                  <Calendar className="h-4 w-4 text-muted" />
                  <span>Edytuj datę</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                aria-label="Usuń wpis"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-destructive-container hover:text-destructive transition-colors"
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
          <Button
            size="sm"
            onClick={() => formRef.current?.save()}
            disabled={!dirty || saving}
            className="hidden lg:inline-flex"
          >
            {saving ? "Zapisuję…" : "Zapisz"}
          </Button>
        </div>
      </div>

      <div className={cn(bodyClassName, "lg:flex-1 lg:flex lg:flex-col lg:min-h-0")}>
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
          onAudioRecordingChange={setAudioState}
          onSaved={async (id) => {
            setDirty(false);
            try {
              const fresh = await getEntry(id);
              if (fresh) onUpdated?.(fresh);
            } catch {}
          }}
          actionsSlot={
            <Button
              size="lg"
              onClick={() => formRef.current?.save()}
              disabled={!dirty || saving}
              className="w-full"
            >
              {saving ? "Zapisuję…" : "Zapisz"}
            </Button>
          }
        />
      </div>
    </div>
  );
}
