# Legasis Records — landing page

Static site. Astro builds it, GitHub Pages serves it. No server, no database,
nothing to keep running.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # → dist/
```

## Editing content

Almost everything Haley will want to change lives in **`src/config.js`** — label
name, city clock, email, social links, the roster, the catalogue, the services
list. Change it there, not in the components.

Headline copy sits in the component for each section (`src/components/`).

## Adding real photos

Drop files into `public/media/`, then pass `src` to the `<Media>` component:

```astro
<Media src="/media/artist-01.jpg" alt="…" ratio="3 / 4" />
```

Without `src` it renders a generated panel instead — a lit sleeve, a red-cast
field, or a vinyl-groove texture, picked deterministically from the `seed`.
Layout, aspect ratio and the roster's cursor-driven image field all keep working
either way, so photos can arrive one at a time.

## The chrome wordmark

`public/logo.png` is a transparent cut-out generated from the original
`Logo.png`, which shipped with a solid black background.

On desktop, `src/scripts/chrome-logo.js` paints over it with a WebGL shader:
the artwork's own baked-in bevel lighting is treated as a height field, sobelled
into a surface normal, and used to reflect a procedural studio environment. That
environment rotates with the pointer and drags with scroll, so the metal stays
alive while the wordmark never moves.

It falls back to the flat PNG on mobile, under reduced-motion, on data-saver
connections, and if WebGL fails to initialise — the `<img>` is always the real
content and the canvas only fades in once the shader is confirmed running.

To regenerate the cut-out after a logo change, the alpha comes from luminance:
anything above ~9% brightness is opaque, the black ground falls away.

## Deploying to GitHub Pages

1. Create a repo and push:

   ```bash
   git remote add origin git@github.com:<user>/legasis.git
   git push -u origin main
   ```

2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**. That's the only setting to change.

3. `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

4. **Set the URL in `astro.config.mjs`.** Serving from
   `<user>.github.io/legasis` needs `base: '/legasis'` as well as `site`. On a
   custom domain, set `site` to that domain and leave `base` off.

Custom domain: add it under Settings → Pages, and put the same domain in a
`public/CNAME` file so it survives each deploy.

## Performance

71 kB of gzipped JavaScript, almost all of it GSAP. The shader is ~3 kB and
loads on idle, after the page is interactive. No third-party requests at
runtime — fonts are self-hosted, and there is no analytics or tag manager.

## Motion

`src/scripts/motion.js` holds every animation:

| | |
|---|---|
| Curtain wipe | Two panels that open on load and close before navigation |
| Smooth scroll | GSAP ScrollSmoother |
| Heading reveals | SplitText, per character. Anything above the fold plays on load rather than waiting for a scroll trigger it is already past |
| Featured | Pinned; the panel bleeds out to full frame as you scrub |
| Roster field | Cursor position picks one of eight panels on a 2×4 grid; cuts rather than crossfades |
| Catalogue | Pinned horizontal scrub on desktop, drag with inertia on touch, native scrolling under reduced motion |
| Services | Rows shear sideways in alternating directions |

`prefers-reduced-motion` disables the smoother, every pin, and every scrub, and
the page stays fully readable and navigable. It is also readable with
JavaScript off entirely.
