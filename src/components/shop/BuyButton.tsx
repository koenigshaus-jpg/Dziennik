"use client";

import * as React from "react";
import { startCheckout } from "@/lib/agent/checkout";
import { cn } from "@/lib/utils";

interface Props {
  sku: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  className?: string;
}

/** Przycisk uruchamiający checkout subskrypcji dla danego SKU. */
export function BuyButton({ sku, children, variant = "primary", className }: Props) {
  const [busy, setBusy] = React.useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await startCheckout(sku);
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full text-sm font-medium transition-colors disabled:opacity-70",
        variant === "primary"
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "border border-border hover:bg-foreground/5",
        className,
      )}
    >
      {children}
    </button>
  );
}
