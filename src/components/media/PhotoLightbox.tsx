"use client";

import * as React from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

export interface PhotoLightboxItem {
  path: string;
  entryId?: string;
}

interface Props {
  items: PhotoLightboxItem[];
  index: number | null;
  onIndexChange: (i: number | null) => void;
  /** Treść renderowana pod zdjęciem (np. przycisk „Przejdź do wpisu"). */
  renderFooter?: (item: PhotoLightboxItem) => React.ReactNode;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const TOGGLE_SCALE = 2.5;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export function PhotoLightbox({
  items,
  index,
  onIndexChange,
  renderFooter,
}: Props) {
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  // Aktywne wskaźniki (pointer events) — do pan (1) i pinch (2).
  const pointersRef = React.useRef<Map<number, { x: number; y: number }>>(
    new Map()
  );
  const pinchStartRef = React.useRef<{ dist: number; scale: number } | null>(
    null
  );

  const close = React.useCallback(() => onIndexChange(null), [onIndexChange]);
  const resetZoom = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);
  const prev = React.useCallback(() => {
    onIndexChange(
      index === null ? null : (index - 1 + items.length) % items.length
    );
  }, [index, items.length, onIndexChange]);
  const next = React.useCallback(() => {
    onIndexChange(index === null ? null : (index + 1) % items.length);
  }, [index, items.length, onIndexChange]);

  // Reset zoomu przy zmianie zdjęcia.
  React.useEffect(() => {
    resetZoom();
  }, [index, resetZoom]);

  // Klawiatura + blokada scrolla body.
  React.useEffect(() => {
    if (index === null) return;
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
  }, [index, close, prev, next]);

  if (index === null) return null;
  const current = items[index];
  if (!current) return null;

  const zoomed = scale > 1;

  function toggleZoom() {
    if (zoomed) resetZoom();
    else setScale(TOGGLE_SCALE);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setScale((s) => {
      const ns = clamp(s - e.deltaY * 0.002, MIN_SCALE, MAX_SCALE);
      if (ns === 1) setOffset({ x: 0, y: 0 });
      return ns;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartRef.current = { dist, scale };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const pts = pointersRef.current;
    if (!pts.has(e.pointerId)) return;
    const prevPos = pts.get(e.pointerId)!;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 2 && pinchStartRef.current) {
      const [a, b] = [...pts.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ns = clamp(
        (dist / pinchStartRef.current.dist) * pinchStartRef.current.scale,
        MIN_SCALE,
        MAX_SCALE
      );
      setScale(ns);
      if (ns === 1) setOffset({ x: 0, y: 0 });
      return;
    }

    if (pts.size === 1 && zoomed) {
      setOffset((o) => ({
        x: o.x + (e.clientX - prevPos.x),
        y: o.y + (e.clientY - prevPos.y),
      }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchStartRef.current = null;
  }

  return (
    <div
      role="dialog"
      aria-label="Podgląd zdjęcia"
      onClick={close}
      className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center"
    >
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden p-6"
        style={{ touchAction: "none" }}
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.path}
          alt=""
          draggable={false}
          className="max-w-full max-h-full object-contain select-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: zoomed ? "grab" : "default",
            transition: pointersRef.current.size > 0 ? "none" : "transform 0.15s",
          }}
        />

        {items.length > 1 && !zoomed && (
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
          </>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleZoom();
          }}
          aria-label={zoomed ? "Pomniejsz" : "Powiększ"}
          className="absolute top-4 left-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
        </button>

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

        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm tabular-nums select-none">
            {index + 1} / {items.length}
          </div>
        )}
      </div>

      {renderFooter && (
        <div
          className="shrink-0 w-full flex items-center justify-center pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {renderFooter(current)}
        </div>
      )}
    </div>
  );
}
