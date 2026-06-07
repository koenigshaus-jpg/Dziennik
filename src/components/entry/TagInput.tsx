"use client";

import * as React from "react";
import { X, Plus } from "lucide-react";
import { listAllTagsWithCount } from "@/lib/db-supabase";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

const MAX_SUGGESTIONS = 20;

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export function TagInput({ value, onChange }: Props) {
  const [draft, setDraft] = React.useState("");
  const [allTags, setAllTags] = React.useState<
    { name: string; count: number }[]
  >([]);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const ts = await listAllTagsWithCount();
        if (!cancelled) setAllTags(ts);
      } catch (e) {
        console.error("TagInput: cannot load tags", e);
      }
    };
    void load();
    const onChanged = () => void load();
    window.addEventListener("entries-changed", onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener("entries-changed", onChanged);
    };
  }, []);

  function addCurrent() {
    const t = normalize(draft);
    if (!t) {
      setDraft("");
      return;
    }
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  }

  function addOne(name: string) {
    if (!value.includes(name)) onChange([...value, name]);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrent();
    } else if (e.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  // Sugestie: top 20 najczęściej używanych, bez tych już wybranych,
  // przefiltrowane przez aktualny draft (jeśli coś wpisano).
  const suggestions = React.useMemo(() => {
    const selected = new Set(value);
    const draftN = normalize(draft);
    return allTags
      .filter((t) => !selected.has(t.name))
      .filter((t) => (draftN ? t.name.includes(draftN) : true))
      .slice(0, MAX_SUGGESTIONS);
  }, [allTags, value, draft]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center border border-border rounded-md p-2 min-h-11">
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
          className="flex-1 min-w-32 bg-transparent outline-none text-sm py-1"
        />
      </div>

      {suggestions.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted mb-2 px-0.5">
            {draft ? "Pasujące tagi" : "Twoje tagi"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((t) => (
              <button
                key={t.name}
                type="button"
                onClick={() => addOne(t.name)}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-border text-sm text-foreground/85 hover:bg-foreground/5 transition-colors"
              >
                <Plus className="h-3 w-3 opacity-60" />
                #{t.name}
                <span className="text-[10px] text-muted ml-0.5">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
