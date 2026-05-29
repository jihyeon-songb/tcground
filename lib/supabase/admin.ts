import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service role key.
 *
 * The price collection tables (`price_observations`, `card_price_snapshots`,
 * `price_collection_runs`) are RLS deny-all, so writes must go through this
 * privileged client from trusted server contexts (cron route, scripts) only.
 *
 * NEVER import this from a Client Component — the service role key must never
 * reach the browser bundle (it is not a `NEXT_PUBLIC_` variable).
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY',
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
