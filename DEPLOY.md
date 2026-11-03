# Putting Closebuy live on Fly.io

This is a one-time setup. After it, publishing an update is a single command (`fly deploy`).

**How it fits together**

- **Fly.io** runs the app on one always-on machine with its own disk (the database lives on that disk).
- **Cloudflare R2** stores the photos, videos and ID documents, and a continuous backup of the database
  (Litestream copies every change there within seconds; if the machine is ever lost, the next one restores it automatically).
- **Resend** sends emails (sign-up confirmation, password reset). **Termii** sends SMS codes.
- **Paystack** takes wallet top-ups.

You'll need about an hour. Run the commands below in the Codespace terminal, from the `studio` folder.

---

## 1. Create the accounts (you)

| Service | What to do | What you'll copy |
|---|---|---|
| **Fly.io** (fly.io) | Sign up, add a payment card. | — |
| **Cloudflare** (dash.cloudflare.com) | R2 → *Create bucket* named `closebuy` (location: Automatic or Europe). Then R2 → *Manage API tokens* → *Create token* with **Object Read & Write** on that bucket only. | Account ID, Access Key ID, Secret Access Key |
| **Resend** (resend.com) | Add and verify your domain (e.g. `closebuy.ng`) by adding the DNS records it shows. Create an API key. | API key |
| **Termii** (termii.com) | Register a sender ID (e.g. `Closebuy`) and ask Termii to enable the **DND** route for verification codes. | API key, sender ID, the API address shown on your dashboard |
| **Paystack** | Switch to **Live** mode (business verification needed). | Live secret key |

Keep these somewhere safe; never paste them into code or chat.

## 2. Install the Fly tool and sign in

```bash
curl -L https://fly.io/install.sh | sh
export PATH="$HOME/.fly/bin:$PATH"
fly auth login
```

## 3. Create the app and its disk

```bash
fly apps create closebuy            # if the name is taken, pick another and change `app` in fly.toml
fly volumes create closebuy_data --region lhr --size 3 --app closebuy
```

`lhr` is London. To compare, run `fly platform regions`; Johannesburg (`jnb`) may also be offered.
Whichever you choose, use the same code in `fly.toml` (`primary_region`) and in the command above.

## 4. Add the secrets

Replace each `...` with your value. `NEXTAUTH_URL` is the address people will use (your domain, or `https://closebuy.fly.dev` to start).

```bash
fly secrets set --app closebuy \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  NEXTAUTH_URL="https://closebuy.fly.dev" \
  PAYSTACK_SECRET_KEY="sk_live_..." \
  GOOGLE_GENAI_API_KEY="..." \
  R2_ACCOUNT_ID="..." R2_BUCKET="closebuy" R2_ACCESS_KEY_ID="..." R2_SECRET_ACCESS_KEY="..." \
  RESEND_API_KEY="re_..." EMAIL_FROM="Closebuy <no-reply@closebuy.ng>" \
  TERMII_API_KEY="..." TERMII_SENDER_ID="Closebuy" TERMII_BASE_URL="https://..."
```

Never set `EXPOSE_DEV_CODES` on the live site.

## 5. Launch

```bash
fly deploy
fly scale count 1      # exactly one machine — the database lives on its disk
```

Check it's healthy: open `https://closebuy.fly.dev/api/health` — it should say `{"ok":true}`.
The logs (`fly logs`) should show *"Starting Closebuy with continuous backups to R2."*
If they say *"WARNING: R2 is not configured"*, recheck the R2 secrets.

## 6. Create your admin account

```bash
fly ssh console -C "npm run create-admin -- you@yourdomain.ng 'a-long-password' 'Your Name'"
```

(The demo logins from development do not exist on the live site — it starts with an empty database.)

## 7. Your domain

```bash
fly certs add closebuy.ng
fly certs add www.closebuy.ng
```

Add the DNS records it prints at your domain registrar. When the certificate shows as issued:

```bash
fly secrets set NEXTAUTH_URL="https://closebuy.ng" --app closebuy
```

## 8. Paystack

In the Paystack dashboard (Live mode) → Settings → API Keys & Webhooks, set the **Webhook URL** to
`https://closebuy.ng/api/payments/paystack/webhook` (use your real address).

## 9. Final checks before announcing

- Register a customer account → the confirmation email arrives.
- Use *Forgot password* → the reset email arrives.
- Verify a phone number → the SMS code arrives.
- Top up a wallet with a small real amount → it's credited (also check Paystack shows it).
- Place and cancel an order → the refund appears.
- Upload a product photo → it shows, and appears in the R2 bucket under `uploads/public/`.

---

## Everyday tasks

**Publish an update:** `fly deploy`

**After changing the database structure** (`src/db/schema.ts`): run `npm run db:generate`, commit the new
file it creates in `drizzle/`, then `fly deploy`. The tables are updated automatically on start-up.

**See what's happening:** `fly logs` (live) or `fly status`.

**Restore test (do this once after launch):** in a scratch folder with the R2 values exported,
`litestream restore -config litestream.yml -o restored.db "$DATABASE_URL"` should produce a copy of the live database.

**Costs to watch:** the Fly machine and disk (monthly), R2 storage (free allowance first), Resend and Termii per message.
Check each provider's pricing page.

## Things to know

- Keep **one** machine. Adding a second would give it a separate, empty database.
- Your Codespace keeps its own development database and test data; nothing from it is copied to the live site.
- Sample shops/products are hidden on the live site. To show them anyway (e.g. for a demo) set `USE_SAMPLE_DATA=true`.
