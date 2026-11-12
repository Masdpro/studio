// Starts the local dev database again from scratch, exactly the way the live database is built:
// migrations only, then the demo data. Your old dev.db is kept as a backup next to it.
// Usage: npm run db:reset-dev
import fs from 'node:fs';
import { execSync } from 'node:child_process';

if (process.env.FLY_APP_NAME || process.env.NODE_ENV === 'production') {
  console.error('[reset] This is for local dev databases only.');
  process.exit(1);
}
const file = process.env.DATABASE_URL ?? 'dev.db';
if (fs.existsSync(file)) {
  const backup = `${file}.backup-${Date.now()}`;
  fs.renameSync(file, backup);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(file + ext)) fs.rmSync(file + ext);
  console.log(`[reset] Old database saved as ${backup}`);
}
const env = { ...process.env, DATABASE_URL: file };
for (const cmd of ['node scripts/migrate.mjs', 'npx tsx scripts/seed.ts', 'npx tsx scripts/seed-branches.ts']) {
  execSync(cmd, { stdio: 'inherit', env });
}
console.log('[reset] Fresh dev database ready. Demo logins use the password password123 (vendor@closebuy.ng, admin@closebuy.ng, ...).');
