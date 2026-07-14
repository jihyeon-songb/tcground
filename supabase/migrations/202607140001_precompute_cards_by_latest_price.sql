-- Precompute the "추천순" ranking.
--
-- get_cards_by_latest_price() aggregated the full raw-KRW snapshot set (111k+ rows,
-- 99.8% of the table) with a distinct-on across a two-table join on EVERY call —
-- ~2s warm and growing with the table. On prod that tripped the anon role's 3s
-- statement_timeout: the RPC errored, the catalog's best-sort silently fell back to
-- slug order, and unstable_cache then persisted that wrong order across deploys.
-- Local dev connects as a role without the 3s cap, so it never saw the timeout.
--
-- Precomputing collapses the per-request cost to a tiny indexed read of ~3.9k rows.
-- The matview is refreshed by the daily price collector after it writes snapshots,
-- matching the previous freshness (the ranking was already only daily-fresh).

create materialized view public.card_latest_raw_krw_price as
  -- One row per card: the KRW display price of its most recent raw snapshot. Same
  -- projection the RPC used before — raw only, display_avg_price (FX-normalized).
  select distinct on (cards.id)
    cards.id as card_id,
    snaps.display_avg_price as latest_price
  from public.card_price_snapshots snaps
  join public.card_printings printings on printings.id = snaps.card_printing_id
  join public.cards cards on cards.id = printings.card_id
  where snaps.variant = 'raw'
    and snaps.display_currency = 'KRW'
    and snaps.display_avg_price is not null
  order by cards.id, snaps.snapshot_date desc, snaps.display_avg_price desc;

-- Unique index is required for REFRESH ... CONCURRENTLY, and backs the card lookup.
create unique index card_latest_raw_krw_price_card_id_idx
  on public.card_latest_raw_krw_price (card_id);

-- Backs the ranked read (highest price first, slug/card_id tiebreak).
create index card_latest_raw_krw_price_rank_idx
  on public.card_latest_raw_krw_price (latest_price desc, card_id asc);

grant select on public.card_latest_raw_krw_price to anon, authenticated;

-- The read path is now a trivial ordered scan of the precomputed rows — well within
-- the anon 3s budget regardless of how large the snapshot table grows.
create or replace function public.get_cards_by_latest_price()
returns table (
  card_id uuid,
  latest_price numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select card_id, latest_price
  from public.card_latest_raw_krw_price
  order by latest_price desc, card_id asc;
$$;

grant execute on function public.get_cards_by_latest_price() to anon, authenticated;

-- Refresh entry point for the daily collector (runs as service_role). SECURITY
-- DEFINER so it refreshes as the matview owner; search_path pinned for safety.
-- CONCURRENTLY keeps the catalog readable while the refresh runs.
create or replace function public.refresh_card_latest_raw_krw_price()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.card_latest_raw_krw_price;
end;
$$;

-- Only the daily collector (service_role) may trigger the refresh; a public
-- REFRESH ... CONCURRENTLY is expensive enough to abuse. Revoke the default PUBLIC
-- grant and the API roles explicitly.
revoke all on function public.refresh_card_latest_raw_krw_price() from public, anon, authenticated;
grant execute on function public.refresh_card_latest_raw_krw_price() to service_role;
