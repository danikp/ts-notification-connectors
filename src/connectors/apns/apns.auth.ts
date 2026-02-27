import crypto from 'crypto';

export interface ApnsTokenCache {
  token: string;
  expiresAt: number;
}

export function createApnsJwt(
  keyId: string,
  teamId: string,
  privateKey: string
): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId })
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const claims = Buffer.from(
    JSON.stringify({ iss: teamId, iat: now })
  ).toString('base64url');

  const unsignedToken = `${header}.${claims}`;

  const signature = crypto.sign('SHA256', Buffer.from(unsignedToken), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });

  return `${unsignedToken}.${signature.toString('base64url')}`;
}

export function getOrCacheToken(
  keyId: string,
  teamId: string,
  privateKey: string,
  cache: ApnsTokenCache | null
): { token: string; cache: ApnsTokenCache } {
  if (cache && cache.expiresAt > Date.now()) {
    return { token: cache.token, cache };
  }

  const token = createApnsJwt(keyId, teamId, privateKey);
  const newCache: ApnsTokenCache = {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes (APNs tokens valid for 1 hour)
  };

  return { token, cache: newCache };
}
