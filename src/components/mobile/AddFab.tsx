"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createEntry } from "@/lib/db-supabase";
import { parseIsoLocalDate, isSameLocalDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface Props {
  selectedDay: string;
}

function createdAtForDay(iso: string): Date {
  const day = parseIsoLocalDate(iso);
  if (!day) return new Date();
  if (isSameLocalDay(day, new Date())) return new Date();
  day.setHours(12, 0, 0, 0);
  return day;
}

export function AddFab({ selectedDay }: Props) {
  const router = useRouter();
  const [creating, setCreating] = React.useState(false);

  const handleClick = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const id = await createEntry({
        contentHtml: "",
        mood: null,
        createdAt: createdAtForDay(selectedDay),
        tags: [],
        media: [],
      });
      router.push(`/wpis/${id}`);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Nie udało się utworzyć wpisu."
      );
      setCreating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={creating}
      aria-label="Dodaj wpis ręcznie"
      className={cn(
        "lg:hidden fixed right-[5.25rem] bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-40",
        "inline-flex h-14 w-14 items-center justify-center rounded-full",
        "shadow-[var(--elevation-2)] transition-transform",
        "bg-background text-foreground border border-border hover:scale-105 active:scale-95",
        creating && "opacity-70 cursor-not-allowed"
      )}
    >
      {creating ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Plus className="h-6 w-6" />
      )}
    </button>
  );
}
