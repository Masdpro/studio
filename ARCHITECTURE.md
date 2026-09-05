# Dailybuy (Swiftbuy) — Full-Stack Architecture

This app started as a Firebase Studio (AI-generated) Next.js prototype: a
Nigerian hyperlocal marketplace with vendors, customers, delivery agents,
errands, wallets, reviews, and three Genkit/Gemini AI flows (product image
identification, delivery route optimization, support chat). All data lived
in in-memory arrays (`src/lib/mockData.ts`) with no persistence, and no auth.

## Stack (no Firebase / no external accounts required to run locally)

- **Frontend**: Next.js 15 (App Router) + React 18 + Tailwind + shadcn/radix UI (unchanged)
- **Database**: SQLite — a single file (`dev.db`) on disk, no server or account needed. Swappable for Postgres later by changing one line in `src/db/index.ts` and `drizzle.config.ts` (Drizzle supports both with almost identical code).
- **ORM**: [Drizzle](https://orm.drizzle.team) — the database schema is plain TypeScript in `src/db/schema.ts`; queries are typed, plain functions, no code generation step and no external binary download (this is why we moved off Prisma — its CLI needs to fetch a query-engine binary from a host our build sandbox couldn't reach).
- **Auth**: [NextAuth.js](https://next-auth.js.org) (Auth.js) with the Credentials provider — email + password, hashed with bcrypt, stored in our own `users` table. JWT session strategy (no separate sessions table needed).
- **AI**: Genkit + Gemini (`src/ai/flows/*`) — already present, needs `GOOGLE_GENAI_API_KEY`.
- **Payments**: not yet integrated. For Nigeria, Paystack or Flutterwave are the standard choice — needed once the `Wallet` type should hold real money, not mock balances.

## How the pieces fit together

```
Browser (React components)
   │
   │  fetch() / server actions
   ▼
Next.js server (API routes in src/app/api/**, or server components)
   │
   ├─ src/lib/auth.ts ──────► NextAuth (Credentials provider)
   │                                │
   └─ src/lib/services/*.ts ───┐    │
                                ▼    ▼
                          src/db/index.ts (Drizzle)
                                │
                                ▼
                            dev.db (SQLite file)
```

The database (`src/db`) and the auth config (`src/lib/auth.ts`) only ever
run on the server — they use Node APIs (`better-sqlite3`) that don't exist
in a browser. `src/context/AuthContext.tsx` is the one thing client
components use directly: it wraps NextAuth's `SessionProvider` and exposes
a small `useAuth()` hook (`user`, `role`, `loading`, `signIn`, `signUp`, `signOut`).

## What was added this pass

- `src/db/schema.ts` — the full data model: users, markets, vendors, delivery agents, products, orders, reviews, errand requests/quotes, notifications, wallets.
- `src/db/index.ts` — the Drizzle/SQLite connection.
- `drizzle.config.ts` + `npm run db:push` — applies schema changes to `dev.db` without hand-written migration files (fine for a solo/early-stage project; can switch to `drizzle-kit generate` + versioned migrations later).
- `src/lib/auth.ts` + `src/app/api/auth/[...nextauth]/route.ts` — NextAuth config and route handler.
- `src/app/api/auth/register/route.ts` — a plain API route for sign-up (Credentials-only auth has no built-in registration flow).
- `src/context/AuthContext.tsx` — `AuthProvider` (wraps `SessionProvider`) and `useAuth()`.
- `src/lib/services/{markets,vendors,products,orders}.ts` — typed data-access functions over Drizzle. Each falls back to the bundled sample data if its table is empty, so the UI has something to show before you run `db:seed`.
- `scripts/seed.ts` (`npm run db:seed`) — populates `dev.db` with the sample markets/vendors/products/agents, plus **one demo login per role** (password `password123` for all): `customer@dailybuy.ng`, `vendor@dailybuy.ng`, `agent@dailybuy.ng`.
- `.env.example` — documents every required env var (just `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and the AI key).
- Fixed 5 pre-existing TypeScript errors and a Next.js 15 `useSearchParams` prerender error left over from the original AI-generated prototype.

`npm run typecheck` and `npm run build` are both clean, and `npm run dev` boots and serves real pages + a working `/api/auth/*` endpoint.

## Running it locally

1. `npm install`
2. Copy `.env.example` to `.env.local`, set `DATABASE_URL=dev.db` and generate a secret: `openssl rand -base64 32` → paste into `NEXTAUTH_SECRET`.
3. `npm run db:push` — creates `dev.db` with the schema.
4. `npm run db:seed` — fills it with sample data and demo logins.
5. `npm run dev` — open http://localhost:3000 (or whatever port it prints).
6. `npm run db:studio` any time you want a visual browser/editor for the database (Drizzle Studio, opens in your browser).

## What's left

- **Wire remaining pages off `mockData` onto the new services**: home page, cart, orders, vendor dashboard, delivery-agent dashboard/errands still import from `src/lib/mockData.ts` directly. The services in `src/lib/services/` are drop-in replacements (`getProducts()`, `getOrdersForCustomer()`, etc.) — this is the next real chunk of work, page by page.
- **Login/register UI**: `useAuth()` has `signIn`/`signUp`, but there's no `/login` page yet — only vendor/delivery-agent *registration* pages exist, and they don't yet call `signUp`/`upsertVendor`.
- **Route protection**: nothing currently redirects a signed-out user away from vendor/agent dashboards, or a customer away from a vendor's dashboard.
- **Product image upload**: `ProductUploadForm` currently accepts a data URI directly; with no Firebase Storage, images either stay as data URIs (simplest, fine for a prototype) or get saved to `/public/uploads` via a small API route (more real, still no external account needed).
- **Wallets & payments**: `Wallet` type exists but nothing debits/credits it. Needs a payment provider (Paystack/Flutterwave for NGN) and should live in a server-only route, never the client, since it moves money.
- **Genkit AI flows need `GOOGLE_GENAI_API_KEY`** to actually call Gemini (they'll error without it).
