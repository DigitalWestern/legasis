# Legasis Records

The label's landing page. Astro builds static files, GitHub Pages serves them.
Nothing runs on a server, so there's nothing to pay for and nothing that goes to
sleep.

Live at <https://digitalwestern.github.io/legasis/>

```bash
npm install
npm run dev      # localhost:4321
npm run build    # → dist/
```

Push to `main` and it rebuilds and redeploys itself in about 40 seconds.

## Changing the words

Start in `src/config.js`. The label name, city clock, email, social links,
roster, catalogue and services list all live there. Headlines sit in the
individual components under `src/components/`.

Two values in that file are still made up: the `demos@` address and the Los
Angeles timezone. The email is a live `mailto:` link, so anyone who clicks it
right now is writing into the void. Fix it before sharing this around.

## Photos

Drop files into `public/media/` and hand the path to `<Media>`:

```astro
<Media src="/media/artist-01.jpg" alt="…" ratio="3 / 4" />
```

Leave `src` off and you get a generated panel instead. A lit sleeve, a red-cast
field, or vinyl grooves, chosen from the `seed` string so a given slot looks the
same on every build. Swapping a generated panel for a real photo doesn't touch
the layout or any of the scroll behaviour, so pictures can go in one at a time
as they arrive.

## The chrome wordmark

`public/logo.png` is a cut-out made from the original `Logo.png`, which shipped
on a solid black background and dragged a visible box around with it. The alpha
comes from luminance: anything brighter than roughly 9% survives, the black
ground doesn't.

On desktop, `src/scripts/chrome-logo.js` paints over that PNG with a fragment
shader. The artwork already has its bevel lighting baked in, so its luminance
doubles as a height field. Sobel that and you have a surface normal. Reflect a
ray off the normal into a procedural studio (three softbox strips, a lit
ceiling, a dark floor, one red kick) and you get metal, because reflection is
most of what makes chrome look like chrome. The studio rotates with the pointer
and drags as you scroll, which is why the logo feels alive while never actually
moving.

The `<img>` is always the real content. The canvas only fades in once the shader
is confirmed working, so mobile, reduced-motion, data-saver connections and any
WebGL failure all quietly keep the flat PNG.

## Deploying

Already wired. `.github/workflows/deploy.yml` builds and publishes on every push
to `main`, and Pages takes its build from Actions.

The thing that will bite you is **`base` in `astro.config.mjs`**. The site lives
at a subpath, so every asset needs a `/legasis` prefix, which is what
`src/asset.js` exists to do. Move to a custom domain and you set `site` to that
domain and delete `base` entirely. Leave `base` in place and every asset 404s
under a path that no longer exists.

For a custom domain, add it under Settings → Pages and put the same domain in
`public/CNAME` so it survives each deploy.

## Speed

71 kB of gzipped JavaScript, and nearly all of that is GSAP. The shader is 3 kB
and loads on idle, once the page is already interactive. Fonts are self-hosted
and there's no analytics, so the page makes no third-party requests at all.

## Motion

All of it lives in `src/scripts/motion.js`.

| | |
|---|---|
| Curtain | Two panels that open on load and close again before navigating away |
| Smooth scroll | GSAP ScrollSmoother |
| Headings | SplitText, character by character. Anything above the fold plays on load instead of waiting for a scroll trigger the reader has already passed |
| Featured | Pinned, and the panel bleeds out to full frame as you scrub |
| Roster field | Cursor position picks one of eight panels on a 2×4 grid, cutting rather than crossfading |
| Catalogue | Pinned horizontal scrub on desktop, drag with inertia on touch, native scrolling under reduced motion |
| Services | Rows shear sideways in alternating directions |

Reduced motion switches off the smoother and every pin and scrub, and the page
still reads and still navigates. It also works with JavaScript turned off.
