-- Restore the PRD-defined "추천순" ranking: cards with price data first, then
-- cards with more price evidence first. The previous latest-price ranking made
-- expensive cards dominate the catalog even when the price evidence was thin.
--
-- Keep this precomputed so category navigation never aggregates the full
-- card_price_snapshots table under the anon role's statement_timeout.

create materialized view public.card_price_sample_count_rank as
  select
    cards.id as card_id,
    sum(greatest(coalesce(snaps.sample_count, 1), 0))::bigint as sample_count
  from public.card_price_snapshots snaps
  join public.card_printings printings on printings.id = snaps.card_printing_id
  join public.cards cards on cards.id = printings.card_id
  where snaps.variant = 'raw'
    and coalesce(snaps.display_avg_price, snaps.avg_price) is not null
  group by cards.id;

-- Unique index is required for REFRESH ... CONCURRENTLY and backs card lookup.
create unique index card_price_sample_count_rank_card_id_idx
  on public.card_price_sample_count_rank (card_id);

-- Backs the ranked read (most evidence first, stable card-id tiebreak).
create index card_price_sample_count_rank_order_idx
  on public.card_price_sample_count_rank (sample_count desc, card_id asc);

grant select on public.card_price_sample_count_rank to anon, authenticated;

create or replace function public.get_cards_by_price_sample_count()
returns table (
  card_id uuid,
  sample_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select card_id, sample_count
  from public.card_price_sample_count_rank
  order by sample_count desc, card_id asc;
$$;

grant execute on function public.get_cards_by_price_sample_count() to anon, authenticated;

-- Daily collector refresh entry point. SECURITY DEFINER refreshes as the matview
-- owner; CONCURRENTLY keeps catalog reads available during refresh.
create or replace function public.refresh_card_price_sample_count_rank()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.card_price_sample_count_rank;
end;
$$;

revoke all on function public.refresh_card_price_sample_count_rank() from public, anon, authenticated;
grant execute on function public.refresh_card_price_sample_count_rank() to service_role;
