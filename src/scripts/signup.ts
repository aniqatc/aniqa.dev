// The email sign-ups (UpdatesSignup on the portfolio intro and /reviews, NextEntry at the end of the lab).
// Each form is marked with data-signup, and its parts with data-signup-email, -fields, -button and -thanks.
//
// A valid address goes to Buttondown the way Buttondown asks: the form posts into a small popup window, where
// Buttondown can show a CAPTCHA or an error if it needs to, then its own "check your inbox" page. Meanwhile
// the form here says thanks. Without JavaScript the same post opens in a new tab. With no Buttondown username
// set in contact.ts, the form has no action and only says thanks.
import { SIGNUP_WINDOW } from '../lib/contact';
import { onPage } from './page';
import { sendOff } from './send-off';

onPage(() => {
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-signup]')) {
    const email = form.querySelector<HTMLInputElement>('[data-signup-email]')!;
    const fields = form.querySelector<HTMLElement>('[data-signup-fields]')!;
    const button = form.querySelector<HTMLElement>('[data-signup-button]')!;
    const thanks = form.querySelector<HTMLElement>('[data-signup-thanks]')!;
    form.addEventListener('submit', (ev) => {
      if (!email.checkValidity()) {
        ev.preventDefault();
        email.reportValidity();
        return;
      }
      if (form.getAttribute('action')) {
        // open the popup first, during the click, so browsers allow it; the form then posts into it
        // (if it's blocked anyway, the post opens in a new tab instead)
        window.open('', SIGNUP_WINDOW, 'popup,width=480,height=640');
      } else {
        ev.preventDefault();
      }
      // after the post has gone: send-off first, as it measures the button before the fields go
      setTimeout(() => {
        sendOff(form, button, thanks, form.dataset.thanks ?? 'Thanks!');
        fields.hidden = true;
      });
    });
  }
});
