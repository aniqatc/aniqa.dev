// Sätteri hast plugin: Wraps each `## Heading` in a project file, plus everything up to the next one, in a `<section>` element with appropriate classes and data attributes.

/**
 * Slugifies a string for use in section data attributes.
 * @param s The string to slugify.
 * @returns The slugified string.
 */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Checks if a node is an external link.
 * @param node The node to check.
 * @returns True if the node is an external link, false otherwise.
 */
const isExternalLink = (node) =>
  node.tagName === 'a' &&
  /^https?:\/\//.test(String(node.properties.href ?? '')) &&
  !/^https?:\/\/(www\.)?aniqa\.dev(\/|$)/.test(String(node.properties.href));

// A picture note: an image whose title is "note" (or "note: its caption") becomes a small chip in the line of
// text that opens the picture full size (ImageLightbox.astro), instead of a framed picture under the point.
// The <img> stays inside the chip, hidden, so Astro still finds and processes the file.
const PICTURE_NOTE_TITLE = /^note(?::\s*(.*))?$/s;

const PICTURE_ICON = {
  type: 'element',
  tagName: 'svg',
  properties: { viewBox: '0 0 16 16', ariaHidden: 'true' },
  children: [
    {
      type: 'element',
      tagName: 'rect',
      properties: { x: 1.5, y: 2.5, width: 13, height: 11, rx: 2.5 },
      children: [],
    },
    { type: 'element', tagName: 'circle', properties: { cx: 5.5, cy: 6.5, r: 1.3 }, children: [] },
    { type: 'element', tagName: 'path', properties: { d: 'M2.5 12l3.6-3.6 2.4 2.4 2-2 3 3' }, children: [] },
  ],
};

/**
 * Turns an image titled "note" into a picture note chip, or returns undefined for any other node.
 * @param node The node to check.
 * @returns The chip element, or undefined.
 */
const pictureNote = (node) => {
  if (node.tagName !== 'img') return undefined;
  const match = PICTURE_NOTE_TITLE.exec(String(node.properties.title ?? '').trim());
  if (!match) return undefined;
  const imageProperties = { ...node.properties };
  delete imageProperties.title;
  const caption = match[1]?.trim();
  return {
    type: 'element',
    tagName: 'span',
    properties: {
      className: ['picture-note'],
      role: 'button',
      tabIndex: 0,
      ariaLabel: `Open picture: ${imageProperties.alt ?? ''}`,
      ...(caption ? { dataCaption: caption } : {}),
    },
    children: [
      structuredClone(PICTURE_ICON),
      {
        type: 'element',
        tagName: 'span',
        properties: { ariaHidden: 'true' },
        children: [{ type: 'text', value: '↗' }],
      },
      { type: 'element', tagName: 'img', properties: { ...imageProperties, hidden: true }, children: [] },
    ],
  };
};

// An update tag: inline code that reads "Shipped in 1.4" or "Fixed in 1.4" becomes a small tag with a tick
// (styled in reviews.css), for an idea the maker built or a gripe that's gone after a review's update.
const UPDATE_TAG = /^(Shipped|Fixed) in \S.*$/;

/**
 * Turns inline code reading "Shipped in …" or "Fixed in …" into an update tag, or returns undefined for any other node.
 * @param node The node to check.
 * @returns The tag element, or undefined.
 */
const updateTag = (node) => {
  if (node.tagName !== 'code' || node.children.length !== 1 || node.children[0].type !== 'text')
    return undefined;
  const text = node.children[0].value.trim();
  if (!UPDATE_TAG.test(text)) return undefined;
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['update-tag'] },
    children: [{ type: 'text', value: `${text} ✓` }],
  };
};

/**
 * Wraps text between ~~ and ~~ in <del>, for a line that's no longer true after an update. The struck part can
 * hold other inline bits (a link, a picture note). An opening ~~ with no closing one is left as written.
 * (If the Markdown processor already made <del> from ~~, there's no ~~ left and this changes nothing.)
 * @param children The converted children of one element.
 * @returns The children, with each struck part inside a <del>.
 */
const strikeThrough = (children) => {
  if (!children.some((n) => n.type === 'text' && n.value.includes('~~'))) return children;
  const out = [];
  let del = null; // the open <del>, between a ~~ and its closing ~~
  const add = (n) => (del ? del.children : out).push(n);
  for (const n of children) {
    if (n.type !== 'text') {
      add(n);
      continue;
    }
    n.value.split('~~').forEach((part, i) => {
      if (i > 0) {
        if (del) {
          out.push(del);
          del = null;
        } else {
          del = { type: 'element', tagName: 'del', properties: {}, children: [] };
        }
      }
      if (part) add({ type: 'text', value: part });
    });
  }
  // no closing ~~: put the text back the way it was written
  if (del) out.push({ type: 'text', value: '~~' }, ...del.children);
  return out;
};

const isNote = (n) => n.type === 'element' && n.properties.className?.includes('picture-note');

/**
 * Keeps each picture note on the same line as the word before it and the punctuation after it, so a line never
 * starts with a lone chip or a full stop. Splits those off the neighbouring text into a span that doesn't wrap.
 * @param children The converted children of one element.
 * @returns The children, with each chip wrapped together with its neighbours.
 */
const glueNotes = (children) => {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const n = children[i];
    if (!isNote(n)) {
      out.push(n);
      continue;
    }
    const glued = [];
    // the last word of the text before, with its space before the chip, or a whole _italic_ or **bold** bit
    // right before it, like "(I won't)"
    const before = out.at(-1);
    if (before?.type === 'element' && ['em', 'strong'].includes(before.tagName)) {
      glued.push(out.pop());
    } else if (
      before?.type === 'text' &&
      /^\s+$/.test(before.value) &&
      ['em', 'strong'].includes(out.at(-2)?.tagName)
    ) {
      glued.push(...out.splice(-2));
    } else if (before?.type === 'text') {
      const match = /\S+\s*$/.exec(before.value);
      if (match) {
        before.value = before.value.slice(0, match.index);
        if (!before.value) out.pop();
        glued.push({ type: 'text', value: match[0] });
      }
    }
    glued.push(n);
    // punctuation straight after the chip: . , : ; ) and the like
    const after = children[i + 1];
    if (after?.type === 'text') {
      const match = /^[.,:;!?)\]…’”]+/.exec(after.value);
      if (match) {
        glued.push({ type: 'text', value: match[0] });
        after.value = after.value.slice(match[0].length);
        if (!after.value) i++;
      }
    }
    out.push({
      type: 'element',
      tagName: 'span',
      properties: { className: ['picture-note-glue'] },
      children: glued,
    });
  }
  return out;
};

// Creates a plain copy of a node, with external links modified to open in a new tab.
const plain = (n) => {
  if (n.type === 'element') {
    const note = pictureNote(n);
    if (note) return note;
    const tag = updateTag(n);
    if (tag) return tag;
    const properties = { ...n.properties };
    if (isExternalLink(n)) {
      properties.target = '_blank';
      properties.rel = ['noopener'];
    }

    // Return a plain copy of the node, with external links modified as needed.
    return {
      type: 'element',
      tagName: n.tagName,
      properties,
      children: glueNotes(strikeThrough(n.children.map(plain))),
    };
  }

  // Return a plain copy of a non-element node (e.g., text node).
  return { type: n.type, value: n.value };
};

/**
 * Checks if a node is a paragraph that's only one _italic_ bit: an Update section's first line, its date and
 * version, like "_Dec 12, 2026 · version 1.4_".
 * @param node The node to check.
 * @returns True if the paragraph is only an <em>, false otherwise.
 */
const isItalicLine = (node) => {
  if (node.type !== 'element' || node.tagName !== 'p') return false;
  const parts = node.children.filter((n) => !(n.type === 'text' && /^\s*$/.test(n.value)));
  return parts.length === 1 && parts[0].type === 'element' && parts[0].tagName === 'em';
};

/** @type {import('@astrojs/markdown-satteri').SatteriProcessorOptions['hastPlugins'][number]} */
// This plugin processes the Markdown AST to wrap each `## Heading` and its following content in a `<section>` element.
export const sections = {
  name: 'sections',
  // This hook is called after the Markdown AST has been processed
  after(root, ctx) {
    const out = [];
    let body = null;
    let isUpdate = false; // the current section is an ## Update
    // Iterate over each child node of the root
    for (const child of root.children) {
      // Create a plain copy of the current child node.
      const node = plain(child);

      // If the node is an `h2` heading, start a new section.
      if (node.type === 'element' && node.tagName === 'h2') {
        // Add the 'label' class to the heading node.
        node.properties.className = ['label'];
        // Create a new body container for the section content.
        body = { type: 'element', tagName: 'div', properties: {}, children: [] };
        isUpdate = slugify(ctx.textContent(child)) === 'update';
        // Push the new section to the output array.
        out.push({
          type: 'element',
          tagName: 'section',
          properties: { className: ['sec'], dataSec: slugify(ctx.textContent(child)) },
          children: [node, body],
        });
      } else if (body) {
        // An ## Update section's first line, in italics, is its date and version: shown like the facts.
        if (isUpdate && body.children.every((n) => n.type === 'text') && isItalicLine(node)) {
          node.properties.className = ['update-date'];
        }
        // Append the current node to the body of the active section.
        body.children.push(node);
      } else {
        // If there is no active section, push the node directly to the output array.
        out.push(node);
      }
    }
    // Replace the root node with the new structure containing sections.
    ctx.replaceNode(root, { type: 'root', children: out });
  },
};
