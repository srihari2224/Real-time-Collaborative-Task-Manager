// src/lib/googleAuth.ts
// Wrapper for Google Identity Services (GIS) one-tap / popup login.
// Loaded via <script src="https://accounts.google.com/gsi/client"> in layout.tsx.

export const GOOGLE_CLIENT_ID =
  '838886988608-464l1c91elmivpqpqbbf82tg0hvtot2a.apps.googleusercontent.com';

// ── TypeScript declarations for the GIS SDK ────────────────────────────────

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          prompt: (momentListener?: (notification: PromptMomentNotification) => void) => void;
          cancel: () => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleCredentialResponse {
  credential: string;        // Google ID token (JWT)
  select_by: string;
}

interface PromptMomentNotification {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getDismissedReason: () => string;
  getNotDisplayedReason: () => string;
  getSkippedReason: () => string;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: string;
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
}

// ── Decoded payload fields we care about ───────────────────────────────────

export interface GoogleUser {
  sub: string;            // Stable unique ID from Google
  email: string;
  name: string | null;
  picture: string | null;
}

// ── Utility: decode JWT payload without verifying (browser-only helper) ────

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payloadB64] = token.split('.');
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Main: open the Google Sign-In popup and return credential + user info ──

export function signInWithGoogle(): Promise<{ credential: string; user: GoogleUser }> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google) {
      reject(new Error('Google Identity Services not loaded'));
      return;
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: GoogleCredentialResponse) => {
        const credential = response.credential;
        if (!credential) {
          reject(new Error('No credential returned by Google'));
          return;
        }

        const payload = decodeJwtPayload(credential);
        resolve({
          credential,
          user: {
            sub: (payload['sub'] as string) ?? '',
            email: (payload['email'] as string) ?? '',
            name: (payload['name'] as string | null) ?? null,
            picture: (payload['picture'] as string | null) ?? null,
          },
        });
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    // Trigger the One Tap / popup
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        // One Tap suppressed — fall back to renderButton method isn't applicable here;
        // For popup suppression on localhost, the credential callback still fires.
        const reason = notification.getNotDisplayedReason();
        // Only reject if it's a hard block (e.g., browser settings), not temporary suppression
        if (reason === 'opt_out_or_no_session') {
          reject(new Error('Google Sign-In was suppressed or not available. Please try again.'));
        }
      }
    });
  });
}
