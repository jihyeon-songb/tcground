import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildTokenRequest, clearTokenCache, getApplicationAccessToken } from './ebay-oauth';
import { BROWSE_SCOPE, type EbayConfig } from './ebay-config';

const config: EbayConfig = {
  environment: 'sandbox',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  apiBaseUrl: 'https://api.sandbox.ebay.com',
  oauthTokenUrl: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
};

function tokenResponse(accessToken: string, expiresIn = 7200): Response {
  return new Response(
    JSON.stringify({ access_token: accessToken, expires_in: expiresIn, token_type: 'Bearer' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

afterEach(() => {
  clearTokenCache();
  vi.restoreAllMocks();
});

describe('buildTokenRequest', () => {
  it('uses Basic auth and the client-credentials grant', () => {
    const request = buildTokenRequest(config, BROWSE_SCOPE);
    expect(request.url).toBe(config.oauthTokenUrl);
    expect(request.headers.Authorization).toBe(
      `Basic ${Buffer.from('client-id:client-secret').toString('base64')}`,
    );
    expect(request.body).toContain('grant_type=client_credentials');
    expect(request.body).toContain(encodeURIComponent(BROWSE_SCOPE));
  });
});

describe('getApplicationAccessToken', () => {
  it('reuses a cached token until near expiry', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(tokenResponse('token-1'));
    let clock = 1_000;
    const now = () => clock;

    const first = await getApplicationAccessToken(BROWSE_SCOPE, { config, fetchImpl, now });
    clock += 60_000; // still well within the 2h window
    const second = await getApplicationAccessToken(BROWSE_SCOPE, { config, fetchImpl, now });

    expect(first).toBe('token-1');
    expect(second).toBe('token-1');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('refreshes after the token expires', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse('token-1', 7200))
      .mockResolvedValueOnce(tokenResponse('token-2', 7200));
    let clock = 0;
    const now = () => clock;

    const first = await getApplicationAccessToken(BROWSE_SCOPE, { config, fetchImpl, now });
    clock += 7200 * 1000; // past expiry
    const second = await getApplicationAccessToken(BROWSE_SCOPE, { config, fetchImpl, now });

    expect(first).toBe('token-1');
    expect(second).toBe('token-2');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws a descriptive error on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('invalid_client', { status: 401 }));

    await expect(
      getApplicationAccessToken(BROWSE_SCOPE, { config, fetchImpl }),
    ).rejects.toThrow(/eBay OAuth token request failed \(401\)/);
  });
});
