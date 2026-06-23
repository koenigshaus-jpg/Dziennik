-- Wyszukiwanie hybrydowe: wektorowe (entry_embeddings) + relacyjne (full-text simple+unaccent)
-- + zawsze ostatnie `recent_days` względem `anchor_date`. Deduplikacja, twardy limit `result_limit`
-- (wpisy z ostatnich dni zawsze zachowane). security definer + jawny filter_user_id → działa
-- identycznie z klienta admin (API/MCP) i z sesji usera (app).

create extension if not exists unaccent;

create or replace function public.search_entries_hybrid(
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
  with vec as (   -- najbliższy chunk na wpis (przy chunkowaniu bierzemy min dystans)
    select ee.entry_id, 1 - min(ee.embedding <=> query_embedding) as sim
    from entry_embeddings ee
    join entries e on e.id = ee.entry_id and e.user_id = filter_user_id
    where query_embedding is not null
    group by ee.entry_id
    order by min(ee.embedding <=> query_embedding)
    limit match_count
  ),
  -- Konwersacyjne pytanie = całe zdanie. websearch_to_tsquery łączy słowa przez AND,
  -- więc prawie nic nie trafia. Bierzemy bezpiecznie zsanityzowany tsquery z websearch
  -- i zamieniamy '&' → '|' (OR): wpis pasuje gdy zawiera DOWOLNE ze słów zapytania.
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
  where r.in_recent or r.rn <= result_limit   -- recent zawsze; reszta do limitu trafności
  order by r.in_recent desc, r.sim desc;
$$;
