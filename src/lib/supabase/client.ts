"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (!cached) {
    cached = createBrowserClient(url, key);
  }
  return cached;
}
