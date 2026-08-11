import { defineConfig } from 'astro/config';

// site/base get set when the GitHub Pages repo exists.
// For a repo at github.com/<user>/legasis served from <user>.github.io/legasis,
// set base: '/legasis'. For a custom domain, leave base undefined.
export default defineConfig({
  site: 'https://legasis.example.com',
  build: { inlineStylesheets: 'auto' },
});
