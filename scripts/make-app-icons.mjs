#!/usr/bin/env node
/**
 * Builds the install icons for the website (public/icons/) and the phone app's icon and splash screen
 * (native/assets/), from the logo mark in public/logo-mark-orange.png.
 * Run from the repo root: node scripts/make-app-icons.mjs
 *
 * The logo mark is small (86×113), so it is enlarged here. For the final store listing, replace
 * public/logo-mark-orange.png with a high-resolution export of the logo and run this again.
 */
import fs from 'node:fs/promises';
import sharp from 'sharp';

const WHITE = '#ffffff';
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const mark = await sharp('public/logo-mark-orange.png').trim().toBuffer();
const markAt = (height) => sharp(mark).resize({ height, kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).png().toBuffer();
async function square(size, markHeight, background, out) {
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: await markAt(markHeight), gravity: 'center' }])
    .png()
    .toFile(out);
}

await fs.mkdir('public/icons', { recursive: true });
await fs.mkdir('native/assets', { recursive: true });
// Website install icons (Android "Add to home screen", desktop install).
await square(192, 130, WHITE, 'public/icons/icon-192.png');
await square(512, 350, WHITE, 'public/icons/icon-512.png');
// "Maskable": phones may crop to a circle or squircle, so the mark stays inside the middle 80%.
await square(512, 290, WHITE, 'public/icons/icon-maskable-512.png');
// Phone app (Expo): the store icon, and the logo on a clear background for the Android icon and the splash screen.
await square(1024, 640, WHITE, 'native/assets/icon.png');
await square(1024, 520, clear, 'native/assets/android-icon-foreground.png');
console.log('App icons written to public/icons and native/assets');
