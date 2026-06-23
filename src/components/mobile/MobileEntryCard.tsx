"use client";

import Link from "next/link";
import { Mic } from "lucide-react";
import type { ClientEntry } from "@/lib/db-supabase";
import { formatTimePL, toIsoLocalDate } from "@/lib/dates";
import { snippet } from "@/lib/text";
import { parseMoods } from "@/lib/moods";
import { cn } from "@/lib/utils";
import { useConversationsMeta } from "@/lib/agent/use-conversations-meta";
import { PersonaBadgeRow } from "@/components/agent/PersonaBadge";

interface Props {
  entry: ClientEntry;
  /** Czy to pierwsza karta w sekcji (bez separatora na górze). */
  first?: boolean;
}

export function MobileEntryCard({ entry, first = false }: Props) {
  const date = new Date(entry.createdAt);
  const moods = parseMoods(entry.mood);
  const images = entry.media.filter((m) => m.kind === "image");
  const audios = entry.media.filter((m) => m.kind === "audio");
  const { personasByDay } = useConversationsMeta();
  const personas = personasByDay.get(toIsoLocalDate(date)) ?? [];

  return (
    <Link
      href={`/wpis/${entry.id}`}
      className={cn(
        "block py-3 -mx-1 px-1 transition-colors hover:bg-foreground/[0.02]",
        !first && "border-t border-border"
      )}
    >
      {images.length > 0 && (
        <div className="flex flex-col gap-2 mb-2">
          {images.map((m) => (
            <div
              key={m.id}
              className="w-full overflow-hidden rounded-xl border border-border bg-foreground/[0.04]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.path}
                alt=""
                loading="lazy"
                className="w-full max-h-[70vh] object-contain"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 text-base font-medium leading-6 text-foreground/90">
          {entry.contentText && (
            <p className="whitespace-pre-wrap line-clamp-[20]">
              {snippet(entry.contentText, 1600)}
            </p>
          )}
        </div>
        <span className="text-[10px] text-muted tabular-nums shrink-0 h-5 leading-5">
          {formatTimePL(date)}
        </span>
      </div>

      {(moods.length > 0 ||
        audios.length > 0 ||
        entry.tags.length > 0 ||
        personas.length > 0) && (
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
          {audios.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Mic className="h-3.5 w-3.5" />
              {audios.length}
            </span>
          )}
          {entry.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
          {personas.length > 0 && <PersonaBadgeRow personaKeys={personas} />}
        </div>
      )}
    </Link>
  );
}
