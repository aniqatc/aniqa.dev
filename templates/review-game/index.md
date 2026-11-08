---
# Game review → /reviews/<slug> (made by npm run new -- --kind review --game)
# src/content/reviews/<slug>/index.md (this file), plus optional files in the same folder:
#   logo.png        the game's icon on /reviews (square, 300 × 300 or larger); without it, its first letter on `brand`
#   screenshot.png  the screenshot under the facts: for a PC or console game (device: screen), a 16:9 in-game shot
#                   (1920 × 1080 or 2560 × 1440, no menus or HUD you don't want shown); for a phone, iPad or Mac
#                   game, the same as an app (see templates/review/index.md)
#   any other images you put under "What I liked"
#   scorecard.png   the picture for the post on X, made by npm run scorecard -- <slug>
app: Game Name
kind: game # game scores, "Played on", "Game review" and "Still playing"
maker: handle # the studio's or developer's handle, without the @; it links to their X profile
# makerLink: https://bsky.app/profile/handle # optional: link @maker somewhere else instead (Bluesky, their site…)
date: 2026-10-30 # YYYY-MM-DD, the day the review goes up
type: PC game # PC game, Switch game, iOS game, Mac game…
triedOn: PC # where you played it: PC, Steam Deck, Switch, iPhone… (shown as Played on)
# played: 15 hours # optional: your time played, as you'd say it
live: https://store.steampowered.com/app/… # the store page: Steam, itch.io, App Store… (the link says Steam ↗, itch.io ↗…)
device: screen # screen (a plain 16:9 screenshot) for PC and console; phone, tablet or desktop for a phone, iPad or Mac game
# price: $19.99 # optional: Free, $19.99, Free with in-app purchases
# version: 1.2.0 # optional: the version or patch you played
# platforms: [PC, Switch, PS5] # optional: where it's out
# post: https://x.com/aniqatc/status/… # optional: the review's post on X
summary: One line on what the game is, for the top of the page.
verdict: Promising # one word for Overall: Promising, Delightful, Solid…
# quote: One more run, every time # optional: a short line beside the verdict on the scorecard
# cardTheme: day # optional: the scorecard and link preview in the lab's light colours (night by default)
# stillBuilding: true # optional: early access or still being built; adds a note under the scores that “needs love” means room to grow
# stillUsing: true # optional, later: you're still playing it; it gets a star ("Still playing it") and a place in Still using
# updated: 2026-12-12 # optional, later: the day of your latest ## Update (see Updating a review in the README)
# tryIt: That's how it went for me. Everyone plays differently, so you might land somewhere else. # optional: the Try it card's line, instead of the usual "Give it a go…" (for a mixed review or a big studio's game)
# featured: true # optional: the home page intro shows this review under Hooked on instead of the newest one
brand: '#8b7cf6' # the game's brand colour, in quotes
scores: # 1 to 5: 4–5 shows as Polished, 3 Getting there, 1–2 Needs love
  firstImpression: 4
  learningCurve: 4 # how quickly it clicked, and whether the tutorial helped or got in the way
  fun: 5 # is it actually fun to play
  feel: 4 # controls, responsiveness, performance
  value: 4 # pricing / value: the price against the hours you got out of it
screenshotAlt: What's on screen in screenshot.png. # delete if there's no screenshot
draft: true # shows on npm run dev only; delete when it's ready to go up
---

## First look

Two or three sentences on the first session: the opening, the tutorial, and the moment it clicked (or didn't).
Keep story spoilers out, or say so first: _(spoiler for the first boss)_.

## What I liked

1. A specific thing that worked: a mechanic, the art, the music, how a level is built. To show it, leave a blank
   line, then the image (it opens full size on click) and an _italic_ caption:

   ![What's in the picture](./liked-detail.png)
   _What the picture shows_

2. Or keep the picture out of the way with a picture note
   ![What's in the picture](./liked-detail.png "note: What the picture shows") right after the words it shows.

3. A point doesn't need a picture.

## Small ideas

1. A gentle suggestion: a setting, a quality-of-life fix, an accessibility option.
2. Another idea, ideally small enough to land in a patch.

## Who it's for

One sentence on who would love this game, and what it's like (if you liked X, you'll like this).
