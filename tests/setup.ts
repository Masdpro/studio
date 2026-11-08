/**
 * Runs before every test file: points the app at a fresh, fully migrated SQLite file and
 * switches off anything that would reach the outside world (email, SMS, Paystack).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { vi } from 'vitest';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'closebuy-test-'));
process.env.DATABASE_URL = path.join(dir, 'test.db');
process.env.PHONE_VERIFICATION = 'off';
process.env.UPLOAD_DIR = path.join(dir, 'uploads');
process.env.PAYSTACK_SIMULATE_TRANSFERS = 'true';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_unit';
process.env.NEXTAUTH_SECRET = 'unit-test-secret';
delete process.env.RESEND_API_KEY;
delete process.env.SMTP_HOST;
delete process.env.TERMII_API_KEY;
execFileSync(process.execPath, ['scripts/migrate.mjs'], { env: process.env, stdio: 'ignore' });

// Route handlers read the signed-in user from next-auth; tests choose who that is with signInAs().
const session: { current: { user: { id: string } } | null } = { current: null };
vi.mock('next-auth', () => ({ getServerSession: async () => session.current, default: () => ({}) }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
(globalThis as any).__testSession = session;
