#!/usr/bin/env node
/**
 * Builds the browser-tab icon (src/app/favicon.ico) and the iPhone home-screen icon (src/app/apple-icon.png)
 * from the Closebuy logo mark in public/logo-mark-orange.png. Run from the repo root: node scripts/make-favicon.mjs
 */
import fs from 'node:fs/promises';
import sharp from 'sharp';

const src = 'public/logo-mark-orange.png';
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const mark = await sharp(src).trim().toBuffer();

// favicon.ico holding 16, 32 and 48 px PNG images (the ICO format allows PNG data inside).
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => sharp(mark).resize(s, s, { fit: 'contain', background: clear }).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s, 0);
  e.writeUInt8(s, 1);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
await fs.writeFile('src/app/favicon.ico', Buffer.concat([header, ...entries, ...pngs]));

// apple-icon.png: 180 px on white, with some breathing room.
const inner = await sharp(mark).resize(140, 140, { fit: 'contain', background: clear }).png().toBuffer();
await sharp({ create: { width: 180, height: 180, channels: 3, background: '#ffffff' } })
  .composite([{ input: inner, left: 20, top: 20 }])
  .png()
  .toFile('src/app/apple-icon.png');
console.log('favicon.ico and apple-icon.png written');
