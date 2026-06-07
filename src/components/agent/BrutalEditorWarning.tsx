"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  hasSeenBrutalWarning,
  markBrutalWarningSeen,
} from "@/lib/agent/client-state";

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BrutalEditorWarning({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Brutalny redaktor</DialogTitle>
          <DialogDescription>
            Ten wariant jest celowo bezpardonowy w krytyce. Wybierając go,
            zgadzasz się na ostry, bezceregielny feedback dotyczący twojego
            pisania i myślenia. Atakuje tekst — nigdy osobę.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-row justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} className="rounded-full">
            Wybierz inny
          </Button>
          <Button
            onClick={() => {
              markBrutalWarningSeen();
              onConfirm();
            }}
            className="rounded-full"
          >
            Rozumiem, włącz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { hasSeenBrutalWarning };
