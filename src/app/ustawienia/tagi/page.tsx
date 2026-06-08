"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";

import { SettingsShell } from "@/components/settings/SettingsShell";
import {
  deleteTag,
  listAllTagsWithCount,
  renameTag,
} from "@/lib/db-supabase";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tag = { name: string; count: number };

export default function TagiPage() {
  const [tags, setTags] = React.useState<Tag[] | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<Tag | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const load = React.useCallback(async () => {
    try {
      const ts = await listAllTagsWithCount();
      setTags(ts);
    } catch (e) {
      console.error(e);
      toast.error("Nie udało się załadować tagów.");
      setTags([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onChanged = () => void load();
    window.addEventListener("entries-changed", onChanged);
    return () => window.removeEventListener("entries-changed", onChanged);
  }, [load]);

  React.useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function startEdit(t: Tag) {
    setEditing(t.name);
    setDraft(t.name);
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  async function saveRename(oldName: string) {
    const next = draft.trim();
    if (!next) {
      cancelEdit();
      return;
    }
    if (next === oldName) {
      cancelEdit();
      return;
    }
    setBusy(true);
    try {
      const res = await renameTag(oldName, next);
      toast.success(
        res.merged
          ? `Połączono z istniejącym tagiem #${next}.`
          : `Zmieniono nazwę na #${next}.`
      );
      cancelEdit();
      await load();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Nie udało się zmienić nazwy."
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const name = deleteTarget.name;
    setDeleteTarget(null);
    setBusy(true);
    try {
      await deleteTag(name);
      toast.success(`Usunięto tag #${name}.`);
      await load();
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Nie udało się usunąć tagu."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsShell title="Tagi">
      <div>
        <p className="text-sm text-muted mb-4">
          Zmiana nazwy aktualizuje tag we wszystkich wpisach. Usunięcie
          odpina tag od wpisów, ale samych wpisów nie kasuje.
        </p>

        {tags === null && (
          <div className="flex items-center justify-center py-12 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {tags && tags.length === 0 && (
          <div className="text-center text-sm text-muted py-12">
            Nie masz jeszcze żadnych tagów.
          </div>
        )}

        {tags && tags.length > 0 && (
          <ul className="flex flex-col rounded-xl border border-border overflow-hidden">
            {tags.map((t) => {
              const isEditing = editing === t.name;
              return (
                <li
                  key={t.name}
                  className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 bg-background"
                >
                  {isEditing ? (
                    <>
                      <span className="text-muted">#</span>
                      <input
                        ref={inputRef}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveRename(t.name);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        disabled={busy}
                        className="flex-1 h-10 bg-transparent border border-border rounded-md px-2 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
                      />
                      <button
                        type="button"
                        onClick={() => void saveRename(t.name)}
                        disabled={busy}
                        aria-label="Zapisz"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 text-foreground disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={busy}
                        aria-label="Anuluj"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 text-muted disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">
                        <span className="text-muted">#</span>
                        {t.name}
                      </span>
                      <span className="text-xs text-muted tabular-nums">
                        {t.count}{" "}
                        {t.count === 1
                          ? "wpis"
                          : t.count < 5
                          ? "wpisy"
                          : "wpisów"}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        disabled={busy}
                        aria-label={`Zmień nazwę tagu ${t.name}`}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-foreground/5 text-muted",
                          busy && "opacity-50"
                        )}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        disabled={busy}
                        aria-label={`Usuń tag ${t.name}`}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-destructive/10 text-destructive",
                          busy && "opacity-50"
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć tag #{deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Tag zostanie odpięty od{" "}
              {deleteTarget?.count}{" "}
              {deleteTarget?.count === 1
                ? "wpisu"
                : (deleteTarget?.count ?? 0) < 5
                ? "wpisów"
                : "wpisów"}
              . Same wpisy zostają.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              Usuń
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsShell>
  );
}
