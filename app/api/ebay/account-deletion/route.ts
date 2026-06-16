import { createHash } from 'node:crypto';

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,80}$/;

export async function GET(request: Request) {
  const challengeCode = new URL(request.url).searchParams.get('challenge_code');
  if (!challengeCode) {
    return NextResponse.json({ error: 'challenge_code is required' }, { status: 400 });
  }

  const verificationToken = process.env.EBAY_DELETION_VERIFICATION_TOKEN;
  const endpoint = process.env.EBAY_DELETION_ENDPOINT;
  if (!verificationToken || !endpoint || !TOKEN_PATTERN.test(verificationToken)) {
    return NextResponse.json(
      { error: 'eBay deletion endpoint is not configured' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    challengeResponse: createChallengeResponse(challengeCode, verificationToken, endpoint),
  });
}

export async function POST() {
  // The app does not store eBay user account data. Keep the required notification
  // endpoint alive; add deletion work here if that changes.
  return NextResponse.json({ received: true });
}

export function createChallengeResponse(
  challengeCode: string,
  verificationToken: string,
  endpoint: string,
): string {
  return createHash('sha256')
    .update(challengeCode)
    .update(verificationToken)
    .update(endpoint)
    .digest('hex');
}
