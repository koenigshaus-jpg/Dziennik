-- Hardening dostępu do danych: jawne, wersjonowane RLS na tabelach bazowych
-- (entries/tags/entry_tags/media), polityki Storage dla bucketu `media`
-- oraz odebranie EXECUTE na search_entries_hybrid rolom klienckim.
--
-- Idempotentne: enable RLS jest no-opem gdy już włączone, polityki tworzymy
-- przez drop-if-exists + create. Bezpieczne do wielokrotnego uruchomienia.

-- ── entries ──────────────────────────────────────────────────────────────────
alter table public.entries enable row level security;

drop policy if exists "entries - own select" on public.entries;
create policy "entries - own select" on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists "entries - own insert" on public.entries;
create policy "entries - own insert" on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "entries - own update" on public.entries;
create policy "entries - own update" on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "entries - own delete" on public.entries;
create policy "entries - own delete" on public.entries
  for delete using (auth.uid() = user_id);

-- ── tags ─────────────────────────────────────────────────────────────────────
alter table public.tags enable row level security;

drop policy if exists "tags - own all" on public.tags;
create policy "tags - own all" on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── entry_tags (brak własnego user_id → kontrola przez wpis-rodzica) ──────────
alter table public.entry_tags enable row level security;

drop policy if exists "entry_tags - via owning entry" on public.entry_tags;
create policy "entry_tags - via owning entry" on public.entry_tags
  for all
  using (
    exists (
      select 1 from public.entries e
      where e.id = entry_tags.entry_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.entries e
      where e.id = entry_tags.entry_id and e.user_id = auth.uid()
    )
  );

-- ── media ────────────────────────────────────────────────────────────────────
alter table public.media enable row level security;

drop policy if exists "media - own all" on public.media;
create policy "media - own all" on public.media
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage: bucket `media`, klucz = {userId}/{entryId}/{mediaId}.ext ─────────
-- Dostęp tylko do własnego folderu (pierwszy segment ścieżki = auth.uid()).
drop policy if exists "media bucket - own select" on storage.objects;
create policy "media bucket - own select" on storage.objects
  for select using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media bucket - own insert" on storage.objects;
create policy "media bucket - own insert" on storage.objects
  for insert with check (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media bucket - own update" on storage.objects;
create policy "media bucket - own update" on storage.objects
  for update using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media bucket - own delete" on storage.objects;
create policy "media bucket - own delete" on storage.objects
  for delete using (
    bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── RPC: search_entries_hybrid jest SECURITY DEFINER i przyjmuje filter_user_id.
-- Tylko serwer (service_role / admin-client) ma prawo ją wołać — odbieramy
-- EXECUTE rolom klienckim, żeby nie dało się podać cudzego user_id z przeglądarki.
revoke execute on function public.search_entries_hybrid(
  uuid, vector, text, date, int, int, int
) from anon, authenticated, public;
