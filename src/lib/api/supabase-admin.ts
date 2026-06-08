// Service-role / secret-key client. Używany WYŁĄCZNIE w server-side route'ach
// (/api/v1/*, /api/internal/*) gdzie auth jest sprawdzony osobno (API key lub
// Supabase JWT z `getApiUser`). Bypassuje RLS — każde zapytanie MUSI mieć
// explicit filtr `.eq("user_id", userId)` żeby nie wycieknąć cudzych danych.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const secret = process.env.SUPABASE_SECRET_KEY!;

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL nie jest ustawione.");
  if (!secret) throw new Error("SUPABASE_SECRET_KEY nie jest ustawione.");
  if (!cached) {
    cached = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
