-- Local baseline for the public TCGround schema.
--
-- Earlier project schema changes were applied to the hosted Supabase project
-- through MCP migrations only. Local Supabase reset/push validates migration
-- files against a fresh database, so this file recreates the current baseline
-- before later additive migrations run.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.tcg_games (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  name_ko text,
  description text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tcg_games_slug_key
  on public.tcg_games (slug);
create index if not exists tcg_games_display_order_idx
  on public.tcg_games (display_order);

drop trigger if exists set_tcg_games_updated_at on public.tcg_games;
create trigger set_tcg_games_updated_at
  before update on public.tcg_games
  for each row
  execute function public.set_updated_at();

create table if not exists public.card_sets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.tcg_games(id) on delete cascade,
  slug text not null,
  name text not null,
  name_ko text,
  released_on date,
  card_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_sets_game_id_slug_key
  on public.card_sets (game_id, slug);
create index if not exists card_sets_game_id_idx
  on public.card_sets (game_id);

drop trigger if exists set_card_sets_updated_at on public.card_sets;
create trigger set_card_sets_updated_at
  before update on public.card_sets
  for each row
  execute function public.set_updated_at();

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.tcg_games(id) on delete cascade,
  set_id uuid references public.card_sets(id) on delete set null,
  slug text not null,
  name text not null,
  normalized_name text not null,
  collector_number text,
  rarity text,
  condition_label text,
  image_url text,
  thumbnail_url text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cards_slug_key
  on public.cards (slug);
create index if not exists cards_game_id_idx
  on public.cards (game_id);
create index if not exists cards_set_id_idx
  on public.cards (set_id);
create index if not exists cards_normalized_name_idx
  on public.cards (normalized_name);
create index if not exists cards_is_featured_idx
  on public.cards (is_featured);

drop trigger if exists set_cards_updated_at on public.cards;
create trigger set_cards_updated_at
  before update on public.cards
  for each row
  execute function public.set_updated_at();

create table if not exists public.card_printings (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  language text not null,
  region text not null,
  set_name text not null,
  set_code text not null,
  collector_number text not null,
  rarity text,
  finish text not null default 'unknown',
  image_url text,
  external_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_printings_card_language_region_set_number_finish_key
  on public.card_printings (card_id, language, region, set_code, collector_number, finish);
create index if not exists card_printings_card_id_idx
  on public.card_printings (card_id);
create index if not exists card_printings_language_region_idx
  on public.card_printings (language, region);
create index if not exists card_printings_set_code_collector_number_idx
  on public.card_printings (set_code, collector_number);
create index if not exists card_printings_external_ids_idx
  on public.card_printings using gin (external_ids);

drop trigger if exists set_card_printings_updated_at on public.card_printings;
create trigger set_card_printings_updated_at
  before update on public.card_printings
  for each row
  execute function public.set_updated_at();

create table if not exists public.card_categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.tcg_games(id) on delete cascade,
  parent_id uuid references public.card_categories(id) on delete set null,
  type text not null,
  slug text not null,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_categories_type_slug_key
  on public.card_categories (type, slug);
create index if not exists card_categories_parent_id_idx
  on public.card_categories (parent_id);
create index if not exists card_categories_game_id_idx
  on public.card_categories (game_id);
create index if not exists card_categories_display_order_idx
  on public.card_categories (display_order);

drop trigger if exists set_card_categories_updated_at on public.card_categories;
create trigger set_card_categories_updated_at
  before update on public.card_categories
  for each row
  execute function public.set_updated_at();

create table if not exists public.card_category_links (
  card_id uuid not null references public.cards(id) on delete cascade,
  category_id uuid not null references public.card_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, category_id)
);

create index if not exists card_category_links_category_id_idx
  on public.card_category_links (category_id);

create table if not exists public.card_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  card_printing_id uuid not null references public.card_printings(id) on delete cascade,
  snapshot_date date not null,
  currency text not null default 'KRW',
  market text not null default 'KR',
  variant text not null default 'raw',
  condition_label text,
  grade_company text,
  grade_value text,
  avg_price numeric(14, 2),
  min_price numeric(14, 2),
  max_price numeric(14, 2),
  sample_count integer not null default 0,
  source_name text not null default 'aggregate',
  source_url text,
  aggregation_method text not null default 'median_filtered',
  created_at timestamptz not null default now()
);

create unique index if not exists card_price_snapshots_unique_idx
  on public.card_price_snapshots (
    card_printing_id,
    snapshot_date,
    market,
    currency,
    variant,
    condition_label,
    grade_company,
    grade_value,
    source_name
  ) nulls not distinct;
create index if not exists card_price_snapshots_card_printing_date_idx
  on public.card_price_snapshots (card_printing_id, snapshot_date desc);
create index if not exists card_price_snapshots_market_date_idx
  on public.card_price_snapshots (market, snapshot_date desc);

create table if not exists public.price_observations (
  id uuid primary key default gen_random_uuid(),
  card_printing_id uuid not null references public.card_printings(id) on delete cascade,
  source_name text not null,
  market text not null,
  currency text not null,
  sold_price numeric(14, 2) not null,
  sold_at timestamptz not null,
  observed_at timestamptz not null default now(),
  condition_label text,
  grade_company text,
  grade_value text,
  variant text not null default 'raw',
  listing_title text,
  source_url text,
  source_item_id text,
  confidence_score numeric(4, 3) not null default 0.5 check (
    confidence_score >= 0
    and confidence_score <= 1
  ),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists price_observations_card_printing_sold_at_idx
  on public.price_observations (card_printing_id, sold_at desc);
create index if not exists price_observations_source_market_sold_at_idx
  on public.price_observations (source_name, market, sold_at desc);
create index if not exists price_observations_variant_condition_grade_idx
  on public.price_observations (variant, condition_label, grade_company, grade_value);

create table if not exists public.price_collection_runs (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  market text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  observations_inserted integer not null default 0,
  snapshots_created integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists price_collection_runs_source_market_started_idx
  on public.price_collection_runs (source_name, market, started_at desc);
create index if not exists price_collection_runs_status_started_idx
  on public.price_collection_runs (status, started_at desc);

create table if not exists public.favorite_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists favorite_cards_user_id_card_id_key
  on public.favorite_cards (user_id, card_id);
create index if not exists favorite_cards_card_id_idx
  on public.favorite_cards (card_id);

create table if not exists public.card_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  score smallint not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists card_ratings_user_id_card_id_key
  on public.card_ratings (user_id, card_id);
create index if not exists card_ratings_card_id_idx
  on public.card_ratings (card_id);

drop trigger if exists set_card_ratings_updated_at on public.card_ratings;
create trigger set_card_ratings_updated_at
  before update on public.card_ratings
  for each row
  execute function public.set_updated_at();

create or replace function public.get_card_rating_summary(p_card_id uuid)
returns table (
  average_score numeric,
  rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    avg(card_ratings.score)::numeric as average_score,
    count(*)::integer as rating_count
  from public.card_ratings
  where card_ratings.card_id = p_card_id;
$$;

alter table public.tcg_games enable row level security;
alter table public.card_sets enable row level security;
alter table public.cards enable row level security;
alter table public.card_printings enable row level security;
alter table public.card_categories enable row level security;
alter table public.card_category_links enable row level security;
alter table public.card_price_snapshots enable row level security;
alter table public.price_observations enable row level security;
alter table public.price_collection_runs enable row level security;
alter table public.favorite_cards enable row level security;
alter table public.card_ratings enable row level security;

drop policy if exists "tcg games are publicly readable" on public.tcg_games;
create policy "tcg games are publicly readable"
  on public.tcg_games
  for select
  using (true);

drop policy if exists "card sets are publicly readable" on public.card_sets;
create policy "card sets are publicly readable"
  on public.card_sets
  for select
  using (true);

drop policy if exists "cards are publicly readable" on public.cards;
create policy "cards are publicly readable"
  on public.cards
  for select
  using (true);

drop policy if exists "card printings are publicly readable" on public.card_printings;
create policy "card printings are publicly readable"
  on public.card_printings
  for select
  using (true);

drop policy if exists "card categories are publicly readable" on public.card_categories;
create policy "card categories are publicly readable"
  on public.card_categories
  for select
  using (true);

drop policy if exists "card category links are publicly readable" on public.card_category_links;
create policy "card category links are publicly readable"
  on public.card_category_links
  for select
  using (true);

drop policy if exists "card price snapshots are publicly readable" on public.card_price_snapshots;
create policy "card price snapshots are publicly readable"
  on public.card_price_snapshots
  for select
  using (true);

drop policy if exists "favorite cards are readable by owner" on public.favorite_cards;
create policy "favorite cards are readable by owner"
  on public.favorite_cards
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "favorite cards are insertable by owner" on public.favorite_cards;
create policy "favorite cards are insertable by owner"
  on public.favorite_cards
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "favorite cards are deletable by owner" on public.favorite_cards;
create policy "favorite cards are deletable by owner"
  on public.favorite_cards
  for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "card ratings are readable by owner" on public.card_ratings;
create policy "card ratings are readable by owner"
  on public.card_ratings
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "card ratings are insertable by owner" on public.card_ratings;
create policy "card ratings are insertable by owner"
  on public.card_ratings
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "card ratings are updatable by owner" on public.card_ratings;
create policy "card ratings are updatable by owner"
  on public.card_ratings
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "card ratings are deletable by owner" on public.card_ratings;
create policy "card ratings are deletable by owner"
  on public.card_ratings
  for delete
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select on
  public.tcg_games,
  public.card_sets,
  public.cards,
  public.card_printings,
  public.card_categories,
  public.card_category_links,
  public.card_price_snapshots
to anon, authenticated;

grant select, insert, delete on public.favorite_cards to authenticated;
grant select, insert, update, delete on public.card_ratings to authenticated;
grant execute on function public.get_card_rating_summary(uuid) to anon, authenticated;
