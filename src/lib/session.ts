import { cookies } from 'next/headers';

const COOKIE_BUFFER_TOKEN = 'gitsocial_buffer_token';
const COOKIE_BUFFER_REFRESH = 'gitsocial_buffer_refresh';
const COOKIE_PKCE_VERIFIER = 'gitsocial_pkce_verifier';
const COOKIE_OAUTH_STATE = 'gitsocial_oauth_state';

export async function setBufferSession(accessToken: string, refreshToken?: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_BUFFER_TOKEN, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (refreshToken) {
    cookieStore.set(COOKIE_BUFFER_REFRESH, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 60, // 60 days
    });
  }
}

export async function getBufferToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_BUFFER_TOKEN)?.value || null;
}

export async function getBufferRefreshToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_BUFFER_REFRESH)?.value || null;
}

export async function clearBufferSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_BUFFER_TOKEN);
  cookieStore.delete(COOKIE_BUFFER_REFRESH);
}

export async function setOAuthState(state: string, verifier: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_OAUTH_STATE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  cookieStore.set(COOKIE_PKCE_VERIFIER, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
}

export async function getOAuthState(): Promise<{ state: string | null; verifier: string | null }> {
  const cookieStore = await cookies();
  const state = cookieStore.get(COOKIE_OAUTH_STATE)?.value || null;
  const verifier = cookieStore.get(COOKIE_PKCE_VERIFIER)?.value || null;
  return { state, verifier };
}

export async function clearOAuthState() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_OAUTH_STATE);
  cookieStore.delete(COOKIE_PKCE_VERIFIER);
}
