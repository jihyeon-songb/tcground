/**
 * eBay OAuth 2.0 client-credentials flow.
 *
 * Mints an application access token (no user context) used for the Browse and
 * Marketplace Insights APIs. Tokens live ~2h; we cache and reuse them per
 * environment+scope until shortly before expiry.
 */

import { loadEbayConfig, type EbayConfig } from './ebay-config';

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TokenRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface GetTokenOptions {
  config?: EbayConfig;
  /** Injectable for tests. Defaults to the global `fetch`. */
  fetchImpl?: typeof fetch;
  /** Injectable clock (ms). Defaults to `Date.now`. */
  now?: () => number;
}

/** Refresh a little early so an in-flight request never uses an expired token. */
const EXPIRY_SKEW_MS = 60_000;

const tokenCache = new Map<string, CachedToken>();

/** Builds the client-credentials token request. Pure. */
export function buildTokenRequest(config: EbayConfig, scope: string): TokenRequest {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  return {
    url: config.oauthTokenUrl,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope }).toString(),
  };
}

/**
 * Returns a valid application access token for the scope, minting a new one only
 * when the cache is empty or near expiry.
 */
export async function getApplicationAccessToken(
  scope: string,
  options: GetTokenOptions = {},
): Promise<string> {
  const config = options.config ?? loadEbayConfig();
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  const cacheKey = `${config.environment}:${scope}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAtMs - EXPIRY_SKEW_MS > now()) {
    return cached.accessToken;
  }

  const request = buildTokenRequest(config, scope);
  const response = await fetchImpl(request.url, {
    method: 'POST',
    headers: request.headers,
    body: request.body,
  });

  if (!response.ok) {
    const detail = await safeReadText(response);
    throw new Error(`eBay OAuth token request failed (${response.status}): ${detail}`);
  }

  const data = (await response.json()) as TokenResponse;
  if (!data.access_token) {
    throw new Error('eBay OAuth response did not include an access token');
  }

  tokenCache.set(cacheKey, {
    accessToken: data.access_token,
    expiresAtMs: now() + data.expires_in * 1000,
  });

  return data.access_token;
}

/** Clears the in-memory token cache. Intended for tests. */
export function clearTokenCache(): void {
  tokenCache.clear();
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<no body>';
  }
}
