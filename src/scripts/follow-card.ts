// Shared by the two hover previews (Selected work in work-preview.ts, the lab archive in hover-preview.ts), so they
// move the same way: the card trails the cursor a little and settles, leans into sideways moves, and pops in and
// out (the pop and the fades are CSS, in follow-card.css). With reduced motion it sits right by the cursor and
// only fades.

const GAP = 24; // between the cursor and the card
const EDGE = 16; // the card never comes closer than this to the window's edges
const FOLLOW = 0.2; // share of the way to the cursor it covers each 60fps frame: a short trail, settled in ~1/4 s
const LEAN = 0.3; // degrees of tilt per pixel per frame of sideways speed
const MAX_LEAN = 4;
const FRAME = 1000 / 60;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export interface FollowCard {
  /** pop the card in by the cursor; straight onto it if it was hidden, so it never slides in from an old spot */
  show(x: number, y: number): void;
  move(x: number, y: number): void;
  hide(): void;
  /** whether it's showing now, or still fading out (so a swap of its content should crossfade) */
  seen(): boolean;
  stop(): void;
}

export function followCard(card: HTMLElement): FollowCard {
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  let x = 0;
  let y = 0;
  let left = 0;
  let top = 0;
  let toLeft = 0;
  let toTop = 0;
  let lean = 0;
  let last = 0;
  let raf = 0;

  // where it wants to be: to the right of the cursor, flipped left near the edge, and always inside the window
  const aim = () => {
    const width = card.offsetWidth;
    const height = card.offsetHeight;
    let to = x + GAP;
    const flip = to + width > innerWidth - EDGE;
    if (flip) to = x - width - GAP;
    toLeft = Math.max(EDGE, to);
    toTop = clamp(y - height / 2, EDGE, innerHeight - height - EDGE);
    return flip;
  };
  const draw = () => {
    card.style.transform = `translate(${left}px,${top}px) rotate(${lean}deg)`;
  };

  const tick = (now: number) => {
    // measured in frames, so it trails the same on a 60Hz and a 120Hz screen (and catches up after a hitch)
    const frames = last ? Math.min(4, (now - last) / FRAME) : 1;
    last = now;
    aim();
    const k = calm.matches ? 1 : 1 - Math.pow(1 - FOLLOW, frames);
    const step = (toLeft - left) * k;
    left += step;
    top += (toTop - top) * k;
    const want = calm.matches ? 0 : clamp((step / frames) * LEAN, -MAX_LEAN, MAX_LEAN);
    lean += (want - lean) * k;
    // close enough: land exactly and stop, so nothing runs while the cursor rests
    if (Math.abs(toLeft - left) < 0.2 && Math.abs(toTop - top) < 0.2 && Math.abs(lean) < 0.05) {
      left = toLeft;
      top = toTop;
      lean = 0;
      raf = 0;
    } else raf = requestAnimationFrame(tick);
    draw();
  };
  const run = () => {
    if (raf) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };

  const seen = () => card.classList.contains('show') || Number(getComputedStyle(card).opacity) > 0.02;

  return {
    show(nx, ny) {
      x = nx;
      y = ny;
      if (!seen()) {
        const flip = aim();
        left = toLeft;
        top = toTop;
        lean = 0;
        // it grows out of the side the cursor is on
        card.style.transformOrigin = `${flip ? 'right' : 'left'} ${clamp(y - top, 0, card.offsetHeight)}px`;
        draw();
      }
      card.classList.add('show');
      run();
    },
    move(nx, ny) {
      x = nx;
      y = ny;
      run();
    },
    hide() {
      card.classList.remove('show');
    },
    seen,
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
}

// Swaps what a card shows between stacked layers: the old one blurs out as the next blurs in (follow-card.css).
// Layers that aren't showing end up hidden, so a running sketch in one stops drawing.
export function crossfade(layers: HTMLElement[]) {
  const timers = new Map<HTMLElement, number>();
  return (next: HTMLElement | null, instant = false) => {
    layers.forEach((layer) => {
      const on = layer === next;
      if (on === layer.classList.contains('on')) return;
      clearTimeout(timers.get(layer));
      if (instant) layer.style.transition = 'none';
      if (on) {
        layer.hidden = false;
        void layer.offsetWidth; // so the fade starts from hidden rather than skipping to the end
        layer.classList.add('on');
      } else {
        layer.classList.remove('on');
        if (instant) layer.hidden = true;
        else
          timers.set(
            layer,
            window.setTimeout(() => (layer.hidden = true), 260),
          );
      }
      if (instant) {
        void layer.offsetWidth;
        layer.style.transition = '';
      }
    });
  };
}
