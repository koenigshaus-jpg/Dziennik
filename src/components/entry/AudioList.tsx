"use client";

import { Trash2 } from "lucide-react";
import type { UploadedMedia } from "./media-types";

interface Props {
  value: UploadedMedia[];
  onRemove: (id: string) => void;
}

export function AudioList({ value, onRemove }: Props) {
  if (value.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {value.map((m) => (
        <div
          key={m.id}
          className="flex items-center gap-2 w-1/2"
        >
          <audio src={m.path} controls className="flex-1 h-9 min-w-0" />
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            className="p-2 rounded-md hover:bg-foreground/5"
            aria-label="Usuń nagranie"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
