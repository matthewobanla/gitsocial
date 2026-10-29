import crypto from 'crypto';

export interface BufferTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface BufferOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getOAuthConfig(): BufferOAuthConfig {
  return {
    clientId: process.env.BUFFER_CLIENT_ID || '',
    clientSecret: process.env.BUFFER_CLIENT_SECRET || '',
    redirectUri: process.env.BUFFER_REDIRECT_URI || 'https://localhost:3000/api/auth/buffer/callback',
  };
}

/**
 * Generates a high-entropy PKCE code_verifier and its base64url-encoded SHA256 code_challenge
 */
export function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}

/**
 * Builds the Buffer OAuth 2.0 Authorization URL with PKCE
 */
export function buildAuthorizationUrl(config: BufferOAuthConfig, challenge: string, state: string) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'account:read channel:read post:write offline_access',
  });

  return `https://login.buffer.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchanges authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  config: BufferOAuthConfig,
  code: string,
  codeVerifier: string
): Promise<BufferTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://login.buffer.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Buffer OAuth token exchange failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as BufferTokenResponse;
}

/**
 * Refreshes an expired access token using the rotating refresh token
 */
export async function refreshAccessToken(
  config: BufferOAuthConfig,
  refreshToken: string
): Promise<BufferTokenResponse> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://login.buffer.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Buffer OAuth refresh failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as BufferTokenResponse;
}
