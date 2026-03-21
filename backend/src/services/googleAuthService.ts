// src/services/googleAuthService.ts
// Verifies a Google ID token using Google's public tokeninfo endpoint.
// No external library required — uses native fetch.

const GOOGLE_CLIENT_ID = '838886988608-464l1c91elmivpqpqbbf82tg0hvtot2a.apps.googleusercontent.com';

export interface GoogleUserInfo {
  sub: string;       // Unique Google user ID (stable)
  email: string;
  name: string | null;
  picture: string | null;
  email_verified: boolean;
}

export const verifyGoogleToken = async (idToken: string): Promise<GoogleUserInfo> => {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Google token verification request failed');
  }

  const payload = await res.json() as Record<string, string>;

  // Validate audience — must match our Client ID
  if (payload['aud'] !== GOOGLE_CLIENT_ID) {
    throw new Error('Google ID token audience mismatch');
  }

  // Validate the token is not expired
  const exp = parseInt(payload['exp'] ?? '0', 10);
  if (exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Google ID token has expired');
  }

  if (!payload['email']) {
    throw new Error('Google ID token missing email claim');
  }

  return {
    sub: payload['sub'] ?? '',
    email: payload['email'],
    name: payload['name'] ?? null,
    picture: payload['picture'] ?? null,
    email_verified: payload['email_verified'] === 'true',
  };
};
