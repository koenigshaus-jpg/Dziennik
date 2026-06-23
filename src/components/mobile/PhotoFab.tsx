"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createEntry, newId, type ClientMedia } from "@/lib/db-supabase";
import { createdAtForDay } from "@/lib/dates";
import { compressImage } from "@/lib/clientImage";
import { blobToDataUrl } from "@/lib/clientMedia";
import { cn } from "@/lib/utils";

interface Props {
  selectedDay: string;
}

export function PhotoFab({ selectedDay }: Props) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCreating(true);
    try {
      const media: ClientMedia[] = [];
      for (const original of Array.from(files)) {
        try {
          const compressed = await compressImage(original);
          const dataUrl = await blobToDataUrl(compressed);
          media.push({
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
      if (media.length === 0) {
        setCreating(false);
        return;
      }
      const id = await createEntry({
        contentHtml: "",
        mood: null,
        createdAt: createdAtForDay(selectedDay),
        tags: [],
        media,
      });
      router.push(`/wpis/${id}`);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Nie udało się utworzyć wpisu."
      );
      setCreating(false);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => !creating && inputRef.current?.click()}
        disabled={creating}
        aria-label="Dodaj wpis ze zdjęciem"
        className={cn(
          "lg:hidden fixed left-4 bottom-[calc(var(--composer-h,5rem)+0.75rem)] z-40",
          "inline-flex h-14 w-14 items-center justify-center rounded-full",
          "shadow-[var(--elevation-2)] transition-transform",
          "bg-background text-foreground border border-border hover:scale-105 active:scale-95",
          creating && "opacity-70 cursor-not-allowed"
        )}
      >
        {creating ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-6 w-6" />
        )}
      </button>
    </>
  );
}
