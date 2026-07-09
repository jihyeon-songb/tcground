-- Cards ranked by price-snapshot count, backing the "추천순" (recommended) default
-- sort. Previously recommendation ordered by latest price (비싼 시세 = 인기); it now
-- surfaces the cards with the most price history — the ones that actually draw a
-- trend line — first. Aggregating in Postgres keeps the fast-growing snapshot table
-- from being streamed in full into the app just to rank cards.

create or replace function public.get_cards_by_snapshot_count()
returns table (
  card_id uuid,
  snapshot_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    cards.id as card_id,
    count(*) as snapshot_count
  from public.card_price_snapshots snaps
  join public.card_printings printings on printings.id = snaps.card_printing_id
  join public.cards cards on cards.id = printings.card_id
  group by cards.id
  order by count(*) desc, cards.id asc;
$$;

-- The catalog is public; the anon/publishable client reads it via the cookieless
-- client. `security invoker` keeps RLS in force for the calling role.
grant execute on function public.get_cards_by_snapshot_count() to anon, authenticated;
