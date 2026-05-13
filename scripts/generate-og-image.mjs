import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const MONO = 'ui-monospace, "JetBrains Mono", Menlo, monospace';
const SANS = 'Inter, ui-sans-serif, system-ui, sans-serif';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <rect width="1200" height="630" fill="#fafaf9"/>
  <rect x="0" y="0" width="1200" height="6" fill="#3b5bdb"/>

  <text x="80" y="160" font-family='${MONO}' font-size="22" font-weight="500" letter-spacing="2" fill="#6b7280">BRYAN BARTLEY</text>
  <text x="1120" y="160" text-anchor="end" font-family='${MONO}' font-size="22" font-weight="500" letter-spacing="2" fill="#6b7280">BRYANBARTLEY.COM</text>

  <text x="80" y="280" font-family='${SANS}' font-size="74" font-weight="500" fill="#1b1f2c">I build data systems,</text>
  <text x="80" y="370" font-family='${SANS}' font-size="74" font-weight="500" fill="#1b1f2c">AI tooling, and</text>
  <text x="80" y="460" font-family='${SANS}' font-size="74" font-weight="500" fill="#1b1f2c">operator software.</text>

  <text x="80" y="560" font-family='${SANS}' font-size="26" fill="#6b7280">tallyhq.org · boon.gifts · delectable.guide · markets-academy</text>
</svg>`;

const out = await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toBuffer();

writeFileSync('public/og-default.png', out);
console.log('Wrote public/og-default.png (' + out.length + ' bytes)');
