"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface UploadedMedia {
  id: string;
  path: string;
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

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: UploadedMedia[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? `Nie udało się przesłać ${file.name}`);
        continue;
      }
      const data = await res.json();
      uploaded.push(data);
    }
    onChange([...value, ...uploaded]);
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
              <Image
                src={m.path}
                alt=""
                fill
                sizes="(max-width: 768px) 33vw, 200px"
                className="object-cover"
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
        {uploading ? "Przesyłam…" : "Dodaj zdjęcia"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
    </div>
  );
}
