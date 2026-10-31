// The email sign-ups (UpdatesSignup on the portfolio intro and /reviews, NextEntry at the end of the lab).
// Each form is marked with data-signup, and its parts with data-signup-email, -fields, -button and -thanks.
//
// A valid address goes to /api/subscribe (src/pages/api/subscribe.ts), which adds it to Buttondown with the
// form's tag, and the form says thanks on the page. If that route can't do it (no API key, or Buttondown wants a
// CAPTCHA), the form posts to Buttondown itself in a small popup instead, so no sign-up is lost. Without
// JavaScript the form posts to Buttondown in a new tab. With no Buttondown username set in contact.ts, the form
// has no action and only says thanks.
import { SIGNUP_WINDOW } from '../lib/contact';
import { onPage } from './page';
import { sendOff } from './send-off';

// past this, the popup takes over; browsers only allow a popup within a few seconds of the click
const SERVER_TIMEOUT_MS = 4000;

type ServerResult = { ok: true } | { error: string } | { fallback: true };

/** Ask the server to subscribe the address; anything unexpected (offline, slow, a 500) means use the popup. */
async function subscribe(email: string, tag: string): Promise<ServerResult> {
  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tag }),
      signal: AbortSignal.timeout(SERVER_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as Partial<{ ok: true; error: string }>;
    if (res.ok && body.ok) return { ok: true };
    if ((res.status === 400 || res.status === 429) && body.error) return { error: body.error };
  } catch {
    // fall through to the popup
  }
  return { fallback: true };
}

onPage(() => {
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-signup]')) {
    const email = form.querySelector<HTMLInputElement>('[data-signup-email]')!;
    const fields = form.querySelector<HTMLElement>('[data-signup-fields]')!;
    const button = form.querySelector<HTMLButtonElement>('[data-signup-button]')!;
    const thanks = form.querySelector<HTMLElement>('[data-signup-thanks]')!;
    const tag = form.querySelector<HTMLInputElement>('input[name="tag"]')?.value ?? 'updates';

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
      const result = await subscribe(email.value, tag);
      button.disabled = false;
      form.removeAttribute('aria-busy');

      if ('ok' in result) return sayThanks();
      if ('error' in result) {
        email.setCustomValidity(result.error);
        email.reportValidity();
        return;
      }
      // the popup: Buttondown's own page finishes the sign-up (a CAPTCHA, if it asks for one)
      window.open('', SIGNUP_WINDOW, 'popup,width=480,height=640');
      form.submit();
      sayThanks();
    });
  }
});
