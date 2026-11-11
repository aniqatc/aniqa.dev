// Portfolio Selected work: a floating screenshot follows the cursor over the rows. Mouse only;
// on touch screens the rows are plain links and the preview stays hidden (see the hover: none rule in WorkPreview).
// The motion (trailing, tilt, pop in and out) is shared with the lab's preview, in follow-card.ts.
import { crossfade, followCard } from './follow-card';
import { onPage } from './page';

onPage(() => {
  const preview = document.querySelector<HTMLElement>('.work-preview');
  const list = document.querySelector<HTMLElement>('.projects');
  if (!preview || !list) return;

  const images = [...preview.querySelectorAll<HTMLImageElement>('.work-preview-image')];
  const rows = [...list.querySelectorAll<HTMLElement>('.project')];
  const card = followCard(preview);
  const swap = crossfade(images);
  let current: string | undefined;
  let loaded = false;
  let shown = 0; // which of the two images is showing

  // the first hover fetches every row's small screenshot, so the next ones show straight away
  const loadAll = () => {
    if (loaded) return;
    loaded = true;
    rows.forEach((row) => {
      if (row.dataset.preview) new Image().src = row.dataset.preview;
    });
  };

  // the new screenshot goes in the image that isn't showing, and fades in once it's decoded (no blank flash);
  // if the card was hidden it just appears, since there's nothing to fade from
  const fill = (src: string) => {
    if (src === current) return;
    current = src;
    const instant = !card.seen();
    shown = 1 - shown;
    const next = images[shown];
    next.src = src;
    next
      .decode()
      .catch(() => {})
      .then(() => {
        if (current === src) swap(next, instant);
      });
  };

  list.addEventListener('pointerover', (ev) => {
    if (ev.pointerType !== 'mouse') return;
    loadAll();
    const row = (ev.target as Element).closest<HTMLElement>('.project');
    if (!row?.dataset.preview) return;
    fill(row.dataset.preview);
    card.show(ev.clientX, ev.clientY);
  });
  list.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'mouse') card.move(ev.clientX, ev.clientY);
  });
  list.addEventListener('pointerout', (ev) => {
    const to = ev.relatedTarget as Element | null;
    if (!to?.closest('.project')) card.hide();
  });
  return () => card.stop();
});
