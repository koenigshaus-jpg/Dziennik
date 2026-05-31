"use client";

import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/clientImage";
import { blobToDataUrl } from "@/lib/clientMedia";
import { newId } from "@/lib/db-client";

export interface UploadedMedia {
  id: string;
  path: string; // data: URI
  mime: string;
  size: number;
  kind: "image" | "audio";
}

interface Props {
  value: UploadedMedia[];
  onChange: (media: UploadedMedia[]) => void;
}

export function ImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
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
    onChange([...value, ...added]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 && (
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
                onClick={() => onChange(value.filter((x) => x.id !== m.id))}
                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black"
                aria-label="Usuń zdjęcie"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-3 h-11 rounded-md border border-border hover:bg-foreground/5 text-sm w-fit"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {uploading ? "Przetwarzam…" : "Dodaj zdjęcia"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
