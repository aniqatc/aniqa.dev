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

// Creates a plain copy of a node, with external links modified to open in a new tab.
const plain = (n) => {
  if (n.type === 'element') {
    const note = pictureNote(n);
    if (note) return note;
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
      children: n.children.map(plain),
    };
  }

  // Return a plain copy of a non-element node (e.g., text node).
  return { type: n.type, value: n.value };
};

/** @type {import('@astrojs/markdown-satteri').SatteriProcessorOptions['hastPlugins'][number]} */
// This plugin processes the Markdown AST to wrap each `## Heading` and its following content in a `<section>` element.
export const sections = {
  name: 'sections',
  // This hook is called after the Markdown AST has been processed
  after(root, ctx) {
    const out = [];
    let body = null;
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
        // Push the new section to the output array.
        out.push({
          type: 'element',
          tagName: 'section',
          properties: { className: ['sec'], dataSec: slugify(ctx.textContent(child)) },
          children: [node, body],
        });
      } else if (body) {
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
