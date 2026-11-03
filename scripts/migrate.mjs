// Creates or updates the database tables from the files in ./drizzle.
// Runs automatically every time the server starts on Fly.io (see docker-entrypoint.sh);
// you can also run it by hand with: npm run db:migrate
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';

const file = process.env.DATABASE_URL ?? 'dev.db';
const sqlite = new Database(file);
sqlite.pragma('journal_mode = WAL');

const hasTable = (name) => !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

// A database first built with `drizzle-kit push` (e.g. the Codespace dev.db) already has every
// table but no migration history. Record the baseline as done instead of trying to re-create tables.
if (hasTable('users') && !hasTable('__drizzle_migrations')) {
  const [baseline] = readMigrationFiles({ migrationsFolder: './drizzle' });
  sqlite.exec('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)');
  sqlite.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)').run(baseline.hash, baseline.folderMillis);
  console.log('[migrate] Existing database: marked the baseline as already applied.');
}

migrate(drizzle(sqlite), { migrationsFolder: './drizzle' });
sqlite.close();
console.log(`[migrate] Database is up to date (${file}).`);
