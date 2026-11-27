---
# Portfolio project (Selected work) → /work/<slug>
# src/content/projects/<slug>/index.md (this file) + screenshot.png (npm run screenshots)
title: Project Name
type: Web app # Full stack, Web app, Dashboard, CLI tool, Landing page…
stack: React / TypeScript / Vite # " / " between each tool
released: 2026-10 # YYYY-MM
live: name.aniqa.dev # host only, no https://; delete if there's no live site
repo: repo-name # repo under github.com/aniqatc; delete if private
order: 6 # position in Selected work (1 = first)
# updated: 2026-10 # optional: last time you revisited it; the 3 newest get an "Updated" tag
# draft: true # optional: hide it from the portfolio and lab until it's ready
blurb: One line for the portfolio card, about 15 words.
screenshotAlt: What's on screen in screenshot.png, for the case study. # take it with npm run screenshots
summary: Two sentences for the top of the case study. What it is and what it does.
# ---------- Optional: a launch, for something people buy (src/content/projects/little-doors is a full example) ----------
# price adds a Price fact and a "Get it" button under the lede; launch swaps the screenshot for the app on a Mac
# screen and a gallery, and ends the page with Get it and an email sign-up to the launch's own Loops list.
# price: '$4.99'
# priceNote: 'Launch price' # a quieter line under the price
# requires: 'macOS 13 or later'
# getUrl: https://example.app/buy # where Get it goes; the live site if left out
# extraLinks: # after Live ↗, e.g. the Show HN post
#   - { label: 'Show HN', href: 'https://news.ycombinator.com/item?id=…' }
# featuredOn: # shown as a "Featured on" fact
#   - { label: 'Site name', href: 'https://…' }
# launch:
#   desktop: menubar # menubar (a popover), window or notch, as for Mac app reviews
#   screen: ./screen.png # a 2× capture of only the app, no background
#   screenAlt: What's in the capture.
#   logo: ./logo.png # the app icon
#   brand: '#8b7cf6' # warms the wallpaper
#   gallery: # four to a row; each opens full size
#     - { src: ./gallery-1.jpg, alt: What's in it., caption: A short caption. }
#   giftUrl: https://example.app/gift # adds Gift it ↗
#   signup: # needs LOOPS_API_KEY on Vercel
#     loopsList: list-id # Loops → Audience → Mailing lists
#     title: 'The next edition'
#     text: 'Get one email when the next one is out.'
---

## Why

Why you built it, in a short paragraph.

<!-- Optional: delete if the summary already covers it -->

## What it does

1. A key feature, in one line.
2. Another one.

<!-- Optional: delete if it doesn't apply -->

## Hardest part

The one problem that took the most work, and how you solved it.

## What I learned

1. A specific technique, with what it let you do.
2. Another one.
3. Another one.

<!-- Optional: dated list of later changes -->

## Revisited

1. Oct 2026: what changed.
