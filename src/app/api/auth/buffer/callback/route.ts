import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getOAuthConfig } from '@/lib/buffer/oauth';
import { clearOAuthState, getOAuthState, setBufferSession } from '@/lib/session';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const baseUrl = request.nextUrl.origin;

  if (error) {
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(errorDescription || error)}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/?error=Missing+authorization+code+or+state`);
  }

  const savedState = await getOAuthState();
  if (!savedState.state || savedState.state !== state || !savedState.verifier) {
    return NextResponse.redirect(`${baseUrl}/?error=Invalid+state+parameter+or+session+expired`);
  }

  try {
    const config = getOAuthConfig();
    const tokenResponse = await exchangeCodeForTokens(config, code, savedState.verifier);

    await setBufferSession(tokenResponse.access_token, tokenResponse.refresh_token);
    await clearOAuthState();

    return NextResponse.redirect(`${baseUrl}/?auth=connected`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OAuth exchange failed';
    console.error('Buffer OAuth callback error:', message);
    return NextResponse.redirect(`${baseUrl}/?error=${encodeURIComponent(message)}`);
  }
}
