/**
 * eBay API environment configuration.
 *
 * Credentials come only from environment variables — never hardcoded. An eBay
 * developer account provides Client ID / Client Secret for sandbox and
 * production keysets.
 */

export type EbayEnvironment = 'sandbox' | 'production';

export interface EbayConfig {
  environment: EbayEnvironment;
  clientId: string;
  clientSecret: string;
  apiBaseUrl: string;
  oauthTokenUrl: string;
}

const API_BASE_URL: Record<EbayEnvironment, string> = {
  sandbox: 'https://api.sandbox.ebay.com',
  production: 'https://api.ebay.com',
};

/** OAuth scope for the Browse API (active listings). Available to all developers. */
export const BROWSE_SCOPE = 'https://api.ebay.com/oauth/api_scope';

/**
 * OAuth scope for the Marketplace Insights API (completed sales).
 * Restricted / Limited Release — requires an approved Application Growth Check.
 */
export const MARKETPLACE_INSIGHTS_SCOPE =
  'https://api.ebay.com/oauth/api_scope/buy.marketplace.insights';

export const ITEM_SUMMARY_SEARCH_PATH = '/buy/browse/v1/item_summary/search';
export const ITEM_SALES_SEARCH_PATH = '/buy/marketplace_insights/v1_beta/item_sales/search';

/** Reads eBay config from env. Throws if credentials are missing. */
export function loadEbayConfig(): EbayConfig {
  const environment = normalizeEnvironment(process.env.EBAY_ENV);
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('eBay API requires EBAY_CLIENT_ID and EBAY_CLIENT_SECRET');
  }

  return {
    environment,
    clientId,
    clientSecret,
    apiBaseUrl: API_BASE_URL[environment],
    oauthTokenUrl: `${API_BASE_URL[environment]}/identity/v1/oauth2/token`,
  };
}

function normalizeEnvironment(value: string | undefined): EbayEnvironment {
  return value === 'production' ? 'production' : 'sandbox';
}
