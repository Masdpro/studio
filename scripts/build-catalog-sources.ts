/**
 * Turns the reviewed image picks (JSON exported from the review sheet: { hints, picks: [index, src, url, title, creator, license, page][] })
 * into scripts/catalog-image-sources.json, keyed by product slug.
 * Usage: npx tsx scripts/build-catalog-sources.ts <picks.json>
 */
import fs from 'node:fs';
import { CATALOG_IMAGE_HINTS } from '../src/lib/product-catalog';

const file = process.argv[2];
const { hints, picks } = JSON.parse(fs.readFileSync(file, 'utf8')) as { hints: string[]; picks: [number, string, string, string, string, string, string][] };
if (hints.length !== CATALOG_IMAGE_HINTS.length) throw new Error(`catalog has ${CATALOG_IMAGE_HINTS.length} items, picks were made for ${hints.length}`);
const out: Record<string, object> = {};
for (const [i, src, url, title, creator, license, page] of picks) {
  const item = CATALOG_IMAGE_HINTS[i];
  if (item.hint !== hints[i]) throw new Error(`item ${i} changed: ${item.hint} vs ${hints[i]}`);
  out[item.slug] = {
    url,
    title: src === 'off' ? `${title || item.name} (product photo)` : title.replace(/\.(jpe?g|png|webp)$/i, ''),
    creator,
    license,
    source: page,
    fit: src === 'off' ? 'contain' : 'cover',
  };
}
fs.writeFileSync('scripts/catalog-image-sources.json', JSON.stringify(out, null, 1) + '\n');
console.log(`wrote ${Object.keys(out).length} sources`);
