---
title: Link Hovers
type: CSS study
stack: CSS transitions / keyframes / @property
released: 2022-12
updated: 2026-10-31
stage: fit
themes: true
v1: https://codepen.io/aniqatc/pen/YzjqENY
hint: Hover a card, tab to it, or tap it
headsUp: Made for a mouse. On a phone or tablet, tap a card to play its hover, or switch on Show every hover state.
screenshotAlt: 'Link Hovers’ stage in Day mode: a Show every hover state switch above a grid of twenty cards, each with one example link and the name of its CSS trick.'
summary: Twenty ways for a link to react when you point at it, each made with one small CSS trick.
---

## Idea

I wanted a set of link hover effects, and I used it as practice: each one uses a different CSS trick, as many as I could think of.

## Notes

1. Every effect is one trick: a growing background, a pseudo-element, a text shadow or a keyframe.
2. The countdown uses `@property`, so `--countdown` animates as a whole number from 8 to 0.
3. The whole card is the hover target, and keyboard focus and taps play it too.
4. Night is worth a look: Difference inverts the other way on a dark card, and Glow and Stack only really show up there.

## Revisited

1. Dec 2022: first version, made on CodePen ([v1](https://codepen.io/aniqatc/pen/YzjqENY)).
2. Oct 2026: redesigned for the lab. Kept all 20 and toned down the loud ones (4, 6, 17, 18), named the trick on each card, and added a switch that shows every hover state at once.
