// Persystencja rozmów asystenta dla /api/v1/chat. Mirror tego co siedzi
// w IndexedDB klienta — ale po stronie Supabase, scoped per user.

import { getSupabaseAdmin } from "./supabase-admin";
import { ApiError } from "./handler";

export interface ConversationRow {
  id: string;
  user_id: string;
  persona_key: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function createConversation(
  userId: string,
  personaKey: string
): Promise<ConversationRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .insert({ user_id: userId, persona_key: personaKey })
    .select("*")
    .single();
  if (error) throw new ApiError("conversation_create_failed", 500, error.message);
  return data as ConversationRow;
}

export async function getConversation(
  userId: string,
  id: string
): Promise<ConversationRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new ApiError("conversation_get_failed", 500, error.message);
  if (!data) throw new ApiError("not_found", 404);
  return data as ConversationRow;
}

export async function listConversations(
  userId: string,
  limit = 50
): Promise<ConversationRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(Math.min(limit, 200));
  if (error) throw new ApiError("conversations_list_failed", 500, error.message);
  return (data ?? []) as ConversationRow[];
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("assistant_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new ApiError("messages_list_failed", 500, error.message);
  return (data ?? []) as MessageRow[];
}

export async function appendMessages(
  conversationId: string,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<MessageRow[]> {
  const supabase = getSupabaseAdmin();
  const rows = messages.map((m) => ({ ...m, conversation_id: conversationId }));
  const { data, error } = await supabase
    .from("assistant_messages")
    .insert(rows)
    .select("*");
  if (error) throw new ApiError("messages_append_failed", 500, error.message);
  // Bump updated_at
  await supabase
    .from("assistant_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return (data ?? []) as MessageRow[];
}

export async function deleteConversation(userId: string, id: string): Promise<void> {
  await getConversation(userId, id); // own + exists check
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("assistant_conversations")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new ApiError("conversation_delete_failed", 500, error.message);
}

// — — — user_settings (last persona) — — —

export async function getLastPersona(userId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("user_settings")
    .select("last_persona_key")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.last_persona_key ?? null;
}

export async function setLastPersona(userId: string, personaKey: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, last_persona_key: personaKey, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

export async function setConversationTitle(id: string, title: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("assistant_conversations").update({ title }).eq("id", id);
}
