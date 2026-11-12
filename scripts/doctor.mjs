// Shows how this environment differs from the live site: Node version, database updates, and
// which outside services are switched on. Usage: npm run doctor
import fs from 'node:fs';
import Database from 'better-sqlite3';
import { readMigrationFiles } from 'drizzle-orm/migrator';

for (const f of ['.env', '.env.local']) {
  if (!fs.existsSync(f)) continue;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const env = process.env;
const ok = (b) => (b ? 'ok  ' : 'OFF ');
const lines = [];
const node = process.versions.node.split('.')[0];
lines.push(`${ok(node === '22')} Node ${process.versions.node} (live: 22)`);

const file = env.DATABASE_URL ?? 'dev.db';
try {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  const last = db.prepare('SELECT max(created_at) m FROM "__drizzle_migrations"').get()?.m ?? 0;
  const pending = readMigrationFiles({ migrationsFolder: './drizzle' }).filter((m) => m.folderMillis > Number(last)).length;
  lines.push(`${ok(!pending)} Database ${file}: ${pending ? `${pending} update(s) not applied — run npm run db:migrate` : 'up to date'}`);
  db.close();
} catch (e) {
  lines.push(`OFF  Database ${file}: ${e.message} — run npm run db:migrate`);
}

const has = (...k) => k.every((x) => env[x]);
const svc = [
  ['Sign-in secret (NEXTAUTH_SECRET)', has('NEXTAUTH_SECRET'), 'required'],
  ['Site address (NEXTAUTH_URL)', has('NEXTAUTH_URL'), `required; now ${env.NEXTAUTH_URL ?? 'unset'}`],
  ['Photo/file storage on R2', has('R2_BUCKET', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'), 'off: files go to the local uploads folder'],
  ['Email (Resend)', has('RESEND_API_KEY', 'EMAIL_FROM'), 'off: codes and links are shown on screen (EXPOSE_DEV_CODES)'],
  ['SMS (Termii)', has('TERMII_API_KEY', 'TERMII_SENDER_ID'), 'off: phone codes are shown on screen'],
  ['Payments (Paystack)', has('PAYSTACK_SECRET_KEY'), 'off: wallet funding needs a Paystack test key (sk_test_...); PAYSTACK_SIMULATE_TRANSFERS=true fakes payouts'],
  ['Bot check (Turnstile)', has('TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'), 'off: sign-up and password reset skip the bot check'],
  ['AI chat and price search (Gemini)', has('GOOGLE_GENAI_API_KEY') || has('GEMINI_API_KEY') || has('GOOGLE_API_KEY'), 'off: support chat and the price search are disabled'],
];
for (const [name, on, note] of svc) lines.push(`${ok(on)} ${name}${on ? '' : ` — ${note}`}`);
if (env.PAYSTACK_SECRET_KEY?.startsWith('sk_live')) lines.push('WARN Paystack LIVE key in this environment: real money. Use a sk_test_ key for dev.');
console.log('\nHow this environment compares with the live site\n' + lines.map((l) => '  ' + l).join('\n') + '\n');
