---
title: Time Tapestry
type: Full stack
stack: React / TypeScript / Supabase / Tailwind / Mantine / Astronomy Engine
released: 2025-02
live: tt.aniqa.dev
repo: time-tapestry
order: 2
updated: 2026-10
blurb: Birthdays, history and the night sky for any date, with birthdays you can save and share.
screenshotAlt: "[Time Tapestry in dark mode: describe what's on screen once the screenshot is taken]"
summary: A calendar that shows the birthdays, events and sky for any date. Save up to five birthdays of your own, privately or shared with everyone.
---

## Why

[Why you built it, in a short paragraph: what made you want a calendar of birthdays, history and the sky, and what you wanted to practise.]

## What it does

1. Pick a date to see notable birthdays and three historical events from that day, each linking to Wikipedia.
2. Save up to five birthdays with a one-time sign-in link. They're private unless you choose to share one.
3. The Moon's phase, rise and set, planetary positions, zodiac details and upcoming eclipses for the date.
4. Light and dark themes, and it installs as an app.

## Hardest part

Sharing a birthday without sharing who it belongs to. The relationship ("Son", "Friend") lives in its own table that only its owner can read, and the community sees a view of public birthdays without it. Postgres enforces both, along with the five-birthday limit, so the browser can't get around them.

## What I learned

1. Row-level security in Postgres: policies let owners read and delete their own birthdays, and everyone else read only the public ones.
2. Magic link sign-in with Supabase Auth and Resend, so saving a birthday doesn't need a password.
3. Astronomy Engine works out the Moon, planets and eclipses in the browser, with rise and set times for New York, so there's no astronomy API to call.
4. Wikimedia's On This Day feed: the three events with the most linked pages, and birthdays filtered down to people who are still living.
5. Zustand stores for the date, theme, sign-in and birthdays, shared across the sidebar and every tab.

## Revisited

1. Oct 2026: shared birthdays with Supabase and magic link sign-in, dark mode, live astronomy data on every tab, and a Playwright check in CI.
