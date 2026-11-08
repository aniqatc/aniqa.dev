// Content configuration for Astro: defines collections, fields, and validation rules.
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// Month in the format YYYY-MM
const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

// Month or full date in the format YYYY-MM or YYYY-MM-DD
const monthOrDay = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Use YYYY-MM or YYYY-MM-DD'),
);
// Every entry is a folder: <slug>/index.md (frontmatter = facts, ## sections = notes) and screenshot.png (from
// `npm run screenshots`). Experiments that run on the page also have sketch.ts or sketch.astro.
const folder = (base: string) =>
  glob({ pattern: '*/index.md', base, generateId: ({ entry }) => entry.replace(/\/index\.md$/, '') });

// Fields every entry has.
const base = z.object({
  title: z.string(), // the title of the project or experiment
  type: z.string(), // a label: Web app, Dashboard, Generative sketch…
  stack: z.string(), // the tech stack used in the project or experiment
  released: month, // the release date in YYYY-MM format
  live: z.string().optional(), // the live URL of the project, if hosted
  repo: z.string().optional(), // the GitHub repository name under github.com/aniqatc
  summary: z.string(), // a brief summary or lede for the detail page
  updated: monthOrDay.optional(), // the last revisited date; the 3 newest get an "Updated" tag (shown as the month)
  draft: z.boolean().default(false), // hidden from the portfolio and lab
  screenshotAlt: z.string().optional(), // what's on screen in screenshot.png
});

// Portfolio: src/content/projects/<slug>/ → /work/<slug>
const projects = defineCollection({
  loader: folder('./src/content/projects'), // locate all index.md files within the projects folder and generate slugs from folder names
  schema: base.extend({
    order: z.number().int().positive(), // position in Selected work
    blurb: z.string(), // one line for the portfolio card
  }),
});

// Lab: src/content/experiments/<slug>/ → /lab/<slug>. Links out to its own site, or runs its sketch on the page.
const experiments = defineCollection({
  loader: folder('./src/content/experiments'), // locate all index.md files within the experiments folder and generate slugs from folder names
  schema: base.extend({
    example: z.boolean().default(false), // placeholder entry that shows a layout
    hint: z.string().optional(), // with a sketch: shown under the stage, e.g. "Move to stir the field"
    // with a sketch: "frame" is a fixed 16:9 stage (square on phones) with Fullscreen, for canvas, p5, three
    // and CSS art; "fit" grows to its content and has no Fullscreen, for studies with controls
    stage: z.enum(['frame', 'fit']).default('frame'),
    themes: z.boolean().default(false), // with a sketch: a Day / Night switch under the stage
    // a "Before you start" box above the figure, for something the reader needs to know first
    // ("Made for a mouse", "The live site is down"). Use it rarely.
    headsUp: z.string().optional(),
    v1: z.url().optional(), // the first version's full URL (a CodePen), shown as "v1 ↗" in Links
    favorite: z.boolean().default(false), // one of my favorites: pinned in the Favorites group at the top of the lab
  }),
});

// A full date in the format YYYY-MM-DD (YAML reads an unquoted date as a Date, so turn it back into text)
const day = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
);
// A score from 1 to 5; 4–5 shows as "Polished", 3 "Getting there", 1–2 "Needs love" (src/lib/reviews.ts)
const score = z.number().int().min(1).max(5);
// An app's five scores, and a game's: first impression and pricing / value are shared, the middle three differ
const appScores = z.object({
  firstImpression: score,
  onboarding: score,
  usefulness: score, // does it do the job you'd get it for
  easeOfUse: score,
  value: score, // pricing / value
});
const gameScores = z.object({
  firstImpression: score,
  learningCurve: score, // how quickly it clicked, and whether the tutorial helped or got in the way
  fun: score, // is it actually fun to play
  feel: score, // controls, responsiveness, performance
  value: score, // pricing / value: the price against the hours you got out of it
});

// App reviews: src/content/reviews/<slug>/ → /reviews/<slug>. The frontmatter holds the facts and scores; the
// ## sections (First look, What I liked, Small ideas, Who it's for) are the review. Optional files in the folder:
// logo.png (the app's icon on the archive) and screenshot.png (the framed screenshot under the facts). A phone
// app can add screenshot-2.png and screenshot-3.png to show up to three screens side by side. A Mac app
// (device: desktop) is a screenshot of only the app (its window, popover or notch panel), placed on a Mac screen
// drawn around it.
const reviews = defineCollection({
  loader: folder('./src/content/reviews'),
  schema: z.object({
    app: z.string(), // the app's or game's name
    kind: z.enum(['app', 'game']).default('app'), // a game gets game scores, "Played on" and "Game review"
    maker: z.string().regex(/^[A-Za-z0-9_.-]+$/, 'The handle without the @'), // the maker's handle, shown as @maker
    makerLink: z.url().optional(), // where @maker links; their X profile (x.com/<maker>) when left out
    date: day, // the day the review went up
    updated: day.optional(), // the day of the latest ## Update: shown under the date, and to search engines
    type: z.string(), // a label: Web app, iOS app, Chrome extension…
    triedOn: z.string(), // where you tried it: "MacBook, Chrome", "iPhone 15"; for a game, where you played it: "PC, Steam Deck"
    live: z.string(), // a web app's address without https:// (tallyho.app), or a full App Store / Google Play link
    device: z.enum(['browser', 'phone', 'tablet', 'desktop', 'screen']).default('browser'), // the frame around the screenshot; screen is a plain 16:9 picture, for a PC or console game
    // with device: desktop, the Mac screen drawn around the app (src/components/MacScreen.astro): "window" for an
    // app's window on the desktop, "menubar" for a popover under its menu bar icon, "notch" for a panel that grows
    // out of the notch. screenshot.png is only the app, cropped with no background, as a 2× capture.
    desktop: z.enum(['window', 'menubar', 'notch']).default('window'),
    shadow: z.boolean().default(true), // with device: desktop, a Mac shadow under the app; false if the capture has one
    price: z.string().optional(), // what it costs, as you'd say it: Free, $4.99 one-time, $3/mo
    version: z.string().optional(), // the version you tried, e.g. 1.2.0
    played: z.string().optional(), // a game's time played, as you'd say it: 15 hours
    platforms: z.array(z.string()).optional(), // where it runs, e.g. [Mac, iOS, Web]
    post: z.url().optional(), // the review's post on X
    summary: z.string(), // one line on what the app does: the lede, and the card's description
    verdict: z.string(), // the one-word overall, e.g. Promising, Delightful, Solid
    quote: z.string().optional(), // a short line beside the verdict on the scorecard, e.g. "Can't wait to see where this goes"
    cardTheme: z.enum(['night', 'day']).default('night'), // the scorecard's and link preview's look
    stillBuilding: z.boolean().default(false), // an app still being built: a note under the scores that "needs love" means room to grow
    stillUsing: z.boolean().default(false), // still using it since the review: a star, and a place in Still using
    tryIt: z.string().optional(), // the Try it card's line under the maker, instead of the usual "Give it a go…" (e.g. for a mixed review or a big company's app)
    featured: z.boolean().default(false), // the home page intro shows this review under "Hooked on" instead of the newest
    brand: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #8b7cf6'), // the app's brand colour
    scores: z.union([appScores, gameScores]), // an app's or a game's five scores; checked against kind below
    screenshotAlt: z.string().optional(), // what's on screen in screenshot.png (and the other screens, for a phone)
    draft: z.boolean().default(false), // only shown on the dev server
  })
    // a game needs the game scores (learningCurve, fun, feel) and an app the app ones (onboarding, usefulness, easeOfUse)
    .superRefine((review, ctx) => {
      const isGame = 'fun' in review.scores;
      if (isGame !== (review.kind === 'game')) {
        ctx.addIssue({
          code: 'custom',
          path: ['scores'],
          message:
            review.kind === 'game'
              ? 'A game scores firstImpression, learningCurve, fun, feel and value'
              : 'An app scores firstImpression, onboarding, usefulness, easeOfUse and value (add kind: game for a game)',
        });
      }
    }),
});

// Export all defined collections so they can be used by the content system.
export const collections = { projects, experiments, reviews };
