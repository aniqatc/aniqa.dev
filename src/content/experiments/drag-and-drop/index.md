---
title: Drag and Drop
type: JS study
stack: Pointer Events / JS
released: 2023-11
updated: 2026-11-06
stage: fit
v1: https://codepen.io/aniqatc/pen/NWodPMO
hint: Drag the ball · turn the offset off
screenshotAlt: 'Drag and Drop’s stage: Grab offset, Keep inside and Throw checkboxes above a dotted board with a ball in the middle, its top-left corner marked with its left and top.'
summary: Drag the ball. The page draws the offset you need so it doesn't jump to your pointer.
---

## Idea

I wanted to see how drag and drop works by building it myself: following the pointer as you press, move and let go. I made it before I knew the browser has its own drag and drop (`draggable`, `dragstart` and `drop`).

## Notes

1. `left` and `top` place the top-left corner, so the grab point has to be remembered.
2. Pointer events with `setPointerCapture` work on phones too, and letting go outside the ball still ends the drag.
3. Throw adds a little momentum and bounce when you let go.

## Revisited

1. Nov 2023: first version, made on CodePen ([v1](https://codepen.io/aniqatc/pen/NWodPMO)).
2. Nov 2026: redesigned for the lab. The offset maths is drawn on the board with live numbers, the arrow keys move the ball, and I fixed the pen's leftover `mouseup` listeners.
