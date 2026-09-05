// Server-only database connection. Never import this from a client
// component — Node's `better-sqlite3` doesn't run in the browser.
// (Deliberately not using the `server-only` package here: it throws
// unconditionally outside webpack, which breaks running scripts/seed.ts
// directly with tsx/node.)

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';

const sqlite = new Database(process.env.DATABASE_URL ?? 'dev.db');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
