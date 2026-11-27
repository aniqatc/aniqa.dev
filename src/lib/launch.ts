// A case study for something people buy (a "launch"): the facts under its lede and where Get it goes. The parts
// on the page are GetItButton, LaunchHero and LaunchEnd in src/components; the fields are in content.config.ts.
import { fmtMonth, links, type Project } from './projects';

/** A fact under the lede (Facts.astro): text, or a row of links. */
type Fact = {
  label: string;
  value: string | { label: string; href: string }[];
  note?: string;
};

/** "Site" → "Site ↗", for links that leave the site. */
const outbound = (link: { label: string; href: string }) => ({ ...link, label: `${link.label} ↗` });

/**
 * The facts under a case study's lede: Price and Requires first when it's for sale, then Released, Type, Stack
 * and Links (with any extra links), then Featured on when it has been.
 */
export function factsFor(project: Project): Fact[] {
  const { price, priceNote, requires, released, type, stack, extraLinks, featuredOn } = project.data;
  return [
    ...(price ? [{ label: 'Price', value: price, note: priceNote }] : []),
    ...(requires ? [{ label: 'Requires', value: requires }] : []),
    { label: 'Released', value: fmtMonth(released) },
    { label: 'Type', value: type },
    { label: 'Stack', value: stack },
    { label: 'Links', value: [...links(project), ...extraLinks.map(outbound)] },
    ...(featuredOn.length ? [{ label: 'Featured on', value: featuredOn.map(outbound) }] : []),
  ];
}

/** Where Get it goes: getUrl, else the live site. Undefined when it isn't for sale (no price). */
export function getItHref(project: Project): string | undefined {
  const { price, getUrl, live } = project.data;
  if (!price) return undefined;
  return getUrl ?? (live ? `https://${live}` : undefined);
}
