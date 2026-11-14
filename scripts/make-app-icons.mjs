#!/usr/bin/env node
/**
 * Builds the install icons for the website (public/icons/) and the source images the mobile app's icons
 * and splash screens are made from (mobile/assets/), from the logo mark in public/logo-mark-orange.png.
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
await fs.mkdir('mobile/assets', { recursive: true });
// Website install icons (Android "Add to home screen", desktop install).
await square(192, 130, WHITE, 'public/icons/icon-192.png');
await square(512, 350, WHITE, 'public/icons/icon-512.png');
// "Maskable": phones may crop to a circle or squircle, so the mark stays inside the middle 80%.
await square(512, 290, WHITE, 'public/icons/icon-maskable-512.png');
// Mobile app sources for @capacitor/assets.
await square(1024, 640, WHITE, 'mobile/assets/icon-only.png');
await square(1024, 520, clear, 'mobile/assets/icon-foreground.png');
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } }).png().toFile('mobile/assets/icon-background.png');
await square(2732, 520, WHITE, 'mobile/assets/splash.png');
await square(2732, 520, '#0b0f17', 'mobile/assets/splash-dark.png');
// Logo on the app's offline screen.
await fs.mkdir('mobile/www', { recursive: true });
await fs.copyFile('public/icons/icon-192.png', 'mobile/www/logo.png');
console.log('App icons written to public/icons and mobile/assets');
