import { defineConfig } from 'astro/config';

// Served from https://digitalwestern.github.io/legasis, so the project name has
// to be the base path. On a custom domain later: set `site` to that domain and
// delete `base` entirely — otherwise every asset 404s under /legasis.
export default defineConfig({
  site: 'https://digitalwestern.github.io',
  base: '/legasis',
  build: { inlineStylesheets: 'auto' },
});
