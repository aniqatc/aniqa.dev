// Email sign-ups (src/scripts/signup.ts): subscribes an address to Buttondown through its API, so the form can
// say thanks on the page with no popup. Runs on the server (a Vercel function), where the API key stays secret.
//
//   POST /api/subscribe  { email, tag }  → { ok: true } (active immediately; no confirmation email)
//                                        → { error } with 400 (bad address or tag) or 429 (too many tries)
//                                        → { fallback: true } with 503 / 502 when there's no key or Buttondown
//                                          rejects the request
//
// Needs BUTTONDOWN_API_KEY (Buttondown → Settings → API) in .env locally and in Vercel's environment.
import type { APIRoute } from 'astro';
import { Ratelimit } from '@upstash/ratelimit';
import { likesConfigured as redisConfigured, redis } from '../../lib/redis';

export const prerender = false;

const env = (name: string): string | undefined => import.meta.env[name] ?? process.env[name];
const apiKey = env('BUTTONDOWN_API_KEY');

// the tags the forms use: updates (home page and lab) and reviews (/reviews)
const TAGS = new Set(['updates', 'reviews']);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// slowing down anyone hammering the route: 5 sign-ups per 10 minutes per IP (only when Upstash is set up)
const ratelimit = redisConfigured
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 m'), prefix: 'rl:subscribe' })
  : undefined;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** Ask Buttondown to add the address. An address that's already subscribed gets the tag added instead of an error. */
const addSubscriber = (body: Record<string, unknown>) =>
  fetch('https://api.buttondown.com/v1/subscribers', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Buttondown-Collision-Behavior': 'add',
    },
    body: JSON.stringify(body),
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!apiKey) return json({ fallback: true }, 503);

  const { email = '', tag = '' } = (await request.json().catch(() => ({}))) as { email?: string; tag?: string };
  const address = email.trim();
  if (!EMAIL.test(address) || address.length > 254) return json({ error: 'That email doesn’t look right' }, 400);
  if (!TAGS.has(tag)) return json({ error: 'unknown tag' }, 400);

  if (ratelimit) {
    const { success } = await ratelimit.limit(clientAddress ?? 'unknown');
    if (!success) return json({ error: 'Too many tries, give it a few minutes' }, 429);
  }

  // the visitor's own IP, so Buttondown's spam check doesn't see every sign-up coming from Vercel
  const subscriber = {
    email_address: address,
    tags: [tag],
    // Buttondown's regular type skips double opt-in; consent is collected by this form submission.
    type: 'regular',
    ip_address: clientAddress,
    referrer_url: request.headers.get('referer') ?? undefined,
  };
  const res = await addSubscriber(subscriber);
  if (res.ok) return json({ ok: true });

  // anything else (a spam check, a blocked address, Buttondown down): log it for diagnosis
  console.error(`Buttondown said ${res.status}:`, await res.text().catch(() => ''));
  return json({ fallback: true }, 502);
};
