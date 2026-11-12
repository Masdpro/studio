// Brings an old local dev database up to date when `npm run db:migrate` fails because some
// changes were already applied by hand (e.g. "duplicate column name"). For local dev databases
// only: it never runs on Fly. Usage: npm run db:repair-dev   (uses DATABASE_URL or dev.db)
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';

if (process.env.FLY_APP_NAME || process.env.NODE_ENV === 'production') {
  console.error('[repair] This is for local dev databases only.');
  process.exit(1);
}
const file = process.env.DATABASE_URL ?? 'dev.db';
if (!fs.existsSync(file)) {
  console.error(`[repair] ${file} not found.`);
  process.exit(1);
}
fs.copyFileSync(file, `${file}.backup-${Date.now()}`);
const db = new Database(file);
db.exec('CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY AUTOINCREMENT, hash text NOT NULL, created_at numeric)');
const last = db.prepare('SELECT created_at FROM "__drizzle_migrations" ORDER BY created_at DESC LIMIT 1').get();
const done = Number(last?.created_at ?? 0);
// Changes that were already made by hand are fine to skip.
const ALREADY = /duplicate column name|already exists/i;

for (const m of readMigrationFiles({ migrationsFolder: './drizzle' })) {
  if (m.folderMillis <= done) continue;
  let applied = 0;
  let skipped = 0;
  const stmts = m.sql.map((s) => s.trim()).filter(Boolean);
  const isData = (s) => /^(--[^\n]*\n\s*)*(UPDATE|INSERT|DELETE)\b/i.test(s);
  db.transaction(() => {
    // Table and column changes first. If any were already there, this update was applied by hand
    // before, so its one-off data fixes (UPDATE/INSERT/DELETE) are not run a second time.
    for (const stmt of stmts.filter((s) => !isData(s))) {
      try {
        db.exec(stmt);
        applied++;
      } catch (err) {
        if (!ALREADY.test(err.message)) throw err;
        skipped++;
      }
    }
    for (const stmt of stmts.filter(isData)) {
      if (skipped) {
        skipped++;
        continue;
      }
      db.exec(stmt);
      applied++;
    }
    db.prepare('INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES (?, ?)').run(m.hash, m.folderMillis);
  })();
  console.log(`[repair] ${new Date(m.folderMillis).toISOString().slice(0, 10)}: ${applied} change(s) applied, ${skipped} already there`);
}
db.close();
console.log(`[repair] ${file} is up to date (a backup was saved next to it).`);
