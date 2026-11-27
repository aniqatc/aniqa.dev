// A launch's email sign-up (UpdatesSignup with `launch`, at the end of a launch case study): adds the address to
// that launch's mailing list in Loops, not the Buttondown list. Runs on the server, where the API key stays secret.
//
//   POST /api/launch-signup  { email, launch }  → { ok: true }
//                                               → { error } with 400 (bad address or launch) or 429 (too many tries)
//                                               → { unavailable: true } with 503 / 502 (no key, or Loops refused)
//
// The list comes from the case study's frontmatter (launch.signup.loopsList), never from the request, so the form
// can't be used to add people to any other list. Needs LOOPS_API_KEY (Loops → Settings → API) in .env locally and
// in Vercel's environment.
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { env, isEmail, json, signupLimiter, withinLimit } from '../../lib/api';

export const prerender = false;

const apiKey = env('LOOPS_API_KEY');
// slowing down anyone hammering the route (only when Upstash is set up)
const limiter = signupLimiter('launch-signup');

/** Call the Loops API. */
const loops = (path: string, method: 'POST' | 'PUT', body: Record<string, unknown>) =>
  fetch(`https://app.loops.so/api/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!apiKey) return json({ unavailable: true }, 503);

  const { email = '', launch = '' } = (await request.json().catch(() => ({}))) as {
    email?: string;
    launch?: string;
  };
  const address = email.trim().toLowerCase();
  if (!isEmail(address))
    return json({ error: 'That email doesn’t look right' }, 400);

  // ---------- the list: only a published case study's own sign-up ----------
  const project = launch ? await getEntry('projects', launch) : undefined;
  const list = project && !project.data.draft ? project.data.launch?.signup?.loopsList : undefined;
  if (!list) return json({ error: 'unknown launch' }, 400);

  if (!(await withinLimit(limiter, clientAddress)))
    return json({ error: 'Too many tries, give it a few minutes' }, 429);

  // ---------- add them: a new contact, or an existing one joining the list ----------
  const contact = { email: address, source: 'aniqa.dev', mailingLists: { [list]: true } };
  let res = await loops('/contacts/create', 'POST', contact);
  if (res.status === 409) res = await loops('/contacts/update', 'PUT', contact);
  if (res.ok) return json({ ok: true });

  // anything else (a bad key, Loops down): log it for diagnosis
  console.error(`Loops said ${res.status}:`, await res.text().catch(() => ''));
  return json({ unavailable: true }, 502);
};
