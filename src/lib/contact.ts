// Contact information and social media links
export const CONTACT = {
  github: 'https://github.com/aniqatc',
  email: 'hello@aniqa.dev',
  linkedin: '',
  codepen: 'https://codepen.io/aniqatc',
  medium: '',
  discord: '',
  // the Buttondown username the sign-up forms send to; empty, they only say thanks
  buttondown: 'aniqa',
};

// where the sign-up forms post when JavaScript is unavailable: Buttondown's subscribe form for that username
// (none when it's empty)
export const SIGNUP_ACTION = CONTACT.buttondown
  ? `https://buttondown.com/api/emails/embed-subscribe/${CONTACT.buttondown}`
  : undefined;
