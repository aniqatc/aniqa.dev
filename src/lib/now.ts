// Short lists for the portfolio intro and the lab

/** One in-progress item. `href` is optional: a full URL opens in a new tab with ↗, a site path (/lab/…) opens in place.
 * `status` is optional: a short word in an accent pill after the title, and it colours the title in the accent
 * so the item stands out from the rest of the list. */
type NowItem = { title: string; blurb: string; href?: string; status?: string };

/** "Currently tinkering with" chips in the portfolio intro. */
export const TINKERING = ['TypeScript', 'Next.js', 'Astro', 'Three.js', 'CSS art', 'Agentic coding'];

/** "Now building" in the portfolio intro */
export const BUILDING: NowItem[] = [
  {
    title: 'littledoors.app',
    blurb: 'A festive advent calendar for your Mac.',
    href: 'https://littledoors.app',
    status: 'Launched',
  },
  {
    title: 'For Zayn',
    blurb: 'A little hub for everything I make for my son.',
    href: 'https://zayn.aniqa.dev',
  },
  // back after the Little Doors launch:
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
