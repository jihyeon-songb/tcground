-- Price alerts: per-printing target price watches, evaluated by the daily
-- collection batch. Notifications: in-app ledger (also the record that an
-- email was attempted).

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_printing_id uuid not null references public.card_printings(id) on delete cascade,
  currency text not null,
  grade_label text,
  direction text not null check (direction in ('below', 'above')),
  threshold numeric(14, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  fired_at timestamptz
);

-- One active alert per (user, printing, direction). Re-arming replaces it.
create unique index if not exists price_alerts_active_unique_idx
  on public.price_alerts (user_id, card_printing_id, direction)
  where is_active;
create index if not exists price_alerts_active_scan_idx
  on public.price_alerts (card_printing_id)
  where is_active;
create index if not exists price_alerts_user_idx
  on public.price_alerts (user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alert_id uuid references public.price_alerts(id) on delete set null,
  title text not null,
  body text not null,
  card_printing_id uuid references public.card_printings(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at);

alter table public.price_alerts enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "price alerts readable by owner" on public.price_alerts;
create policy "price alerts readable by owner"
  on public.price_alerts for select
  using ((select auth.uid()) = user_id);

drop policy if exists "price alerts insertable by owner" on public.price_alerts;
create policy "price alerts insertable by owner"
  on public.price_alerts for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "price alerts updatable by owner" on public.price_alerts;
create policy "price alerts updatable by owner"
  on public.price_alerts for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "price alerts deletable by owner" on public.price_alerts;
create policy "price alerts deletable by owner"
  on public.price_alerts for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications readable by owner" on public.notifications;
create policy "notifications readable by owner"
  on public.notifications for select
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications updatable by owner" on public.notifications;
create policy "notifications updatable by owner"
  on public.notifications for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.price_alerts to authenticated;
grant select, update on public.notifications to authenticated;

-- Batch (service_role) evaluates alerts and writes notifications.
grant select, update on public.price_alerts to service_role;
grant insert on public.notifications to service_role;
