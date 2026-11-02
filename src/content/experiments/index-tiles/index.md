---
title: Index Tiles
type: CSS study
stack: CSS custom properties / calc()
released: 2023-10
updated: 2026-11
stage: fit
themes: true
v1: https://codepen.io/aniqatc/pen/dywwaWR
hint: Adjust a value · pick a tile
screenshotAlt: 'Index Tiles in Day mode with tile 7 selected: five variable sliders sit above a four-by-four grid and a sheet showing the tile’s CSS and calculated values.'
summary: Sixteen tiles use their index to set colour, angle, corner radius and spin timing. Adjust the shared values, pick a tile, and see how its properties are calculated.
---

## Idea

I wanted to see how one index could drive several CSS properties, and how changing the base hue and hue step shifts the HSL colors across all sixteen tiles.

## Notes

1. Each tile gets a different `--i` value. `calc()` uses it to set the hue, angle, corner radius, spin duration and delay.
2. Changing one shared value updates all sixteen tiles. Picking a tile shows the values behind its style.

## Revisited

1. Oct 2023: first made on CodePen ([v1](https://codepen.io/aniqatc/pen/dywwaWR)).
2. Nov 2026: rebuilt for the lab with adjustable values and details for each tile.
