// Short lists for the portfolio intro and the lab

/** One in-progress item. `href` is optional: a full URL opens in a new tab with ↗, a site path (/lab/…) opens in place. */
type NowItem = { title: string; blurb: string; href?: string };

/** "Currently tinkering with" chips in the portfolio intro. */
export const TINKERING = ['TypeScript', 'Next.js', 'Astro', 'CSS art', 'Agentic coding'];

/** "Now building" in the portfolio intro */
export const BUILDING: NowItem[] = [
  {
    title: 'Little Doors: Spring',
    blurb: 'The next edition of my Mac advent calendar.',
  },
  {
    title: 'For Zayn',
    blurb: 'A little hub for everything I make for my son.',
    href: 'https://zayn.aniqa.dev',
  },
  // back after the Little Doors spotlight:
  // {
  //   title: 'huckleberry.csv',
  //   blurb: 'Turns a Huckleberry baby-tracker export into charts.',
  // },
  // next up:
  // {
  //   title: 'unsent.day',
  //   blurb: 'An anonymous, text-only board where strangers can read your unsent words.',
  // },
];
