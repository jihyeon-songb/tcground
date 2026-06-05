import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cookieless Supabase client for reading public catalog data (games, cards,
 * sets, printings, price snapshots).
 *
 * Unlike the SSR client in `./server`, this one never touches request cookies,
 * so it can be used inside `unstable_cache` callbacks (which run without request
 * scope) and the resulting cache entries are shared across all visitors. It uses
 * the publishable (anon) key, so RLS still applies — only publicly readable rows
 * are returned, exactly like an anonymous visitor would see.
 *
 * NEVER use this for user-specific reads (e.g. the viewer's own rating); those
 * must go through `./server`'s cookie-aware client so RLS sees the signed-in user.
 */
let cachedClient: SupabaseClient | null = null;

export function createPublicClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase public client requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  cachedClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
