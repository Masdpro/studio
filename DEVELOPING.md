# Developing Closebuy

The dev setup is built to behave like the live site on Fly.io (see `Dockerfile` and `DEPLOY.md`).

## What keeps dev and live the same

| | Live (Fly.io) | Dev (Codespace) |
|---|---|---|
| Node | 22 (Dockerfile) | 22 (`.devcontainer`, `.nvmrc`; `npm run dev` warns on any other version) |
| Database | SQLite, built only from `drizzle/` migrations on every start | Same: `npm run dev` runs the migrations first |
| Schema changes | Migration files only | Same: `db:push` is turned off because it bypasses migrations |
| Checks before deploy | Same steps as the Docker build | `npm run verify` (part of every deploy): fresh database from migrations, type check, tests, production build |

## Everyday commands

- `npm run dev`: applies any new database updates, then starts the app with hot reload on port 3000.
- `npm run dev:live`: production build plus `next start`, the same way the live server runs. Use it before deploying anything big. Stop `npm run dev` first, because both use the `.next` folder.
- `npm run verify`: the same checks the live build goes through. It runs before every deploy. Stop `npm run dev` first.
- `npm run doctor`: shows how this environment differs from live (Node version, database updates, and which outside services are on).
- `npm run db:generate` then `npm run db:migrate`: the only way to change the database structure.
- `npm run db:reset-dev`: a fresh dev database built the same way as live, plus demo data. The old one is kept as a backup.
- `npm run db:repair-dev`: brings an old dev database up to date if its update history got out of step.
- `npm test`, `npm run typecheck`.

Demo logins after `db:reset-dev` (password `password123`): `vendor@closebuy.ng`, `customer@closebuy.ng`, `agent@closebuy.ng`, `admin@closebuy.ng`.

## Outside services

Live uses R2 (files and backups), Resend (email), Termii (SMS), Paystack, Turnstile and Gemini. In dev, each one falls back safely when its keys are missing (`npm run doctor` lists them):
- Files are saved to the local `uploads/` folder.
- With `EXPOSE_DEV_CODES=true`, email and SMS codes are shown on screen.
- The bot check is skipped.

To test one of these the way it works live, add its **test** keys to `.env`. Never use live keys in dev.

## Codespaces

After pulling these changes, run **Codespaces: Rebuild Container** once from the command palette. That switches the Codespace to Node 22.
