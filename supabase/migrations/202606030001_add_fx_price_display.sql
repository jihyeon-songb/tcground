-- 4.20 price-data FX model.
-- Adds exchange-rate storage and optional display-price fields while preserving
-- source currency/amount on observations and snapshots.

create table if not exists public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  base_currency text not null,
  quote_currency text not null default 'KRW',
  rate numeric(18, 8) not null check (rate > 0),
  rate_date date not null,
  provider text not null,
  fetched_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (base_currency, quote_currency, rate_date, provider)
);

create index if not exists exchange_rates_lookup_idx
  on public.exchange_rates (base_currency, quote_currency, rate_date desc);

alter table public.exchange_rates enable row level security;

drop policy if exists "exchange rates are publicly readable" on public.exchange_rates;
create policy "exchange rates are publicly readable"
  on public.exchange_rates
  for select
  using (true);

alter table public.card_price_snapshots
  add column if not exists source_currency text,
  add column if not exists source_avg_price numeric(14, 2),
  add column if not exists source_min_price numeric(14, 2),
  add column if not exists source_max_price numeric(14, 2),
  add column if not exists display_currency text,
  add column if not exists display_avg_price numeric(14, 2),
  add column if not exists display_min_price numeric(14, 2),
  add column if not exists display_max_price numeric(14, 2),
  add column if not exists fx_rate numeric(18, 8),
  add column if not exists fx_rate_date date,
  add column if not exists fx_provider text;

update public.card_price_snapshots
set
  source_currency = coalesce(source_currency, currency),
  source_avg_price = coalesce(source_avg_price, avg_price),
  source_min_price = coalesce(source_min_price, min_price),
  source_max_price = coalesce(source_max_price, max_price),
  display_currency = coalesce(display_currency, currency),
  display_avg_price = coalesce(display_avg_price, avg_price),
  display_min_price = coalesce(display_min_price, min_price),
  display_max_price = coalesce(display_max_price, max_price)
where source_currency is null
   or display_currency is null;

create index if not exists card_price_snapshots_display_currency_date_idx
  on public.card_price_snapshots (display_currency, snapshot_date desc);

-- Older price migrations treated `source_item_id` as globally unique per
-- source. Some manual evidence sources use a product id rather than a trade id
-- (e.g. KREAM product with multiple grade options), so uniqueness needs the
-- observed transaction bucket as well.
drop index if exists public.price_observations_source_item_unique_idx;

create unique index if not exists price_observations_source_item_bucket_unique_idx
  on public.price_observations (
    source_name,
    source_item_id,
    sold_at,
    sold_price,
    variant,
    coalesce(grade_company, ''),
    coalesce(grade_value, '')
  )
  where source_item_id is not null;

drop index if exists public.price_observations_source_url_unique_idx;

create unique index if not exists price_observations_source_url_bucket_unique_idx
  on public.price_observations (
    source_name,
    source_url,
    sold_at,
    sold_price,
    variant,
    coalesce(grade_company, ''),
    coalesce(grade_value, '')
  )
  where source_url is not null;
