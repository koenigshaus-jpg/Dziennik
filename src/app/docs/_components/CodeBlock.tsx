"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  code: string;
  language?: string;
  /** Etykieta w pasku (np. „cURL", „JavaScript"). */
  label?: string;
}

export function CodeBlock({ code, language, label }: Props) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="group relative my-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100">
      {(label || language) && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
          <span>{label ?? language}</span>
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-1 text-xs text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-700 group-hover:opacity-100 focus:opacity-100"
        aria-label="Skopiuj"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Skopiowane" : "Kopiuj"}
      </button>
      <pre className="overflow-x-auto px-4 py-3 text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
