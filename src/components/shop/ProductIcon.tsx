"use client";

import * as React from "react";
import * as LucideIcons from "lucide-react";
import { Sparkles } from "lucide-react";

/** Renderuje ikonę lucide po nazwie (z meta persona_icon). Fallback: Sparkles. */
export function ProductIcon({
  name,
  className,
}: {
  name?: string;
  className?: string;
}) {
  const lib = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string }>
  >;
  const Icon = (name && lib[name]) || Sparkles;
  return <Icon className={className} />;
}
