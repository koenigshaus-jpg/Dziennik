-- Uprawnienia do płatnych person (konsultantów). Źródło prawdy o tym, co
-- użytkownik ma odblokowane. Zapisywane przez webhook Stripe (service_role);
-- klient tylko czyta własne wiersze (RLS).
--
-- sku: persona_key (np. "careerCoach") LUB "all" (pakiet — wszystkie obecne i
-- przyszłe persony). Darmowy "advisor" NIE jest tu trzymany — zawsze dostępny
-- po stronie kodu.
--
-- Idempotentne: bezpieczne do wielokrotnego uruchomienia.

create table if not exists public.entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,                       -- persona_key | 'all'
  status text not null default 'active',   -- active | canceled | past_due
  current_period_end timestamptz,          -- koniec opłaconego okresu (subskrypcja roczna)
  stripe_subscription_id text,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, sku)
);

create index if not exists entitlements_user_idx on public.entitlements(user_id);

alter table public.entitlements enable row level security;

-- Klient: tylko odczyt własnych uprawnień. Zapis wyłącznie przez service_role
-- (webhook Stripe), który omija RLS — brak polityk insert/update/delete celowo.
drop policy if exists "entitlements - own select" on public.entitlements;
create policy "entitlements - own select" on public.entitlements
  for select using (auth.uid() = user_id);
