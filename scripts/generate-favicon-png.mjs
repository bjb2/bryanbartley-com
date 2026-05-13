import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const svg = readFileSync('public/favicon.svg');

const out = await sharp(svg, { density: 384 })
  .resize(32, 32)
  .png()
  .toBuffer();

writeFileSync('public/favicon-32.png', out);
console.log('Wrote public/favicon-32.png (' + out.length + ' bytes)');
