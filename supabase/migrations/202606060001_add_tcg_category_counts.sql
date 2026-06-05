-- Per-game catalog counts for the categories overview.
-- Replaces full-table reads of cards / card_sets / card_printings /
-- card_price_snapshots (which the app previously counted in JS) with a single
-- aggregate query, so the snapshot table — the fastest-growing one — is never
-- streamed in full just to size each category.

create or replace function public.get_tcg_category_counts()
returns table (
  game_id uuid,
  card_count bigint,
  set_count bigint,
  snapshot_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    g.id as game_id,
    coalesce(c.card_count, 0) as card_count,
    coalesce(s.set_count, 0) as set_count,
    coalesce(snap.snapshot_count, 0) as snapshot_count
  from public.tcg_games g
  left join (
    select game_id, count(*) as card_count
    from public.cards
    group by game_id
  ) c on c.game_id = g.id
  left join (
    select game_id, count(*) as set_count
    from public.card_sets
    group by game_id
  ) s on s.game_id = g.id
  left join (
    select cards.game_id, count(*) as snapshot_count
    from public.card_price_snapshots snaps
    join public.card_printings printings on printings.id = snaps.card_printing_id
    join public.cards cards on cards.id = printings.card_id
    group by cards.game_id
  ) snap on snap.game_id = g.id;
$$;

-- The overview is public; the anon/publishable client reads it via the cookieless
-- client. `security invoker` keeps RLS in force for the calling role.
grant execute on function public.get_tcg_category_counts() to anon, authenticated;
