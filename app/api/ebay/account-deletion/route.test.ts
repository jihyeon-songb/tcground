import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { GET, POST, createChallengeResponse } from './route';

describe('/api/ebay/account-deletion route', () => {
  it('returns the eBay challenge response hash', async () => {
    const previousToken = process.env.EBAY_DELETION_VERIFICATION_TOKEN;
    const previousEndpoint = process.env.EBAY_DELETION_ENDPOINT;
    process.env.EBAY_DELETION_VERIFICATION_TOKEN = 'a'.repeat(32);
    process.env.EBAY_DELETION_ENDPOINT = 'https://tcground.test/api/ebay/account-deletion';

    try {
      const response = await GET(
        new Request('https://tcground.test/api/ebay/account-deletion?challenge_code=challenge123'),
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        challengeResponse: createHash('sha256')
          .update('challenge123')
          .update('a'.repeat(32))
          .update('https://tcground.test/api/ebay/account-deletion')
          .digest('hex'),
      });
    } finally {
      restoreEnv('EBAY_DELETION_VERIFICATION_TOKEN', previousToken);
      restoreEnv('EBAY_DELETION_ENDPOINT', previousEndpoint);
    }
  });

  it('rejects missing challenge_code', async () => {
    const response = await GET(new Request('https://tcground.test/api/ebay/account-deletion'));

    expect(response.status).toBe(400);
  });

  it('rejects missing or invalid configuration', async () => {
    const previousToken = process.env.EBAY_DELETION_VERIFICATION_TOKEN;
    const previousEndpoint = process.env.EBAY_DELETION_ENDPOINT;
    process.env.EBAY_DELETION_VERIFICATION_TOKEN = 'too-short';
    process.env.EBAY_DELETION_ENDPOINT = 'https://tcground.test/api/ebay/account-deletion';

    try {
      const response = await GET(
        new Request('https://tcground.test/api/ebay/account-deletion?challenge_code=abc'),
      );

      expect(response.status).toBe(500);
    } finally {
      restoreEnv('EBAY_DELETION_VERIFICATION_TOKEN', previousToken);
      restoreEnv('EBAY_DELETION_ENDPOINT', previousEndpoint);
    }
  });

  it('acknowledges deletion notifications', async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe('createChallengeResponse', () => {
  it('hashes challenge, token, and endpoint in eBay order', () => {
    expect(createChallengeResponse('c', 't'.repeat(32), 'https://example.com/hook')).toBe(
      createHash('sha256')
        .update('c')
        .update('t'.repeat(32))
        .update('https://example.com/hook')
        .digest('hex'),
    );
  });
});
