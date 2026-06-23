"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GalleryView } from "./GalleryView";

interface GalleryContextValue {
  openGallery: () => void;
  closeGallery: () => void;
}

const GalleryContext = React.createContext<GalleryContextValue | null>(null);

export function useGallery(): GalleryContextValue {
  const ctx = React.useContext(GalleryContext);
  if (!ctx) {
    throw new Error("useGallery musi być wywołany wewnątrz <GalleryDialogProvider>");
  }
  return ctx;
}

export function GalleryDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);

  const value = React.useMemo<GalleryContextValue>(
    () => ({
      openGallery: () => setOpen(true),
      closeGallery: () => setOpen(false),
    }),
    []
  );

  return (
    <GalleryContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
          <DialogTitle className="sr-only">Galeria</DialogTitle>
          <div className="flex-1 overflow-y-auto p-6">
            <GalleryView onNavigateToEntry={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </GalleryContext.Provider>
  );
}
