// Draws the hand-drawn marks. Any element with data-ink="rule|underline|circle|box|vline|arrow"
// gets an SVG overlay sized to it, redrawn when it resizes.
//   data-ink-color  ink | accent | gilt | muted  (a --color-* token, default ink)
//   data-ink-draw   view (draw on when scrolled into view, default) | hover | none
//   data-ink-size   nib width in px;  data-ink-delay  ms before drawing on
//   data-ink-from / data-ink-to "x,y" fractions of the box; data-ink-bend  (arrow only)
import { centerline, hash, inkPath, rng, shapes } from '../lib/ink.js';

const NS = 'http://www.w3.org/2000/svg';
const NIB = { rule: 2, underline: 3.2, circle: 2.6, box: 2, vline: 2.4, arrow: 2.2 };

// where each drawing sits relative to the element it marks, in px
const frame = (shape, w, h, fs) => {
  if (shape === 'underline') return { x: -fs * 0.12, y: h - fs * 0.22, w: w + fs * 0.24, h: fs * 0.5 };
  if (shape === 'circle') return { x: -fs * 0.5, y: -fs * 0.38, w: w + fs, h: h + fs * 0.76 };
  if (shape === 'box') return { x: -2, y: -2, w: w + 4, h: h + 4 };
  if (shape === 'vline') return { x: -4, y: 0, w: 8, h };
  return { x: 0, y: 0, w, h };
};

const pair = (s, d) => (s ? s.split(',').map(Number) : d);
const sizes = new WeakMap();
let uid = 0;

const render = (el, seed) => {
  const shape = el.dataset.ink;
  const [W, H] = [el.offsetWidth, el.offsetHeight];
  if (!shapes[shape] || !W || !H) return;
  const last = sizes.get(el);
  if (last && Math.abs(last[0] - W) < 1 && Math.abs(last[1] - H) < 1) return;
  sizes.set(el, [W, H]);

  const f = frame(shape, W, H, parseFloat(getComputedStyle(el).fontSize) || 16);
  const size = Number(el.dataset.inkSize) || NIB[shape];
  const tremor = size * 0.35;
  const strokes = shapes[shape](f.w, f.h, rng(seed), {
    from: pair(el.dataset.inkFrom, undefined),
    to: pair(el.dataset.inkTo, undefined),
    bend: el.dataset.inkBend === undefined ? undefined : Number(el.dataset.inkBend),
  });
  const variants = [0, 1, 2].map((v) => `<path class="ink-v" d="${inkPath(strokes, { size, tremor, seed, variant: v })}"/>`).join('');

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ink-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(f.w));
  svg.setAttribute('height', String(f.h));
  svg.setAttribute('viewBox', `0 0 ${f.w} ${f.h}`);
  svg.style.cssText = `left:${f.x}px;top:${f.y}px;color:var(--color-${el.dataset.inkColor || 'ink'})`;
  if (el.dataset.inkDraw === 'none') {
    svg.innerHTML = variants;
  } else {
    // a fat stroke along the pen's path, dashed and slid open: the ink appears in drawing order
    const id = `ink-m${++uid}`;
    const { d, len } = centerline(strokes);
    const L = Math.ceil(len) + 2;
    const dur = Math.min(1100, Math.max(350, len * 1.1));
    svg.innerHTML =
      `<mask id="${id}" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${f.w + 80}" height="${f.h + 80}">` +
      `<path class="ink-mask" d="${d}" fill="none" stroke="#fff" stroke-width="${size * 2 + tremor * 4 + 6}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="${L} ${L}" stroke-dashoffset="${L}" style="transition-duration:${dur}ms;transition-delay:${el.dataset.inkDelay || 0}ms"/>` +
      `</mask><g mask="url(#${id})">${variants}</g>`;
  }
  el.querySelector(':scope > .ink-svg')?.remove();
  el.append(svg);
};

const els = [...document.querySelectorAll('[data-ink]')];
const seeds = new Map(els.map((el, i) => [el, Number(el.dataset.inkSeed) || 1 + Math.floor(hash(i + 0.5) * 97)]));

const seen = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      seen.unobserve(el);
      // the overlay must be on the page, undrawn, for a frame before the transition can run
      render(el, seeds.get(el));
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('ink-on')));
    }
  },
  { threshold: 0 },
);

const resized = new ResizeObserver((entries) => {
  for (const e of entries) {
    const el = e.target;
    // a redraw after the first one shouldn't replay the draw-on
    if (sizes.has(el) && el.classList.contains('ink-on')) el.classList.add('ink-instant');
    render(el, seeds.get(el));
  }
});

for (const el of els) {
  resized.observe(el);
  if ((el.dataset.inkDraw || 'view') === 'view') seen.observe(el);
}
