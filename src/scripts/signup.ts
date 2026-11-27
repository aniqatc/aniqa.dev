// The email sign-ups (UpdatesSignup on the portfolio intro and /reviews, NextEntry at the end of the lab).
// Each form is marked with data-signup, and its parts with data-signup-email, -fields, -button and -thanks.
//
// A valid address goes to /api/subscribe (src/pages/api/subscribe.ts), which adds it to Buttondown with the
// form's tag as an active subscriber (or, for a launch's form, to /api/launch-signup and its Loops list), then the form says thanks on the page. If the API is unavailable, keep the
// form visible and show an error so the visitor can retry.
import { onPage } from './page';
import { sendOff } from './send-off';

// bound how long the form waits before showing the retry message
const SERVER_TIMEOUT_MS = 4000;

type ServerResult = { ok: true } | { error: string } | { unavailable: true };

/** Ask the server to subscribe the address; unexpected failures leave the form available to retry. */
async function subscribe(endpoint: string, details: Record<string, string>): Promise<ServerResult> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(details),
      signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<{ ok: true; error: string }>;
    if (res.ok && body.ok) return { ok: true };
    if ((res.status === 400 || res.status === 429) && body.error) return { error: body.error };
  } catch {
    // show the retry message below
  }
  return { unavailable: true };
}

onPage(() => {
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-signup]')) {
    const email = form.querySelector<HTMLInputElement>('[data-signup-email]')!;
    const fields = form.querySelector<HTMLElement>('[data-signup-fields]')!;
    const button = form.querySelector<HTMLButtonElement>('[data-signup-button]')!;
    const thanks = form.querySelector<HTMLElement>('[data-signup-thanks]')!;
    const tag = form.querySelector<HTMLInputElement>('input[name="tag"]')?.value ?? 'updates';
    // a launch's form goes to its Loops list (/api/launch-signup) with the case study's slug, not a tag
    const launch = form.querySelector<HTMLInputElement>('input[name="launch"]')?.value;
    const endpoint = form.dataset.signupEndpoint ?? '/api/subscribe';

    const sayThanks = () => {
      // send-off first: it measures the button before the fields go
      sendOff(form, button, thanks, form.dataset.thanks ?? 'Thanks!');
      fields.hidden = true;
    };
    // a message from the server shows in the browser's own bubble on the field, until the address changes
    email.addEventListener('input', () => email.setCustomValidity(''));

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      email.setCustomValidity('');
      if (!email.checkValidity()) {
        email.reportValidity();
        return;
      }
      if (!form.getAttribute('action')) return sayThanks();

      button.disabled = true;
      form.setAttribute('aria-busy', 'true');
      const result = await subscribe(
        endpoint,
        launch ? { email: email.value, launch } : { email: email.value, tag },
      );
      button.disabled = false;
      form.removeAttribute('aria-busy');

      if ('ok' in result) return sayThanks();
      if ('error' in result) {
        email.setCustomValidity(result.error);
        email.reportValidity();
        return;
      }
      email.setCustomValidity('Sign-up is temporarily unavailable. Please try again in a moment.');
      email.reportValidity();
    });
  }
});
