-- Cards ranked by latest raw market price (KRW), backing the "추천순" default sort —
-- 비싼 카드 우선 (highest price first). Replaces the snapshot-count ranking
-- (get_cards_by_snapshot_count), which surfaced whichever cards eBay happened to
-- list most — 흔한 잡카드가 상단. Price is a better popularity proxy for the
-- catalog. Aggregating in Postgres keeps the fast-growing snapshot table from
-- being streamed in full into the app just to rank cards.

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
  -- One row per card: the KRW display price of its most recent raw snapshot. Uses
  -- display_avg_price (FX-normalized to KRW), not the raw avg_price — sources are
  -- mixed-currency (mostly USD eBay), so avg_price alone would rank across
  -- currencies and be meaningless. Raw only so the ranking matches the variant the
  -- catalog displays by default; graded prices would inflate the number.
  select card_id, latest_price
  from (
    select distinct on (cards.id)
      cards.id as card_id,
      snaps.display_avg_price as latest_price
    from public.card_price_snapshots snaps
    join public.card_printings printings on printings.id = snaps.card_printing_id
    join public.cards cards on cards.id = printings.card_id
    where snaps.variant = 'raw'
      and snaps.display_currency = 'KRW'
      and snaps.display_avg_price is not null
    order by cards.id, snaps.snapshot_date desc, snaps.display_avg_price desc
  ) latest
  order by latest_price desc, card_id asc;
$$;

-- The catalog is public; the anon/publishable client reads it via the cookieless
-- client. `security invoker` keeps RLS in force for the calling role.
grant execute on function public.get_cards_by_latest_price() to anon, authenticated;

-- The snapshot-count ranking is no longer called; drop it so no dead RPC lingers.
drop function if exists public.get_cards_by_snapshot_count();
