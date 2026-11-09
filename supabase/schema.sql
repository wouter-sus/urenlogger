-- Urenlogger: database voor meerdere gebruikers.
-- Plak dit hele bestand in Supabase -> SQL Editor -> New query -> Run.
-- Veilig om opnieuw uit te voeren.

create table if not exists public.user_settings (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  rate       numeric not null default 65 check (rate > 0),
  btw        numeric not null default 21 check (btw >= 0),
  active     jsonb,                              -- lopende check-in: {"start": ms, "note": "..."}
  celebrated jsonb not null default '{}'::jsonb  -- hoogste gevierde bedrag per maand
);

create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at   timestamptz not null,
  note       text not null default '',
  created_at timestamptz not null default now(),
  check (ended_at > started_at)
);
create index if not exists entries_user_started_idx on public.entries (user_id, started_at);

create table if not exists public.costs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cost_date   date not null,
  description text not null,
  amount      numeric(10,2) not null check (amount > 0),
  created_at  timestamptz not null default now()
);
create index if not exists costs_user_date_idx on public.costs (user_id, cost_date);

-- Beveiliging: iedereen ziet en wijzigt alleen zijn eigen rijen.
alter table public.user_settings enable row level security;
alter table public.entries       enable row level security;
alter table public.costs         enable row level security;

drop policy if exists "eigen instellingen" on public.user_settings;
drop policy if exists "eigen uren"         on public.entries;
drop policy if exists "eigen kosten"       on public.costs;

create policy "eigen instellingen" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "eigen uren" on public.entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "eigen kosten" on public.costs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Niet-ingelogde bezoekers (anon) krijgen niets.
revoke all on public.user_settings, public.entries, public.costs from anon;
grant select, insert, update, delete on public.user_settings, public.entries, public.costs to authenticated;
