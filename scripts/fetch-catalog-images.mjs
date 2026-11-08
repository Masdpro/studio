#!/usr/bin/env node
/**
 * Downloads the Quick add sample photos listed in scripts/catalog-image-sources.json, resizes them
 * to 600×600 WebP in public/catalog/, and writes src/lib/catalog-images.json (credits) for the
 * ones that worked. Run from the repo root: node scripts/fetch-catalog-images.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const sources = JSON.parse(await fs.readFile(path.join(root, 'scripts/catalog-image-sources.json'), 'utf8'));
const outDir = path.join(root, 'public/catalog');
await fs.mkdir(outDir, { recursive: true });

const credits = {};
const failed = [];
const entries = Object.entries(sources);
let i = 0;
async function worker() {
  while (i < entries.length) {
    const [slug, s] = entries[i++];
    const file = path.join(outDir, `${slug}.webp`);
    try {
      const exists = await fs.stat(file).then(() => true, () => false);
      if (!exists) {
        const res = await fetch(s.url, { headers: { 'User-Agent': 'ClosebuyCatalog/1.0 (https://cbuyapp.com/credits)' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        await sharp(buf).rotate().resize(600, 600, { fit: s.fit === 'contain' ? 'contain' : 'cover', background: '#ffffff' }).flatten({ background: '#ffffff' }).webp({ quality: 72 }).toFile(file);
      }
      credits[slug] = { title: s.title, creator: s.creator, license: s.license, source: s.source };
    } catch (e) {
      failed.push(`${slug}: ${e.message}`);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
const sorted = Object.fromEntries(Object.keys(credits).sort().map((k) => [k, credits[k]]));
await fs.writeFile(path.join(root, 'src/lib/catalog-images.json'), JSON.stringify(sorted, null, 1) + '\n');
console.log(`catalog images: ${Object.keys(sorted).length} ok, ${failed.length} failed`);
if (failed.length) console.log(failed.join('\n'));
