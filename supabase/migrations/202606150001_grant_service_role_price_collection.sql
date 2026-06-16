-- Allow server-side collection jobs to read catalog data and write price tables.
--
-- RLS still protects client roles; trusted server scripts use the service_role
-- JWT and need table privileges in addition to RLS bypass.

grant select on
  public.tcg_games,
  public.card_sets,
  public.cards,
  public.card_printings,
  public.card_categories,
  public.card_category_links,
  public.card_price_snapshots,
  public.price_observations,
  public.price_collection_runs,
  public.exchange_rates
to service_role;

grant insert, update, delete on
  public.card_price_snapshots,
  public.price_observations,
  public.price_collection_runs,
  public.exchange_rates
to service_role;

grant execute on function public.get_card_rating_summary(uuid) to service_role;
grant execute on function public.get_tcg_category_counts() to service_role;
