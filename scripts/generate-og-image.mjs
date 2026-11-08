// node scripts/generate-og-image.mjs -> public/og-default.png
// Text is set as Inter outlines (opentype.js), so the card doesn't depend on installed fonts;
// the underline is the site's own hand (src/lib/ink.js).
import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { inkPath, rng, shapes } from '../src/lib/ink.js';

const C = { paper: '#fafaf9', ink: '#1b1f2c', muted: '#6b7280', gilt: '#c8963e' };
const inter = (w) => {
  const b = readFileSync(`node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff`);
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const [regular, medium, semibold] = [inter(400), inter(500), inter(600)];

// text as a path; returns the path and the advance so pieces can be set side by side
const set = (font, text, x, y, size, fill, letterSpacing = 0) => ({
  d: `<path d="${font.getPath(text, x, y, size, { letterSpacing }).toPathData(2)}" fill="${fill}"/>`,
  w: font.getAdvanceWidth(text, size, { letterSpacing }),
});

const X = 80;
const name = set(semibold, 'bryan bartley', X, 268, 150, C.ink, -0.035);
const dot = set(semibold, '.', X + name.w, 268, 150, C.gilt, -0.035);

const line1 = set(medium, 'I build data systems, AI tooling, and', X, 384, 46, C.ink, -0.02);
const phrase = set(medium, 'operator software', X, 444, 46, C.ink, -0.02);
const stop = set(medium, '.', X + phrase.w, 444, 46, C.ink, -0.02);
const under = inkPath(shapes.underline(phrase.w + 16, 24, rng(7)), { size: 5, tremor: 1.6, seed: 7 });

const foot = set(regular, 'spiritvalers.com · spiritvale · omp-deck', X, 560, 26, C.muted);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="${C.paper}"/>
  ${name.d}${dot.d}${line1.d}${phrase.d}${stop.d}
  <g transform="translate(${X - 8},452)" fill="${C.gilt}"><path d="${under}"/></g>
  ${foot.d}
</svg>`;

const out = await sharp(Buffer.from(svg)).resize(1200, 630).png().toBuffer();
writeFileSync('public/og-default.png', out);
console.log('Wrote public/og-default.png (' + out.length + ' bytes)');
