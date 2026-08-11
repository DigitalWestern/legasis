import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { SplitText } from 'gsap/SplitText';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, Draggable, InertiaPlugin);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mm = gsap.matchMedia();
const DESKTOP = '(min-width: 992px)';
const MOBILE = '(max-width: 991px)';

/** Is this element on screen before the user has scrolled anywhere? */
const inInitialView = (el) => el.getBoundingClientRect().top < innerHeight * 0.95;

/* ---------------------------------------------------------------
   curtain — closed on arrival, opens outward; closes again on exit
   --------------------------------------------------------------- */
function initCurtain() {
  const panels = gsap.utils.toArray('.curtain__panel');
  const curtain = document.querySelector('.curtain');
  if (!panels.length) return;

  const open = () =>
    gsap.to(panels, {
      scaleY: 0,
      duration: reduced ? 0 : 0.9,
      ease: 'power3.inOut',
      transformOrigin: (i) => (i === 0 ? 'top' : 'bottom'),
      onComplete: () => gsap.set(curtain, { display: 'none' }),
    });

  gsap.set(panels, { scaleY: 1, transformOrigin: (i) => (i === 0 ? 'top' : 'bottom') });
  // pageshow rather than load so a back/forward restore also replays it
  addEventListener('pageshow', () => {
    gsap.set(curtain, { display: 'flex' });
    gsap.set(panels, { scaleY: 1 });
    open();
  });

  // close before leaving for a real page (in-page anchors keep scrolling)
  document.querySelectorAll('a[href]').forEach((link) => {
    const url = link.getAttribute('href');
    if (!url || url.startsWith('#') || url.startsWith('mailto:') || link.target === '_blank') return;
    if (new URL(link.href, location.href).origin !== location.origin) return;

    link.addEventListener('click', (e) => {
      e.preventDefault();
      gsap.set(curtain, { display: 'flex' });
      gsap.to(panels, {
        scaleY: 1,
        duration: 0.55,
        ease: 'power3.inOut',
        onComplete: () => (location.href = link.href),
      });
    });
  });
}

/* ---------------------------------------------------------------
   nav — clock, flyout, scroll-linked anchors
   --------------------------------------------------------------- */
function initNav() {
  const clock = document.querySelector('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: clock.dataset.clock,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const tick = () => (clock.textContent = fmt.format(new Date()));
    tick();
    setInterval(tick, 1000);
  }

  // ground the bar once it stops sitting over the hero
  const bar = document.querySelector('.nav');
  if (bar) {
    ScrollTrigger.create({
      start: 'top -80',
      onUpdate: (self) => bar.toggleAttribute('data-scrolled', self.scroll() > 80),
      onRefresh: (self) => bar.toggleAttribute('data-scrolled', self.scroll() > 80),
    });
  }

  const toggle = document.querySelector('.nav__toggle');
  const flyout = document.querySelector('.flyout');
  if (!toggle || !flyout) return;

  const links = flyout.querySelectorAll('.flyout__link');
  let open = false;

  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(open));

    if (open) {
      flyout.hidden = false;
      // pause the smoother rather than setting overflow:hidden, which would
      // fight the smooth scroller for control of the document
      ScrollSmoother.get()?.paused(true);
      gsap.fromTo(flyout, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power2.out' });
      gsap.fromTo(
        links,
        { yPercent: 105, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', delay: 0.05 }
      );
    } else {
      gsap.to(flyout, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          flyout.hidden = true;
          ScrollSmoother.get()?.paused(false);
        },
      });
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));
  addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));

  // an in-page link should close the menu, then scroll to the target
  links.forEach((link) =>
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id?.startsWith('#')) return;
      e.preventDefault();
      setOpen(false);
      const target = document.querySelector(id);
      if (!target) return;
      const smoother = ScrollSmoother.get();
      if (smoother) smoother.scrollTo(target, true, 'top top');
      else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    })
  );
}

/* ---------------------------------------------------------------
   headings — per-character reveal, the reference site's signature move
   --------------------------------------------------------------- */
function initSplitHeadings() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    el.style.visibility = 'visible';
    if (reduced) return;

    const split = new SplitText(el, { type: 'chars,lines', linesClass: 'split-line' });
    gsap.set(split.lines, { overflow: 'hidden' });

    const tween = { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.014 };

    // anything already on screen at load plays as part of the entrance. a
    // scroll trigger would leave it hidden until the user scrolls past a point
    // that is already behind them.
    if (inInitialView(el)) {
      gsap.from(split.chars, { ...tween, delay: 0.55 });
    } else {
      gsap.from(split.chars, {
        ...tween,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    }
  });
}

/* ---------------------------------------------------------------
   generic reveals + depth parallax
   --------------------------------------------------------------- */
function initReveals() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    if (reduced) return void (el.style.opacity = 1);
    const to = { opacity: 1, y: 0, duration: 0.85, ease: 'power2.out' };
    gsap.fromTo(
      el,
      { opacity: 0, y: 26 },
      inInitialView(el)
        ? { ...to, delay: 0.6 }
        : { ...to, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }
    );
  });

  if (reduced) return;
  mm.add(DESKTOP, () => {
    document.querySelectorAll('[data-parallax] > *').forEach((el, i) => {
      gsap.to(el, {
        yPercent: -8 - i * 6,
        ease: 'none',
        scrollTrigger: { trigger: el.closest('[data-parallax]'), start: 'top bottom', end: 'bottom top', scrub: 1 },
      });
    });
  });
}

/* ---------------------------------------------------------------
   featured — pin the stage, bleed the panel out to full frame
   --------------------------------------------------------------- */
function initFeatured() {
  const section = document.querySelector('[data-featured]');
  if (!section || reduced) return;

  mm.add(DESKTOP, () => {
    const media = section.querySelector('[data-featured-media]');
    const title = section.querySelector('[data-featured-title]');
    const credits = section.querySelector('[data-featured-credits]');

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: '+=150%',
        pin: section.querySelector('.featured__stage'),
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    tl.fromTo(media, { padding: '8vw' }, { padding: '0vw', ease: 'none' }, 0)
      .fromTo(title, { scale: 0.92, yPercent: 12 }, { scale: 1, yPercent: 0, ease: 'none' }, 0)
      .fromTo(credits, { opacity: 0, y: 24 }, { opacity: 1, y: 0, ease: 'none' }, 0.15);
  });
}

/* ---------------------------------------------------------------
   the 2 x 4 zone field — cursor position selects the panel
   --------------------------------------------------------------- */
function initZoneField() {
  const field = document.querySelector('[data-zone-field]');
  if (!field) return;

  const panels = [...field.querySelectorAll('[data-zone]')];
  const readout = field.querySelector('[data-zone-readout]');
  const COLS = 4;
  const ROWS = 2;
  let current = 0;

  const show = (index) => {
    if (index === current) return;
    gsap.set(panels[current], { opacity: 0 });
    gsap.set(panels[index], { opacity: 1 });
    current = index;
    if (readout) readout.textContent = `${String(index + 1).padStart(2, '0')} / 08`;
  };

  field.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'touch') return;
      const r = field.getBoundingClientRect();
      const col = Math.min(COLS - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * COLS)));
      const row = Math.min(ROWS - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * ROWS)));
      field.setAttribute('data-active', '');
      show(row * COLS + col);
    },
    { passive: true }
  );

  field.addEventListener('pointerleave', () => field.removeAttribute('data-active'));

  // touch has no cursor, so cycle the panels on scroll instead of stalling on one
  mm.add(MOBILE, () => {
    if (reduced) return;
    ScrollTrigger.create({
      trigger: field,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => show(Math.min(panels.length - 1, Math.floor(self.progress * panels.length))),
    });
  });
}

/* ---------------------------------------------------------------
   catalogue — scrubbed horizontally on desktop, dragged on touch
   --------------------------------------------------------------- */
function initCarousel() {
  const section = document.querySelector('[data-carousel]');
  if (!section) return;

  const track = section.querySelector('[data-carousel-track]');
  const mask = section.querySelector('[data-carousel-mask]');
  if (!track || !mask) return;

  const cards = [...track.querySelectorAll('[data-card]')];
  const distance = () => Math.max(0, track.scrollWidth - mask.offsetWidth);

  // Nothing drives the track when motion is reduced, which would strand every
  // card past the first screenful. Hand it back to the browser's own scrolling.
  if (reduced) {
    mask.style.overflowX = 'auto';
    mask.style.scrollSnapType = 'x proximity';
    cards.forEach((c) => (c.style.scrollSnapAlign = 'center'));
    return;
  }

  const markActive = (x) => {
    const centre = mask.offsetWidth / 2 - x;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - centre);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    cards.forEach((c, i) => c.toggleAttribute('data-active', i === best));
  };

  mm.add(DESKTOP, () => {
    if (reduced || distance() <= 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => `+=${distance() * 1.4}`,
        pin: section.querySelector('.catalogue__stage'),
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => markActive(-distance() * self.progress),
      },
    });

    tl.fromTo(track, { x: 0 }, { x: () => -distance(), ease: 'none' });
  });

  mm.add(MOBILE, () => {
    if (distance() <= 0) return;
    const [instance] = Draggable.create(track, {
      type: 'x',
      inertia: true,
      bounds: { minX: -distance(), maxX: 0 },
      edgeResistance: 0.85,
      onDrag() {
        markActive(this.x);
      },
      onThrowUpdate() {
        markActive(this.x);
      },
    });
    markActive(0);
    return () => instance?.kill();
  });
}

/* ---------------------------------------------------------------
   services — the list climbs and each row drifts sideways
   --------------------------------------------------------------- */
function initServices() {
  const list = document.querySelector('[data-services]');
  if (!list || reduced) return;

  const items = gsap.utils.toArray('[data-service]', list);

  // kept under the page gutter so a drifting row never clips at the edge
  mm.add(DESKTOP, () => run(52));
  mm.add(MOBILE, () => run(20));

  function run(maxX) {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: list, start: 'top bottom', end: 'bottom top', scrub: 1.1 },
    });

    // rows alternate direction so the list shears rather than slides
    items.forEach((item, i) => {
      const dir = i % 2 ? 1 : -1;
      const amount = maxX * dir * (0.35 + (i / items.length) * 0.65);
      tl.fromTo(item, { x: amount }, { x: -amount, ease: 'none' }, 0);
    });
  }
}

/* ---------------------------------------------------------------
   footer — lifts into place as the page bottoms out
   --------------------------------------------------------------- */
function initFooter() {
  const footer = document.querySelector('[data-footer]');
  if (!footer || reduced) return;

  gsap.fromTo(
    footer,
    { yPercent: 8, opacity: 0.4 },
    {
      yPercent: 0,
      opacity: 1,
      ease: 'none',
      scrollTrigger: { trigger: footer, start: 'top bottom', end: 'top 55%', scrub: 1 },
    }
  );
}

/* ---------------------------------------------------------------
   hero — the WebGL chrome wordmark, loaded only once the rest is up
   --------------------------------------------------------------- */
async function initChromeLogo() {
  const canvas = document.querySelector('[data-chrome-logo]');
  if (!canvas) return;

  // data-saver users keep the PNG
  if (navigator.connection?.saveData) return;

  const { mountChromeLogo } = await import('./chrome-logo.js');
  const live = await mountChromeLogo(canvas, { src: '/logo.png', reduced });
  if (live) canvas.closest('.hero__mark')?.setAttribute('data-chrome-live', '');
}

/* --------------------------------------------------------------- */

function boot() {
  if (!reduced) {
    ScrollSmoother.create({
      wrapper: '#smooth-wrapper',
      content: '#smooth-content',
      smooth: 1.2,
      smoothTouch: 0.1,
      effects: true,
      normalizeScroll: true,
    });
  }

  initCurtain();
  initNav();
  initSplitHeadings();
  initReveals();
  initFeatured();
  initZoneField();
  initCarousel();
  initServices();
  initFooter();

  // fonts change the measured height of every split heading, so recompute
  // pin distances once they land rather than trusting the first pass
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // let the page settle before paying for three.js
  requestIdleCallback?.(initChromeLogo, { timeout: 2500 }) ?? setTimeout(initChromeLogo, 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
