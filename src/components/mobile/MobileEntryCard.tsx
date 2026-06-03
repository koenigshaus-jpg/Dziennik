"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Image as ImageIcon, Mic } from "lucide-react";
import type { ClientEntry } from "@/lib/db-supabase";
import { formatTimePL } from "@/lib/dates";
import { snippet } from "@/lib/text";
import { parseMoods } from "@/lib/moods";
import { MediaThumbs } from "@/components/entry/MediaThumbs";
import { AudioList } from "@/components/entry/AudioList";
import { cn } from "@/lib/utils";

interface Props {
  entry: ClientEntry;
}

export function MobileEntryCard({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(entry.createdAt);
  const moods = parseMoods(entry.mood);
  const images = entry.media.filter((m) => m.kind === "image");
  const audios = entry.media.filter((m) => m.kind === "audio");

  return (
    <article
      onClick={() => setExpanded((v) => !v)}
      className={cn(
        "relative cursor-pointer rounded-xl border border-border bg-background px-4 py-3 transition-colors",
        expanded ? "bg-foreground/[0.02]" : "hover:bg-foreground/[0.02]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 text-xs leading-5 text-foreground/90">
          {entry.contentText && (
            <p
              className={cn(
                "whitespace-pre-wrap",
                !expanded && "line-clamp-[10]"
              )}
            >
              {expanded ? null : snippet(entry.contentText, 800)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 h-5">
          <span className="text-[10px] text-muted tabular-nums">
            {formatTimePL(date)}
          </span>
          <Link
            href={`/wpis/${entry.id}`}
            onClick={(e) => e.stopPropagation()}
            aria-label="Edytuj wpis"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {expanded && entry.contentHtml && (
        <div
          className="entry-content mt-1 text-xs leading-5"
          onClick={(e) => e.stopPropagation()}
          dangerouslySetInnerHTML={{ __html: entry.contentHtml }}
        />
      )}

      {expanded && images.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <MediaThumbs value={images} readOnly />
        </div>
      )}

      {expanded && audios.length > 0 && (
        <div className="mt-3" onClick={(e) => e.stopPropagation()}>
          <AudioList value={audios} readOnly />
        </div>
      )}

      {(moods.length > 0 ||
        images.length > 0 ||
        audios.length > 0 ||
        entry.tags.length > 0) && (
        <div className="flex items-center gap-3 mt-2 text-muted text-xs flex-wrap">
          {moods.length > 0 && (
            <span className="inline-flex items-center gap-1 text-base leading-none">
              {moods.map((m) => (
                <span key={m.key} title={m.label}>
                  {m.emoji}
                </span>
              ))}
            </span>
          )}
          {images.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" />
              {images.length}
            </span>
          )}
          {audios.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Mic className="h-3.5 w-3.5" />
              {audios.length}
            </span>
          )}
          {entry.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}
