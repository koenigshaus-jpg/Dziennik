"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "historyListWidth";
const MIN = 260;
const MAX = 560;
const DEFAULT = 360;

export function HistorySplit({
  list,
  preview,
}: {
  list: React.ReactNode;
  preview: React.ReactNode;
}) {
  const [width, setWidth] = useState<number>(DEFAULT);
  const [hydrated, setHydrated] = useState(false);
  const draggingRef = useRef(false);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n) && n >= MIN && n <= MAX) setWidth(n);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = Math.max(MIN, Math.min(MAX, e.clientX));
      setWidth(next);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, String(width));
  }, [width, hydrated]);

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  }

  return (
    <div className="hidden lg:flex lg:h-dvh w-full items-stretch">
      <aside
        className="flex flex-col self-stretch border-r border-border bg-background"
        style={{ width: `${width}px`, flexShrink: 0 }}
      >
        {list}
      </aside>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startDrag}
        className="group relative w-1.5 self-stretch cursor-col-resize bg-transparent hover:bg-foreground/10 transition-colors shrink-0"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-[3px] rounded-full bg-foreground/25 group-hover:bg-foreground/50 transition-colors"
        />
      </div>
      <main className="flex-1 self-stretch overflow-hidden bg-background min-w-0">
        {preview}
      </main>
    </div>
  );
}
