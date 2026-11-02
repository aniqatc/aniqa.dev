---
title: Transform Tiles
type: CSS study
stack: CSS transforms / Web Animations API
released: 2023-10
updated: 2026-11
stage: fit
themes: true
v1: https://codepen.io/aniqatc/pen/gOqpYGz
hint: Hover or focus a tile to pause it · adjust speed and perspective
screenshotAlt: 'Transform Tiles in Day mode: the first eight coloured squares appear in four-column rows, showing translate, scale and rotate transforms with their starting positions and transform origins marked.'
summary: Twelve animated squares show what each CSS transform does. Pause them, change the speed or perspective, and hover or focus a tile to read its current value.
---

## Idea

I wanted to see what each CSS transform does. The dashed square marks where a tile starts, so it’s easy to compare as it moves, stretches or turns.

## Notes

1. I used the Web Animations API to run each tile through the original keyframes. The readout follows along and shows its current transform.
2. Hover or focus a tile to pause it and check its value. Pause stops every tile; Speed slows them all down.
3. Perspective only affects the last two tiles. Changing it keeps those animations at the same point, so they don't jump back to the start.
4. With reduced motion on, the tiles start paused at a point where each transform is visible.

## Revisited

1. Oct 2023: first version, made on CodePen ([v1](https://codepen.io/aniqatc/pen/gOqpYGz)).
2. Nov 2026: rebuilt it for the lab with Day and Night colours.
