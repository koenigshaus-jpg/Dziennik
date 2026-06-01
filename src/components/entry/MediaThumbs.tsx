"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { UploadedMedia } from "./media-types";

interface Props {
  value: UploadedMedia[];
  onRemove: (id: string) => void;
}

export function MediaThumbs({ value, onRemove }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const close = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i - 1 + value.length) % value.length)),
    [value.length]
  );
  const next = useCallback(
    () => setLightboxIdx((i) => (i === null ? null : (i + 1) % value.length)),
    [value.length]
  );

  useEffect(() => {
    if (lightboxIdx === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIdx, close, prev, next]);

  if (value.length === 0) return null;
  const current = lightboxIdx !== null ? value[lightboxIdx] : null;

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {value.map((m, idx) => (
          <div
            key={m.id}
            className="relative aspect-square rounded-md overflow-hidden border border-border bg-foreground/[0.04]"
          >
            <button
              type="button"
              onClick={() => setLightboxIdx(idx)}
              aria-label="Powiększ zdjęcie"
              className="absolute inset-0 flex items-center justify-center p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.path}
                alt=""
                className="max-w-full max-h-full object-contain"
              />
            </button>
            <button
              type="button"
              onClick={() => onRemove(m.id)}
              className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black z-10"
              aria-label="Usuń zdjęcie"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-label="Podgląd zdjęcia"
          onClick={close}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.path}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {value.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Następne zdjęcie"
                className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm tabular-nums select-none"
                onClick={(e) => e.stopPropagation()}
              >
                {lightboxIdx! + 1} / {value.length}
              </div>
            </>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            aria-label="Zamknij"
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
