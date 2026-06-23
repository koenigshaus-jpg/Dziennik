-- Zabezpieczenie publicznej Edge Function `embed-entry` współdzielonym sekretem.
-- Trigger dosyła nagłówek `x-embed-secret`, a funkcja brzegowa odrzuca żądania
-- bez właściwego sekretu (gdy ustawiono `EMBED_WEBHOOK_SECRET`).
--
-- UWAGA: na Supabase NIE da się użyć `alter database ... set app.embed_secret`
-- (brak superusera w SQL Editorze → ERROR 42501). Dlatego sekret jest wpisany
-- wprost w treść funkcji `security definer` (źródło niewidoczne przez API).
--
-- AKTYWACJA:
--   1) wygeneruj sekret:  openssl rand -hex 32
--   2) podstaw go niżej w miejsce __EMBED_SECRET__ (NIE commituj prawdziwej wartości),
--   3) w projekcie:  Edge Functions → Secrets → EMBED_WEBHOOK_SECRET = <ten sam sekret>
--   4) redeploy:     supabase functions deploy embed-entry --no-verify-jwt
-- Dopóki EMBED_WEBHOOK_SECRET nie jest ustawiony w funkcji, nic nie jest egzekwowane,
-- więc kolejność (najpierw ta migracja, na końcu deploy) nie przerywa embeddingu.

create or replace function public.tg_embed_entry()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'UPDATE' and new.content_text is not distinct from old.content_text) then
    return new;
  end if;

  perform net.http_post(
    url     := 'https://jtbfsqpwbtljuifbcdpl.supabase.co/functions/v1/embed-entry',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-embed-secret', '__EMBED_SECRET__'
    ),
    body    := jsonb_build_object(
      'type', tg_op,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end $$;
