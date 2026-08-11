/**
 * Resolve a path in /public against the configured base.
 *
 * The site is served from a subpath on GitHub Pages, and Astro does not rewrite
 * hardcoded absolute URLs — so every reference to something in /public has to
 * go through here or it 404s in production while working fine in dev.
 */
const base = import.meta.env.BASE_URL;

export const asset = (path) => `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
