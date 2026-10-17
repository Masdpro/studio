// Server-only database connection. Never import this from a client
// component — Node's `better-sqlite3` doesn't run in the browser.
// (Deliberately not using the `server-only` package here: it throws
// unconditionally outside webpack, which breaks running scripts/seed.ts
// directly with tsx/node.)

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { slugify } from '../lib/slug';

const sqlite = new Database(process.env.DATABASE_URL ?? 'dev.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Custom store links (/s/<slug>): add the column if this database predates it, and give existing vendors one.
try { sqlite.exec('ALTER TABLE vendors ADD COLUMN slug TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN address TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE vendor_branches ADD COLUMN account_user_id TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE vendor_branches ADD COLUMN image_url TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN branch_id TEXT'); } catch {}
try {
  sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS vendors_slug_unique ON vendors(slug)');
  const missing = sqlite.prepare('SELECT id, business_name AS name FROM vendors WHERE slug IS NULL').all() as { id: string; name: string }[];
  const taken = new Set((sqlite.prepare('SELECT slug FROM vendors WHERE slug IS NOT NULL').all() as { slug: string }[]).map((r) => r.slug));
  const setSlug = sqlite.prepare('UPDATE vendors SET slug = ? WHERE id = ?');
  for (const r of missing) {
    let base = slugify(r.name) || 'store';
    if (base.length < 3) base += '-store';
    let s = base;
    let i = 2;
    while (taken.has(s)) s = base + '-' + i++;
    taken.add(s);
    setSlug.run(s, r.id);
  }
} catch {}

export const db = drizzle(sqlite, { schema });
