// App reviews: src/content/reviews/<slug>/ → /reviews/<slug>
import type { ImageMetadata } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { pad } from './projects';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A review with its number in the series (No. 01 is the first). */
export type Review = CollectionEntry<'reviews'> & { number: number };

/** "2026-10-30" → "Oct 30, 2026" */
export const fmtDay = (date: string) =>
  `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}, ${date.slice(0, 4)}`;

// Drafts show on the dev server, so a review can be checked before it goes live, and never on the built site.
const visible = (review: CollectionEntry<'reviews'>) => import.meta.env.DEV || !review.data.draft;

/** Every review, oldest first, numbered from 01. */
export async function getReviews(): Promise<Review[]> {
  const reviews = await getCollection('reviews', visible);
  return reviews
    .sort((a, b) => a.data.date.localeCompare(b.data.date) || a.data.app.localeCompare(b.data.app))
    .map((review, index) => ({ ...review, number: index + 1 }));
}

/** The newest review, or undefined before the first one. */
export async function getLatestReview(): Promise<Review | undefined> {
  return (await getReviews()).at(-1);
}

/**
 * The review for the home page intro: the featured one (`featured: true`, the newest if more than one is), or
 * the newest review when none is. `featured` says which, so the intro can label it Hooked on or Reviewing.
 */
export async function getHomeReview(): Promise<{ review: Review; featured: boolean } | undefined> {
  const reviews = await getReviews();
  const featured = reviews.findLast((review) => review.data.featured);
  if (featured) return { review: featured, featured: true };
  const newest = reviews.at(-1);
  return newest && { review: newest, featured: false };
}

// How long a review counts as "updated lately" after its `updated` day: the refresh badge on its tile.
const UPDATED_LATELY_DAYS = 30;

/**
 * True when the review's `updated` day is within the last 30 days. Worked out when the site builds, so the badge
 * drops off at the first deploy after the 30 days are up.
 */
export const updatedLately = (review: Review) =>
  Boolean(review.data.updated) &&
  Date.now() - Date.parse(review.data.updated!) <= UPDATED_LATELY_DAYS * 24 * 60 * 60 * 1000;

/** "No. 06" */
export const reviewNumber = (review: Review) => `No. ${pad(review.number)}`;

// The five scores, in the order they're shown, with the label for each: an app's, and a game's.
const SCORE_LABELS = {
  app: {
    firstImpression: 'First impression',
    onboarding: 'Onboarding',
    usefulness: 'Usefulness',
    easeOfUse: 'Ease of use',
    value: 'Pricing / value',
  },
  game: {
    firstImpression: 'First impression',
    learningCurve: 'Learning curve',
    fun: 'Fun',
    feel: 'Feel',
    value: 'Pricing / value',
  },
} as const;

type ScoreStatus = 'polished' | 'getting-there' | 'needs-love';
const STATUS_LABELS: Record<ScoreStatus, string> = {
  polished: 'Polished',
  'getting-there': 'Getting there',
  'needs-love': 'Needs love',
};

/** A score's status word: 4–5 "Polished", 3 "Getting there", 1–2 "Needs love". */
const statusFor = (value: number): ScoreStatus =>
  value >= 4 ? 'polished' : value === 3 ? 'getting-there' : 'needs-love';

/** The review's scores, ready to show: label, value, status and its word. */
export function scoresFor(review: Review) {
  const scores = review.data.scores as Record<string, number>;
  return Object.entries(SCORE_LABELS[review.data.kind]).map(([key, label]) => {
    const value = scores[key];
    const status = statusFor(value);
    return { label, value, status, statusLabel: STATUS_LABELS[status] };
  });
}

/** "App review" or "Game review", for the review page's eyebrow. */
export const reviewKindLabel = (review: Review) => (review.data.kind === 'game' ? 'Game review' : 'App review');

/** What the star on a tile means: "Still using it", or "Still playing it" for a game. */
export const stillUsingLabel = (review: Review) =>
  review.data.kind === 'game' ? 'Still playing it' : 'Still using it';

// The app's icon: src/content/reviews/<slug>/logo.png. Without one, the archive shows the app's first letter
// on its brand colour.
const logos = import.meta.glob<{ default: ImageMetadata }>('../content/reviews/*/logo.png', { eager: true });

/** The review's logo, or undefined if the folder has none. */
export const logoFor = (review: Review) => logos[`../content/reviews/${review.id}/logo.png`]?.default;

// A review's screens: screenshot.png, then screenshot-2.png and screenshot-3.png for a phone app.
const screens = import.meta.glob<{ default: ImageMetadata }>('../content/reviews/*/screenshot*.png', {
  eager: true,
});

/** The review's screenshots in order: screenshot.png, screenshot-2.png, screenshot-3.png (those it has). */
export const screensFor = (review: Review) =>
  ['screenshot', 'screenshot-2', 'screenshot-3']
    .map((name) => screens[`../content/reviews/${review.id}/${name}.png`]?.default)
    .filter((screen): screen is ImageMetadata => Boolean(screen));

/** The app's link: a bare host gets https://; a full link (App Store, Google Play) stays as it is. */
export const appUrlFor = (review: Review) =>
  /^https?:\/\//.test(review.data.live) ? review.data.live : `https://${review.data.live}`;

/** What the app's link says: App Store ↗, Google Play ↗, Steam ↗, itch.io ↗ or App ↗. */
export function appLinkLabel(review: Review) {
  const url = appUrlFor(review);
  if (/apps\.apple\.com/.test(url)) return 'App Store ↗';
  if (/play\.google\.com/.test(url)) return 'Google Play ↗';
  if (/store\.steampowered\.com/.test(url)) return 'Steam ↗';
  if (/itch\.io/.test(url)) return 'itch.io ↗';
  return 'App ↗';
}

/** Where @maker links: `makerLink` when it's set (Bluesky, Threads, their site…), otherwise their profile on X. */
export const makerUrl = (review: Review) => review.data.makerLink ?? `https://x.com/${review.data.maker}`;

/** The price as a number for structured data: "Free" → 0, "$9.99 one-time" → 9.99; undefined if it isn't in dollars. */
function priceIn(price: string | undefined) {
  if (!price) return undefined;
  if (/^free\b/i.test(price.trim())) return 0;
  const match = /^\$(\d+(?:\.\d+)?)/.exec(price.trim());
  return match ? Number(match[1]) : undefined;
}

/** The overall rating out of 5: the five scores averaged, to one decimal place. */
export const overallScore = (review: Review) =>
  Math.round((Object.values(review.data.scores).reduce((sum, value) => sum + value, 0) / 5) * 10) / 10;

/**
 * schema.org structured data for a review page (a Review of a SoftwareApplication), so search engines can show
 * the rating, price and date. `url` is the review's own address.
 */
export function reviewJsonLd(review: Review, url: URL) {
  const { app, kind, date, updated, summary, platforms, price } = review.data;
  const amount = priceIn(price);
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    name: `${app} review`,
    url: url.href,
    datePublished: date,
    ...(updated ? { dateModified: updated } : {}),
    description: summary,
    inLanguage: 'en',
    author: { '@type': 'Person', name: 'Aniqa', url: 'https://aniqa.dev' },
    publisher: { '@type': 'Person', name: 'Aniqa', url: 'https://aniqa.dev' },
    reviewRating: { '@type': 'Rating', ratingValue: overallScore(review), bestRating: 5, worstRating: 1 },
    itemReviewed: {
      '@type': kind === 'game' ? 'VideoGame' : 'SoftwareApplication',
      name: app,
      url: appUrlFor(review),
      ...(platforms?.length ? { operatingSystem: platforms.join(', ') } : {}),
      ...(amount !== undefined ? { offers: { '@type': 'Offer', price: amount, priceCurrency: 'USD' } } : {}),
    },
  };
}
