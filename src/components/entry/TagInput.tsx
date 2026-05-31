"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export function TagInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function addCurrent() {
    const t = normalize(draft);
    if (!t) {
      setDraft("");
      return;
    }
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrent();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 items-center border border-border rounded-md p-2 min-h-[44px]">
      {value.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-2.5 py-1 text-sm"
        >
          #{t}
          <button
            type="button"
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="opacity-60 hover:opacity-100"
            aria-label={`Usuń tag ${t}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={addCurrent}
        placeholder={value.length === 0 ? "Dodaj tag (Enter)" : ""}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
      />
    </div>
  );
}
