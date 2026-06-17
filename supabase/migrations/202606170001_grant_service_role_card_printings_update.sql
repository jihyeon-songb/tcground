-- Allow the server-side name-enrichment job to write English names back onto the
-- catalog. `scripts/enrich-card-names.ts` runs as service_role and updates
-- `card_printings.external_ids.name_en` so eBay collection can build English
-- search keywords. RLS still protects client roles.

grant update on public.card_printings to service_role;
