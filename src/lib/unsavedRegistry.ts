"use client";

export type LeaveDecision = "save" | "discard" | "cancel";

interface Entry {
  isDirty: () => boolean;
  save: () => Promise<void>;
  askLeave: () => Promise<LeaveDecision>;
}

let current: Entry | null = null;

export function registerUnsaved(entry: Entry): () => void {
  current = entry;
  return () => {
    if (current === entry) current = null;
  };
}

export async function guardLeave(): Promise<boolean> {
  if (!current || !current.isDirty()) return true;
  const decision = await current.askLeave();
  if (decision === "save") {
    try {
      await current.save();
      return true;
    } catch {
      return false;
    }
  }
  return decision === "discard";
}
