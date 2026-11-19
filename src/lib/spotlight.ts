// The home page spotlight: one project in the right column in place of App reviews and Selected work.
// Set SPOTLIGHT to null to bring the usual home page back. The work and review pages stay up either way.

/** One featured project for the home page. */
type Spotlight = {
  /** small label above the image, like the "Selected work" header */
  label: string;
  /** right-hand link in that header */
  headerLink: { text: string; href: string };
  title: string;
  /** optional short status in a pill right after the title, with a pulsing dot */
  status?: string;
  /** a sentence or two under the title */
  blurb: string;
  /** a 1200 × 630 image in public/ */
  image: string;
  imageAlt: string;
  /** the filled button: opens the product in a new tab */
  primary: { text: string; href: string };
  /** the outlined button: a page on this site, usually the case study */
  secondary: { text: string; href: string };
  /** one quiet line under the title, as its subheading */
  note?: string;
};

export const SPOTLIGHT: Spotlight | null = {
  label: 'Now shipping',
  headerLink: { text: 'The lab →', href: '/lab' },
  title: 'Little Doors: Christmas',
  status: 'Out now',
  blurb:
    'A digital advent calendar that lives in your Mac’s menu bar. Open a door a day until Christmas, and each one decorates your desktop.',
  image: '/little-doors/christmas-dark.webp',
  imageAlt:
    'Little Doors: Christmas, with string lights, the line “An advent calendar that lives in your menu bar.” and a grid of 25 doors.',
  primary: { text: 'Get it', href: 'https://littledoors.app/christmas' },
  secondary: { text: 'Read the story', href: '/work/little-doors' },
};
