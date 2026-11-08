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
// Litestream reads the database while the app writes; wait briefly instead of failing if they overlap.
sqlite.pragma('busy_timeout = 5000');

// Custom store links (/s/<slug>): add the column if this database predates it, and give existing vendors one.
try { sqlite.exec('ALTER TABLE vendors ADD COLUMN slug TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN address TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN suspended_at INTEGER'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN suspended_reason TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0'); } catch {}
try { sqlite.exec('ALTER TABLE vendor_branches ADD COLUMN account_user_id TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE vendor_branches ADD COLUMN image_url TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN branch_id TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN gallery_json TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN video_url TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN colors_json TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN sizes_json TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE products ADD COLUMN stock INTEGER'); } catch {}
// Wallet ledger, bank accounts, withdrawals and delivery codes (also in drizzle/0002_wallet_ledger.sql,
// which production applies first; this keeps a local dev.db that was built with `drizzle-kit push` working).
try { sqlite.exec('ALTER TABLE vendors ADD COLUMN business_type TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE orders ADD COLUMN delivery_code TEXT'); } catch {}
try { sqlite.exec('ALTER TABLE orders ADD COLUMN delivery_code_attempts INTEGER NOT NULL DEFAULT 0'); } catch {}
try {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS wallet_transactions (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL, amount REAL NOT NULL, balance_after REAL NOT NULL, fee REAL, order_id TEXT, description TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS wallet_transactions_user_created ON wallet_transactions (user_id, created_at);
    CREATE TABLE IF NOT EXISTS bank_accounts (user_id TEXT PRIMARY KEY NOT NULL, bank_code TEXT NOT NULL, bank_name TEXT NOT NULL, account_number TEXT NOT NULL, account_name TEXT NOT NULL, recipient_code TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS withdrawals (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, amount REAL NOT NULL, fee REAL NOT NULL, net REAL NOT NULL, status TEXT NOT NULL DEFAULT 'pending', transfer_code TEXT, failure_reason TEXT, bank_name TEXT NOT NULL, account_number TEXT NOT NULL, account_name TEXT NOT NULL, created_at INTEGER NOT NULL, completed_at INTEGER);
    CREATE INDEX IF NOT EXISTS withdrawals_user_created ON withdrawals (user_id, created_at);`);
} catch {}
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
