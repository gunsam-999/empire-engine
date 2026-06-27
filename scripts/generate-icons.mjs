// Generate PWA icons from public/icon.svg
// Run: node scripts/generate-icons.mjs

import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const svgSrc = readFileSync(resolve(root, 'public/icon.svg'), 'utf8');

// The maskable icon needs a square background with 10% safe-zone padding.
// We embed the original 512×512 icon inside a 640×640 canvas (512 / 0.8 = 640)
// with 64px padding on each side. The outer square is filled with the same dark
// background color as the icon itself so it looks native when fully masked.
const SAFE_ZONE_BG = '#070b12'; // matches the bg-glow stop at 100%

function maskableSvg() {
  // Wrap the original SVG (stripped of its outer svg tag) inside a new 640×640 svg
  // to create the 10% safe zone required by the Maskable icon spec.
  const inner = svgSrc
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg\s*>/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">
  <rect width="640" height="640" fill="${SAFE_ZONE_BG}"/>
  <g transform="translate(64,64)">${inner}</g>
</svg>`;
}

const configs = [
  { name: 'icon-192.png',          size: 192, svg: svgSrc },
  { name: 'icon-512.png',          size: 512, svg: svgSrc },
  { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg() },
];

for (const { name, size, svg } of configs) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  });
  const data = resvg.render().asPng();
  const dest = resolve(root, 'public', name);
  writeFileSync(dest, data);
  console.log(`✓ ${name} (${size}×${size})`);
}
console.log('Done.');
