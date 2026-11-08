// Hand-drawn ink, ported from the trailer (bryan-trailer/src/ink/Ink.tsx): a polyline gets a
// low-frequency hand tremor, and perfect-freehand turns it into a
// pressure-shaped filled outline. Plain JS so the browser overlay script and the OG-image
// generator (node) share one hand.
import { getStroke } from 'perfect-freehand';

export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// smooth 1D value noise
const noise = (t, seed) => {
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f);
  return hash(i + seed * 101.3) * (1 - u) + hash(i + 1 + seed * 101.3) * u - 0.5;
};

// seeded 0..1 generator, so a shape is the same drawing on every load
export const rng = (seed) => {
  let i = 0;
  return () => hash(seed * 9.17 + ++i * 1.618);
};

// even spacing along a polyline (perfect-freehand reads spacing as pen speed)
const resample = (pts, step) => {
  const seg = [];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    len += l;
  }
  const n = Math.max(2, Math.ceil(len / step));
  const out = [];
  let k = 0;
  let acc = 0;
  for (let i = 0; i <= n; i++) {
    const d = (len * i) / n;
    while (k < seg.length - 1 && acc + seg[k] < d) acc += seg[k++];
    const u = seg[k] ? (d - acc) / seg[k] : 0;
    const [a, b] = [pts[k], pts[k + 1]];
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return { pts: out, len };
};

const outline = (stroke) => {
  if (stroke.length < 4) return '';
  const f = (n) => n.toFixed(2);
  const [a, b, c] = stroke;
  let d = `M${f(a[0])},${f(a[1])} Q${f(b[0])},${f(b[1])} ${f((b[0] + c[0]) / 2)},${f((b[1] + c[1]) / 2)} T`;
  for (let i = 2; i < stroke.length - 1; i++) {
    const [p, q] = [stroke[i], stroke[i + 1]];
    d += `${f((p[0] + q[0]) / 2)},${f((p[1] + q[1]) / 2)} `;
  }
  return d + 'Z';
};

/**
 * Filled outline for a set of pen strokes; `seed` fixes the hand tremor so a mark redraws identically.
 * @param {number[][][]} strokes
 * @param {{size?: number, tremor?: number, seed?: number}} [o]
 */
export const inkPath = (strokes, { size = 3, tremor = 0.9, seed = 1 } = {}) =>
  strokes
    .map((raw, si) => {
      const { pts, len } = resample(raw, Math.max(2, size * 0.9));
      const s = seed * 7.31 + si * 13.7;
      const freq = 1 / 38; // one wobble per ~38px of line
      const jittered = pts.map(([x, y], i) => {
        const t = (i * len) / pts.length;
        return [x + noise(t * freq, s) * tremor * 2, y + noise(t * freq, s + 17) * tremor * 2];
      });
      return outline(
        getStroke(jittered, {
          size,
          thinning: 0.42,
          smoothing: 0.6,
          streamline: 0.35,
          simulatePressure: true,
          last: true,
          start: { taper: size * 1.2, cap: true },
          end: { taper: size * 1.2, cap: true },
        }),
      );
    })
    .join('');

/** The pen's path through the strokes, in order, and its length: the draw-on mask follows it. */
export const centerline = (strokes) => {
  let len = 0;
  const d = strokes
    .map((s) => {
      for (let i = 1; i < s.length; i++) len += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]);
      return 'M' + s.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L');
    })
    .join(' ');
  return { d, len };
};

// ---------- shapes: (w, h, r) -> strokes in a w×h box; r is a seeded 0..1 source ----------

const curve = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const quad = (p0, c, p1, n = 24) =>
  curve(n, (t) => [
    (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
    (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
  ]);
const j = (r, amp) => (r() - 0.5) * 2 * amp;

export const shapes = {
  // a ruled line across the box, with a faint bow
  rule: (w, h, r) => [quad([0, h / 2 + j(r, 1)], [w * (0.4 + r() * 0.2), h / 2 + j(r, h * 0.3)], [w, h / 2 + j(r, 1)], Math.ceil(w / 20))],

  // a quick swash under a word: starts a touch high, sags, lifts at the end
  underline: (w, h, r) => {
    const y = h * 0.4;
    const lift = h * (0.15 + r() * 0.15);
    const sag = h * (0.12 + r() * 0.12);
    return [curve(Math.ceil(w / 8), (t) => [w * t, y - lift * (1 - t) + sag * Math.sin(Math.PI * t) - lift * 0.6 * t * t * t])];
  },

  // a little more than one revolution, slightly tilted, like a pen circling (kit.tsx ellipsePath)
  circle: (w, h, r) => {
    const [cx, cy, rx, ry] = [w / 2, h / 2, w / 2 - 3, h / 2 - 3];
    const tilt = j(r, 0.04);
    const phase = r() * 6;
    const a0 = -Math.PI * (0.55 + r() * 0.15);
    return [
      curve(44, (u) => {
        const i = u * 44;
        const a = a0 + (i / 40) * Math.PI * 2;
        const k = 1 + 0.05 * Math.sin(i * 0.7 + phase);
        const x = Math.cos(a) * rx * k;
        const y = Math.sin(a) * ry * k - u * ry * 0.14;
        return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
      }),
    ];
  },

  // four sides, each its own stroke, overshooting the corners the way a hand does
  box: (w, h, r) => {
    const i = 3;
    const c = [
      [i + j(r, 1.5), i + j(r, 1.5)],
      [w - i + j(r, 1.5), i + j(r, 1.5)],
      [w - i + j(r, 1.5), h - i + j(r, 1.5)],
      [i + j(r, 1.5), h - i + j(r, 1.5)],
    ];
    return c.map((a, k) => {
      const b = c[(k + 1) % 4];
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const l = Math.hypot(dx, dy);
      const [ux, uy] = [dx / l, dy / l];
      const o0 = 2 + r() * 5;
      const o1 = 3 + r() * 7;
      const s = [a[0] - ux * o0, a[1] - uy * o0];
      const e = [b[0] + ux * o1, b[1] + uy * o1];
      const bow = j(r, Math.min(3, l * 0.01));
      return quad(s, [(s[0] + e[0]) / 2 - uy * bow, (s[1] + e[1]) / 2 + ux * bow], e, Math.ceil(l / 20));
    });
  },

  // a single vertical stroke down the left edge (blockquotes)
  vline: (w, h, r) => [quad([w / 2 + j(r, 1), 0], [w / 2 + j(r, 2.5), h * (0.4 + r() * 0.2)], [w / 2 + j(r, 1), h], Math.ceil(h / 20))],

  // a bent arrow from `from` to `to` (fractions of the box), head drawn as a second stroke
  arrow: (w, h, r, { from = [0.05, 0.5], to = [0.92, 0.5], bend = 0.2 } = {}) => {
    const [x1, y1, x2, y2] = [from[0] * w, from[1] * h, to[0] * w, to[1] * h];
    const b = bend + j(r, 0.06);
    const mx = (x1 + x2) / 2 - (y2 - y1) * b;
    const my = (y1 + y2) / 2 + (x2 - x1) * b;
    const a = Math.atan2(y2 - my, x2 - mx);
    const len = Math.min(14, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    const head = [
      [x2 - Math.cos(a - 0.5) * len, y2 - Math.sin(a - 0.5) * len],
      [x2, y2],
      [x2 - Math.cos(a + 0.5) * len, y2 - Math.sin(a + 0.5) * len],
    ];
    return [quad([x1, y1], [mx, my], [x2, y2]), head];
  },
};
