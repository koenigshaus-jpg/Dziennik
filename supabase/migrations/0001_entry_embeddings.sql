-- Wektoryzacja wpisów: tabela embeddingów + auto-wektoryzacja przez trigger (pg_net → Edge Function).
-- Model: OpenAI text-embedding-3-small (1536 wymiarów). 1 wpis = 1 wektor (chunk_idx=0);
-- przy bardzo długich wpisach Edge Function/backfill mogą wstawić więcej chunków (chunk_idx>0).

create extension if not exists vector;
create extension if not exists pg_net;

-- ── Tabela embeddingów ────────────────────────────────────────────────────────
create table if not exists public.entry_embeddings (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries(id) on delete cascade,
  user_id     uuid not null,
  chunk_idx   int  not null default 0,
  content     text not null,            -- dokładny tekst, który zwektoryzowano
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now(),
  unique (entry_id, chunk_idx)
);

create index if not exists entry_embeddings_embedding_idx
  on public.entry_embeddings using hnsw (embedding vector_cosine_ops);
create index if not exists entry_embeddings_entry_id_idx
  on public.entry_embeddings (entry_id);
create index if not exists entry_embeddings_user_id_idx
  on public.entry_embeddings (user_id);

alter table public.entry_embeddings enable row level security;

-- Użytkownik czyta tylko swoje embeddingi (parytet z politykami entries).
drop policy if exists "own embeddings - select" on public.entry_embeddings;
create policy "own embeddings - select"
  on public.entry_embeddings for select
  using (auth.uid() = user_id);
-- INSERT/UPDATE wykonuje wyłącznie service-role (Edge Function + backfill) → omija RLS.

-- ── Semantyczne wyszukiwanie ──────────────────────────────────────────────────
-- security invoker → RLS na entry_embeddings sam ogranicza wynik do wpisów usera.
create or replace function public.match_entries(
  query_embedding vector(1536),
  match_count int default 10
) returns table (entry_id uuid, content text, similarity float)
language sql stable security invoker as $$
  select e.entry_id, e.content, 1 - (e.embedding <=> query_embedding) as similarity
  from public.entry_embeddings e
  order by e.embedding <=> query_embedding
  limit match_count;
$$;

-- ── Auto-wektoryzacja: trigger na entries → Edge Function embed-entry ──────────
-- pg_net jest fire-and-forget; Edge Function liczy embedding i upsertuje do
-- entry_embeddings własnym service-role. Edge Function wdrożona z verify_jwt=false,
-- więc trigger nie musi przesyłać nagłówka Authorization.
create or replace function public.tg_embed_entry()
returns trigger language plpgsql security definer as $$
begin
  -- UPDATE bez zmiany treści (np. tylko mood) nie wymaga ponownego liczenia.
  if (tg_op = 'UPDATE' and new.content_text is not distinct from old.content_text) then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://jtbfsqpwbtljuifbcdpl.supabase.co/functions/v1/embed-entry',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end $$;

drop trigger if exists embed_entry_on_write on public.entries;
create trigger embed_entry_on_write
  after insert or update of content_text on public.entries
  for each row execute function public.tg_embed_entry();
