// src/services/googleAuthService.ts
// Verifies a Google ID token using Google's public tokeninfo endpoint.
// No external library required — uses native fetch.
import { v5 as uuidv5 } from 'uuid';

const GOOGLE_CLIENT_ID = '838886988608-464l1c91elmivpqpqbbf82tg0hvtot2a.apps.googleusercontent.com';

// Use a custom namespace for Google User IDs to prevent collisions
const GOOGLE_USER_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

export interface GoogleUserInfo {
  id: string;        // UUID mapped from Google `sub`
  sub: string;       // Unique Google user ID (stable string)
  email: string;
  name: string | null;
  picture: string | null;
  email_verified: boolean;
}

/**
 * Deterministically generates a valid UUID for a Google user based on their Google `sub`.
 * Ensures compatibility with Postgres UUID column types without needing a migration.
 */
export const generateGoogleUserId = (sub: string): string => {
  return uuidv5(`google_${sub}`, GOOGLE_USER_NAMESPACE);
};

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

  const sub = payload['sub'] ?? '';

  return {
    id: generateGoogleUserId(sub),
    sub,
    email: payload['email'],
    name: payload['name'] ?? null,
    picture: payload['picture'] ?? null,
    email_verified: payload['email_verified'] === 'true',
  };
};
