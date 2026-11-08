// node scripts/generate-favicon-png.mjs -> public/favicon.svg + public/favicon-32.png
// The wordmark's initial: Inter semibold "b" with the gilt period, set as outlines so the
// icon doesn't depend on the browser's fonts.
import sharp from 'sharp';
import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';

const b = readFileSync('node_modules/@fontsource/inter/files/inter-latin-600-normal.woff');
const font = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

const size = 25;
const w = font.getAdvanceWidth('b', size);
const r = 2.7;
const x = (32 - (w + r * 2 + 0.6)) / 2;
const glyph = font.getPath('b', x, 24.5, size).toPathData(2);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#1b1f2c"/>
  <path d="${glyph}" fill="#fafaf9"/>
  <circle cx="${(x + w + 0.6 + r).toFixed(2)}" cy="${(24.5 - r).toFixed(2)}" r="${r}" fill="#c8963e"/>
</svg>
`;
writeFileSync('public/favicon.svg', svg);

const out = await sharp(Buffer.from(svg), { density: 384 }).resize(32, 32).png().toBuffer();
writeFileSync('public/favicon-32.png', out);
console.log('Wrote public/favicon.svg and public/favicon-32.png (' + out.length + ' bytes)');
