-- Izolacja PREV (eksperyment): osobna tabela embeddingów + marker źródła na entries.
--
-- Produkcja (main) działa BEZ ZMIAN: istniejące wiersze i nowe wpisy mają source='prod',
-- więc trigger/Edge Function dalej piszą do public.entry_embeddings, a produkcyjny RPC
-- search_entries_hybrid czyta tę samą tabelę. Wpisy tworzone przez most Strapi (ścieżka
-- eksperymentu) dostają source='prev' → Edge Function kieruje ich embeddingi do
-- public.entry_embeddings_prev, a app eksperymentu przeszukuje je przez
-- search_entries_hybrid_prev. Dzięki temu wektory PREV nie trafiają do głównej tabeli.

-- ── Marker źródła wpisu (addytywny, nie zmienia zachowania produkcji) ───────────
alter table public.entries add column if not exists source text not null default 'prod';

-- ── Osobna tabela embeddingów dla PREV (kształt jak entry_embeddings) ───────────
create table if not exists public.entry_embeddings_prev (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.entries(id) on delete cascade,
  user_id     uuid not null,
  chunk_idx   int  not null default 0,
  content     text not null,
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now(),
  unique (entry_id, chunk_idx)
);

create index if not exists entry_embeddings_prev_embedding_idx
  on public.entry_embeddings_prev using hnsw (embedding vector_cosine_ops);
create index if not exists entry_embeddings_prev_entry_id_idx
  on public.entry_embeddings_prev (entry_id);
create index if not exists entry_embeddings_prev_user_id_idx
  on public.entry_embeddings_prev (user_id);

alter table public.entry_embeddings_prev enable row level security;
drop policy if exists "own prev embeddings - select" on public.entry_embeddings_prev;
create policy "own prev embeddings - select"
  on public.entry_embeddings_prev for select
  using (auth.uid() = user_id);
-- INSERT/UPDATE tylko service-role (Edge Function) → omija RLS.

-- ── Hybrydowe wyszukiwanie dla PREV (kopia 0002, czyta entry_embeddings_prev) ────
create or replace function public.search_entries_hybrid_prev(
  filter_user_id  uuid,
  query_embedding vector(1536),
  query_text      text,
  anchor_date     date default current_date,
  match_count     int  default 30,
  recent_days     int  default 7,
  result_limit    int  default 50
) returns table (
  id uuid,
  created_at timestamptz,
  plain_text text,
  mood text,
  tags text[],
  sources text[],
  similarity float
) language sql stable security definer set search_path = public as $$
  with vec as (
    select ee.entry_id, 1 - min(ee.embedding <=> query_embedding) as sim
    from entry_embeddings_prev ee
    join entries e on e.id = ee.entry_id and e.user_id = filter_user_id
    where query_embedding is not null
    group by ee.entry_id
    order by min(ee.embedding <=> query_embedding)
    limit match_count
  ),
  q as (
    select case
      when length(trim(query_text)) > 0
        then replace(websearch_to_tsquery('simple', unaccent(query_text))::text, ' & ', ' | ')::tsquery
      else null
    end as tsq
  ),
  kw as (
    select e.id as entry_id,
           ts_rank(to_tsvector('simple', unaccent(coalesce(e.content_text,''))), q.tsq) as rank
    from entries e, q
    where e.user_id = filter_user_id
      and q.tsq is not null
      and to_tsvector('simple', unaccent(coalesce(e.content_text,''))) @@ q.tsq
    order by rank desc
    limit match_count
  ),
  recent as (
    select e.id as entry_id
    from entries e
    where e.user_id = filter_user_id
      and e.created_at >= (anchor_date - recent_days)
      and e.created_at < (anchor_date + 1)
  ),
  agg as (
    select coalesce(v.entry_id, k.entry_id, r.entry_id) as entry_id,
           coalesce(v.sim, 0)            as sim,
           (k.entry_id is not null)      as in_kw,
           (r.entry_id is not null)      as in_recent
    from vec v
    full join kw k     on k.entry_id = v.entry_id
    full join recent r on r.entry_id = coalesce(v.entry_id, k.entry_id)
  ),
  ranked as (
    select a.*,
           row_number() over (
             order by a.in_recent desc,
                      greatest(a.sim, case when a.in_kw then 0.5 else 0 end) desc
           ) as rn
    from agg a
  )
  select
    e.id,
    e.created_at,
    coalesce(e.content_text, '') as plain_text,
    e.mood,
    coalesce(
      (select array_agg(t.name order by t.name)
       from entry_tags et join tags t on t.id = et.tag_id
       where et.entry_id = e.id),
      '{}'
    ) as tags,
    array_remove(array[
      case when r.sim > 0   then 'vector'  end,
      case when r.in_kw     then 'keyword' end,
      case when r.in_recent then 'recent'  end
    ], null) as sources,
    r.sim as similarity
  from ranked r
  join entries e on e.id = r.entry_id
  where r.in_recent or r.rn <= result_limit
  order by r.in_recent desc, r.sim desc;
$$;
