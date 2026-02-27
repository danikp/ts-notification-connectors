import crypto from 'crypto';
import axios from 'axios';
import type { GoogleTokenResponse } from './fcm.types';

export interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

export function createSignedJwt(email: string, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };

  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');

  const unsignedToken = `${encodedHeader}.${encodedClaims}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();

  const signature = sign.sign(privateKey, 'base64url');

  return `${unsignedToken}.${signature}`;
}

export async function getAccessToken(
  email: string,
  privateKey: string,
  cache: TokenCache | null
): Promise<{ token: string; cache: TokenCache }> {
  if (cache && cache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return { token: cache.accessToken, cache };
  }

  const jwt = createSignedJwt(email, privateKey);

  const response = await axios.post<GoogleTokenResponse>(
    'https://oauth2.googleapis.com/token',
    `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const newCache: TokenCache = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  };

  return { token: newCache.accessToken, cache: newCache };
}
