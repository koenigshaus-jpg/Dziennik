"use client";

import { X } from "lucide-react";
import type { UploadedMedia } from "./media-types";

interface Props {
  value: UploadedMedia[];
  onRemove: (id: string) => void;
}

export function MediaThumbs({ value, onRemove }: Props) {
  if (value.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {value.map((m) => (
        <div
          key={m.id}
          className="relative aspect-square rounded-md overflow-hidden border border-border bg-foreground/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.path}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={() => onRemove(m.id)}
            className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
            aria-label="Usuń zdjęcie"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
