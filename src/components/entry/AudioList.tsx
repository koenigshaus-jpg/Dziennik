"use client";

import { useState } from "react";
import { MoreVertical, Download, Trash2 } from "lucide-react";
import type { UploadedMedia } from "./media-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  value: UploadedMedia[];
  onRemove: (id: string) => void;
}

function extFromMime(mime: string): string {
  if (!mime) return "bin";
  const sub = mime.split("/")[1] ?? "bin";
  return sub.split(";")[0].split("+")[0]; // strip codec params and "+xml"
}

function downloadMedia(m: UploadedMedia) {
  const a = document.createElement("a");
  a.href = m.path;
  a.download = `${m.id}.${extFromMime(m.mime)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function AudioList({ value, onRemove }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (value.length === 0) return null;
  const confirmTarget = confirmId
    ? value.find((m) => m.id === confirmId) ?? null
    : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {value.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-2 w-full lg:w-1/2"
          >
            <audio
              src={m.path}
              controls
              controlsList="nodownload noplaybackrate noremoteplayback"
              className="flex-1 h-9 min-w-0"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-md hover:bg-foreground/5"
                  aria-label="Menu nagrania"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    downloadMedia(m);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Pobierz
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmId(m.id);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>

      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usunąć nagranie?</DialogTitle>
            <DialogDescription>
              Tej operacji nie da się cofnąć. Nagranie zostanie usunięte z wpisu.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <DialogClose asChild>
              <Button variant="outline">Anuluj</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmId) onRemove(confirmId);
                setConfirmId(null);
              }}
            >
              Usuń
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
