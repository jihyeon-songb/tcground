-- Keep the top active listings alongside an asking snapshot so the card detail
-- page can link to individual eBay listings, not just the cheapest one.
-- Shape: [{ "price": number, "currency": text, "url": text, "title": text|null }]
-- All public eBay data; the snapshot table is already publicly readable.
alter table public.card_price_snapshots
  add column if not exists listings jsonb;
