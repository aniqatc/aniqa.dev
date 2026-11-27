// Shared pieces for the server routes in src/pages/api (Vercel functions): reading settings, JSON replies,
// checking an email address and slowing down repeat sign-ups.
import { Ratelimit } from '@upstash/ratelimit';
import { likesConfigured as redisConfigured, redis } from './redis';

/** A setting from .env locally, or Vercel's environment. Never log the value. */
export const env = (name: string): string | undefined => import.meta.env[name] ?? process.env[name];

/** A JSON reply that's never cached. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Looks like an email address, and isn't too long for one. */
export const isEmail = (address: string) => EMAIL.test(address) && address.length <= 254;

/**
 * Five tries per 10 minutes per IP for a sign-up form, counted under its own prefix. Undefined (no limit) when
 * Upstash isn't set up.
 */
export const signupLimiter = (prefix: string) =>
  redisConfigured
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: `rl:${prefix}` })
    : undefined;

/** False when this IP has used up its tries. */
export async function withinLimit(limiter: Ratelimit | undefined, ip: string | undefined) {
  if (!limiter) return true;
  const { success } = await limiter.limit(ip ?? 'unknown');
  return success;
}
