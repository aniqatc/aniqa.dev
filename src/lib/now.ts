// Short lists for the portfolio intro and the lab

/** One in-progress item. `href` is optional: a full URL opens in a new tab with ↗, a site path (/lab/…) opens in place.
 * `status` is optional: a short word in an accent pill after the title, and it colours the title in the accent
 * so the item stands out from the rest of the list. `story` is optional: a site path to its write-up, shown as
 * "Read about it →" on its own line under the blurb. */
export type NowItem = { title: string; blurb: string; href?: string; status?: string; story?: string };

/** "Currently tinkering with" chips. Not shown on the home page for now; kept for when the row comes back. */
export const TINKERING = ['TypeScript', 'Three.js', 'CSS art', 'Agentic coding'];

/** "Shipped" in the portfolio intro: finished products, newest first. */
export const SHIPPED: NowItem[] = [
  {
    title: 'littledoors.app',
    blurb: 'A festive advent calendar that lives in your Mac’s menu bar.',
    href: 'https://littledoors.app',
    status: 'Launched',
    story: '/work/little-doors',
  },
];

/** "Now building" in the portfolio intro */
export const BUILDING: NowItem[] = [
  {
    title: 'huckleberry.csv',
    blurb: 'Turns a Huckleberry baby-tracker export into charts.',
  },
  {
    title: 'For Zayn',
    blurb: 'A little hub for everything I make for my son.',
    href: 'https://zayn.aniqa.dev',
  },
  // next up:
  // {
  //   title: 'unsent.day',
  //   blurb: 'An anonymous, text-only board where strangers can read your unsent words.',
  // },
];
