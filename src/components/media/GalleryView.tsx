"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoLightbox } from "@/components/media/PhotoLightbox";
import { listAllImages, type GalleryImage } from "@/lib/db-supabase";
import { formatMonthYearPL } from "@/lib/dates";

interface Props {
  /** Wywoływane po przejściu do wpisu — pozwala zamknąć popup na desktopie. */
  onNavigateToEntry?: () => void;
  /** Gdy podane, w nagłówku pojawia się strzałka powrotu (widok pełnostronicowy). */
  onBack?: () => void;
}

export function GalleryView({ onNavigateToEntry, onBack }: Props) {
  const router = useRouter();
  const [images, setImages] = useState<GalleryImage[] | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const imgs = await listAllImages();
        if (!cancelled) setImages(imgs);
      } catch (e) {
        console.error(e);
        if (!cancelled) setImages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    const refetch = () => setReloadKey((k) => k + 1);
    window.addEventListener("entries-changed", refetch);
    window.addEventListener("focus", refetch);
    return () => {
      window.removeEventListener("entries-changed", refetch);
      window.removeEventListener("focus", refetch);
    };
  }, []);

  // Grupowanie po miesiącu (zachowując kolejność malejącą flat listy).
  const groups = useMemo(() => {
    if (!images) return [];
    const out: { label: string; items: { image: GalleryImage; idx: number }[] }[] =
      [];
    images.forEach((image, idx) => {
      const label = formatMonthYearPL(new Date(image.createdAt));
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push({ image, idx });
      else out.push({ label, items: [{ image, idx }] });
    });
    return out;
  }, [images]);

  const goToEntry = useCallback(
    (entryId?: string) => {
      if (!entryId) return;
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      router.push(isDesktop ? `/?id=${entryId}` : `/wpis/${entryId}`);
      onNavigateToEntry?.();
    },
    [router, onNavigateToEntry]
  );

  const loading = images === null;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Wróć"
              className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <h1 className="font-display text-2xl font-bold tracking-tight">Galeria</h1>
        </div>
        {images && images.length > 0 && (
          <span className="text-xs text-muted">
            {images.length}{" "}
            {images.length === 1
              ? "zdjęcie"
              : images.length >= 2 && images.length <= 4
              ? "zdjęcia"
              : "zdjęć"}
          </span>
        )}
      </div>

      {loading ? (
        <p className="py-16 text-center text-muted">Wczytuję zdjęcia…</p>
      ) : images!.length === 0 ? (
        <p className="py-16 text-center text-muted">Brak zdjęć.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="text-xs uppercase tracking-wider text-muted mb-2">
                {group.label}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1">
                {group.items.map(({ image, idx }) => (
                  <button
                    key={image.mediaId}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    aria-label="Powiększ zdjęcie"
                    className="relative aspect-square overflow-hidden rounded-md border border-border bg-foreground/[0.04]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.path}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {images && (
        <PhotoLightbox
          items={images.map((i) => ({ path: i.path, entryId: i.entryId }))}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          renderFooter={(item) => (
            <Button
              variant="outline"
              onClick={() => goToEntry(item.entryId)}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            >
              Przejdź do wpisu
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        />
      )}
    </>
  );
}
