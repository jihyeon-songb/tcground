-- Rank category cards by the same value the list UI presents as "평균 판매 호가".
-- This mirrors `buildPriceHistory()` for list cards:
-- 1. asking snapshots only
-- 2. raw + KRW display buckets only
-- 3. choose the richest bucket per card (more rows, then newer latest date)
-- 4. rank by that bucket's latest-date average display price

drop materialized view if exists public.card_average_asking_price_rank;
create materialized view if not exists public.card_average_asking_price_rank as
  with asking_rows as (
    select
      cards.id as card_id,
      snaps.snapshot_date,
      snaps.market,
      snaps.variant,
      coalesce(snaps.grade_company, '') as grade_company,
      coalesce(snaps.grade_value, '') as grade_value,
      snaps.display_avg_price
    from public.card_price_snapshots snaps
    join public.card_printings printings on printings.id = snaps.card_printing_id
    join public.cards cards on cards.id = printings.card_id
    where snaps.variant = 'raw'
      and snaps.display_currency = 'KRW'
      and snaps.display_avg_price is not null
      and (
        snaps.aggregation_method ilike '%asking%'
        or snaps.source_name in (
          'ebay_browse',
          'ebay_auction',
          'kream',
          'bunjang',
          'manual_bunjang',
          'joongna',
          'manual_joongna'
        )
      )
  ),
  bucket_stats as (
    select
      card_id,
      market,
      variant,
      grade_company,
      grade_value,
      count(*) as row_count,
      max(snapshot_date) as latest_date
    from asking_rows
    group by card_id, market, variant, grade_company, grade_value
  ),
  selected_buckets as (
    select distinct on (card_id)
      card_id,
      market,
      variant,
      grade_company,
      grade_value,
      latest_date
    from bucket_stats
    order by card_id, row_count desc, latest_date desc
  )
  select
    selected.card_id,
    round(avg(rows.display_avg_price), 2) as average_asking_price
  from selected_buckets selected
  join asking_rows rows
    on rows.card_id = selected.card_id
   and rows.market = selected.market
   and rows.variant = selected.variant
   and rows.grade_company = selected.grade_company
   and rows.grade_value = selected.grade_value
   and rows.snapshot_date = selected.latest_date
  group by selected.card_id;

create unique index if not exists card_average_asking_price_rank_card_id_idx
  on public.card_average_asking_price_rank (card_id);

create index if not exists card_average_asking_price_rank_order_idx
  on public.card_average_asking_price_rank (average_asking_price desc, card_id asc);

grant select on public.card_average_asking_price_rank to anon, authenticated;

create or replace function public.get_cards_by_average_asking_price()
returns table (
  card_id uuid,
  average_asking_price numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select card_id, average_asking_price
  from public.card_average_asking_price_rank
  order by average_asking_price desc, card_id asc;
$$;

grant execute on function public.get_cards_by_average_asking_price() to anon, authenticated;

create or replace function public.refresh_card_average_asking_price_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.card_average_asking_price_rank;
end;
$$;

revoke all on function public.refresh_card_average_asking_price_rank() from public, anon, authenticated;
grant execute on function public.refresh_card_average_asking_price_rank() to service_role;
