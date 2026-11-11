// Lab archive: a floating preview follows the cursor over the rows. Mouse only;
// on touch screens the rows are plain links and the preview stays hidden (see the hover: none rule in lab.css).
// The motion (trailing, tilt, pop in and out) is shared with Selected work's preview, in follow-card.ts.
import { crossfade, followCard } from './follow-card';
import { onPage } from './page';

// Initialize the hover preview functionality when the page is ready.
onPage(() => {
  const tip = document.querySelector<HTMLElement>('.tip');
  const archive = document.querySelector<HTMLElement>('.archive');
  if (!tip || !archive) return;

  const media = tip.querySelector<HTMLElement>('.tip-media')!;
  const images = [...tip.querySelectorAll<HTMLImageElement>('.tip-image')];
  const sketches = [...tip.querySelectorAll<HTMLElement>('.tip-sketch')];
  const capTitle = tip.querySelector('.tip-cap b')!;
  const capInfo = tip.querySelector('.tip-cap span')!;
  const card = followCard(tip);
  const swap = crossfade([...images, ...sketches]);
  let current: string | undefined;
  let loaded = false;
  let shown = 0; // which of the two images holds the screenshot

  // Fill the preview with the content of the hovered row.
  const fill = (row: HTMLElement) => {
    if (row.dataset.slug === current) return;
    const slug = (current = row.dataset.slug);
    // if the card was hidden it just appears with the new content, since there's nothing to fade from
    const instant = !card.seen();
    capTitle.textContent = row.dataset.t ?? '';
    capInfo.textContent = row.dataset.u ?? '';
    // an entry that isn't a website shows its sketch, running; the rest show their screenshot
    const sketch = sketches.find((s) => s.dataset.sketchSlug === slug);
    const src = row.dataset.preview;
    media.hidden = !sketch && !src;
    if (sketch || !src) return swap(sketch ?? null, instant);
    // the screenshot goes in the image that isn't showing, and fades in once it's decoded (no blank flash)
    shown = 1 - shown;
    const next = images[shown];
    next.src = src;
    next
      .decode()
      .catch(() => {})
      .then(() => {
        if (current === slug) swap(next, instant);
      });
  };

  // the first hover fetches every row's small screenshot, so the next ones show straight away
  const loadAll = () => {
    if (loaded) return;
    loaded = true;
    archive.querySelectorAll<HTMLElement>('.row[data-preview]').forEach((row) => {
      new Image().src = row.dataset.preview!;
    });
  };

  // Event listeners for the archive rows to handle hover and pointer movements.
  archive.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    const row = (ev.target as Element).closest<HTMLElement>('.row');
    if (!row) return;
    loadAll();
    fill(row);
    // shown at the cursor itself, so it can't flash where it was last
    card.show(ev.clientX, ev.clientY);
  });
  archive.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') card.move(ev.clientX, ev.clientY);
  });
  archive.addEventListener('pointerout', (ev) => {
    const to = ev.relatedTarget as Element | null;
    if (!to?.closest('.row')) card.hide();
  });
  // Stop the animation frame when the page is unloaded or the component is destroyed.
  return () => card.stop();
});
