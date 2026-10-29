import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { buildAuthorizationUrl, generatePKCE, getOAuthConfig } from '@/lib/buffer/oauth';
import { setOAuthState } from '@/lib/session';

export async function GET() {
  const config = getOAuthConfig();

  if (!config.clientId) {
    return NextResponse.json(
      { error: 'BUFFER_CLIENT_ID is not configured in environment.' },
      { status: 500 }
    );
  }

  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  await setOAuthState(state, verifier);

  const authUrl = buildAuthorizationUrl(config, challenge, state);
  return NextResponse.redirect(authUrl);
}
