# Dailybuy (Swiftbuy) — Full-Stack Architecture

This app started as a Firebase Studio (AI-generated) Next.js prototype: a
Nigerian hyperlocal marketplace with vendors, customers, delivery agents,
errands, wallets, reviews, and three Genkit/Gemini AI flows (product image
identification, delivery route optimization, support chat). All data lived
in in-memory arrays (`src/lib/mockData.ts`) with no persistence, and no auth.

This pass wires up the real backend foundation so the app can move from
prototype to production. It intentionally stops short of migrating every
page's UI state — see "What's left" below — because that work should happen
against a real Firebase project rather than blind.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 18 + Tailwind + shadcn/radix UI (unchanged)
- **Auth**: Firebase Authentication (email/password to start; easy to add Google/phone later)
- **Database**: Cloud Firestore
- **File storage**: Firebase Storage (product photos, etc. — wired in `src/lib/firebase/client.ts`, not yet used by any upload flow)
- **AI**: Genkit + Gemini (`src/ai/flows/*`) — already present, needs `GOOGLE_GENAI_API_KEY`
- **Payments**: not yet integrated. For Nigeria, Paystack or Flutterwave are the standard choice — recommend adding this next once auth/data are live, since wallet balances (`Wallet` type) currently have no real money movement behind them.

## What was added this pass

- `src/lib/firebase/client.ts` — browser Firebase SDK init (auth/Firestore/storage), safe to import even with no project configured yet (`isFirebaseConfigured` flag), with an emulator-suite switch for local dev.
- `src/lib/firebase/admin.ts` — server-only Admin SDK init, for server actions/API routes/scripts that need elevated access (e.g. adjusting wallet balances).
- `src/context/AuthContext.tsx` — `AuthProvider`/`useAuth()` wrapping the whole app (`src/app/layout.tsx`) with sign-in/sign-up/sign-out and a `users/{uid}` profile doc holding `role: 'customer' | 'vendor' | 'delivery_agent'`.
- `src/lib/services/{markets,vendors,products,orders}.ts` — Firestore-backed data access functions. Each one **falls back to the bundled sample data when Firebase isn't configured**, so the UI keeps working with zero setup, then switches to real Firestore reads/writes the moment env vars are set.
- `firestore.rules` — security rules matching the data model (public read on catalogue data, owner-only writes, orders visible only to their customer/vendor/agent).
- `scripts/seed.ts` (`npm run seed`) — pushes the sample markets/vendors/products/agents into Firestore via the Admin SDK, so a fresh project isn't empty.
- `.env.example` — documents every required env var.
- Fixed 5 pre-existing TypeScript errors left over from the AI-generated prototype (mismatched `ScanPurpose` type, a status-literal widening bug, an optional `imageUrl` type mismatch, and two `useFieldArray` misuses in `RouteOptimizationForm` where a plain string array was wrongly treated as a field array of objects) plus a Next.js 15 `useSearchParams` prerender error. `npm run typecheck` and `npm run build` are both clean now.

## Getting a real Firebase project running

1. Create a project at https://console.firebase.google.com, enable **Authentication** (Email/Password), **Firestore**, and **Storage**.
2. Copy `.env.example` to `.env.local` and fill in the `NEXT_PUBLIC_FIREBASE_*` values from Project Settings → General → Your apps → Web app.
3. Generate a service account key (Project Settings → Service accounts) and paste the JSON as a single line into `FIREBASE_SERVICE_ACCOUNT_KEY`.
4. Deploy `firestore.rules`: `firebase deploy --only firestore:rules` (requires `firebase-tools` and `firebase init` once to link the project).
5. `npm run seed` to populate sample data.
6. `npm run dev` — the app now reads/writes real Firestore data instead of the in-memory mocks.

## What's left (by design, not done blind against no project)

- **Wire remaining pages off `mockData` onto the new services**: home page, cart, orders, vendor dashboard, delivery-agent dashboard/errands still import from `src/lib/mockData.ts` directly. The services in `src/lib/services/` are drop-in replacements (`getProducts()`, `getOrdersForCustomer()`, etc.) — swap the imports and add `useEffect`/`react-query` loading once there's a real project to test reads against.
- **Login/register UI**: `src/context/AuthContext.tsx` has `signIn`/`signUp`, but there's no `/login` page yet — only vendor/delivery-agent *registration* pages exist, and they don't yet call `signUp`/`upsertVendor`.
- **Product image upload → Firebase Storage**: `ProductUploadForm` currently accepts a data URI directly; swap to `uploadBytes`/`getDownloadURL` against `storage`.
- **Wallets & payments**: `Wallet` type exists but nothing debits/credits it. Needs a payment provider (Paystack/Flutterwave for NGN) and should live in a server action or Cloud Function, never the client, since it moves money.
- **Genkit AI flows need `GOOGLE_GENAI_API_KEY`** to actually call Gemini (they'll error without it).
- **Role-based routing/guards**: nothing currently redirects an unauthenticated user away from vendor/agent dashboards.
