// Contact information and social media links
export const CONTACT = {
  github: 'https://github.com/aniqatc',
  email: 'hello@aniqa.dev',
  linkedin: '',
  x: 'https://x.com/aniqatc',
  codepen: 'https://codepen.io/aniqatc',
  medium: '',
  discord: '',
  // the Buttondown username the sign-up forms send to; empty, they only say thanks
  buttondown: 'aniqa',
};

// where the sign-up forms post: Buttondown's subscribe form for that username (none when it's empty), opened in
// a popup window with this name (see src/scripts/signup.ts)
export const SIGNUP_ACTION = CONTACT.buttondown
  ? `https://buttondown.com/api/emails/embed-subscribe/${CONTACT.buttondown}`
  : undefined;
export const SIGNUP_WINDOW = 'buttondown-signup';
