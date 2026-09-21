import { createHmac } from 'node:crypto';

/**
 * The local stack's JWT secret. It is the same on every machine and printed by
 * `npx supabase status`, so it is no secret at all - which is exactly why it
 * is only ever used against the local database (see createClient in ./server).
 * Production signs with a key this app never holds.
 */
const LOCAL_JWT_SECRET =
  process.env.SUPABASE_LOCAL_JWT_SECRET ??
  'super-secret-jwt-token-with-at-least-32-characters-long';

const TTL_SECONDS = 60 * 60;

const encode = (value: object) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

/**
 * An access token for `userId`, signed the way the local Auth server signs its
 * own. PostgREST and Auth both accept it, so RLS, `auth.uid()` and
 * `auth.getUser()` all answer as that user - a real session in every way that
 * matters, minted without their password or a code.
 */
export function signLocalAccessToken(userId: string): {
  token: string;
  expiresAt: number;
} {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + TTL_SECONDS;
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    is_anonymous: false,
    iss: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`,
    iat: issuedAt,
    exp: expiresAt,
  });
  const signature = createHmac('sha256', LOCAL_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return { token: `${header}.${payload}.${signature}`, expiresAt };
}
