import { readFileSync } from 'fs';
import { join } from 'path';

export const REFRESH_SLIDING_DAYS = 14; // refresh TTL (sliding)
export const REFRESH_ABSOLUTE_DAYS = 90; // max session lifetime (absolute cap)\
export const ACCESS_TOKEN_EXPIRES_SEC = 20 * 60; // access token lifetime

export const loadKey = (
  envPath: string | undefined,
  fallback: string,
): string => {
  const path = envPath ?? fallback;
  return readFileSync(join(process.cwd(), path), 'utf8');
};

export const jwtConstants = {
  privateKey: () =>
    loadKey(process.env.JWT_PRIVATE_KEY_PATH, 'keys/private.pem'),
  publicKey: () => loadKey(process.env.JWT_PUBLIC_KEY_PATH, 'keys/public.pem'),
  accessExpiresIn: ACCESS_TOKEN_EXPIRES_SEC,
};

export interface JwtPayload {
  sub: string;
  role: string;
}
