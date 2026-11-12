# Logging and monitoring

| What | How | Where to look |
|---|---|---|
| Errors | Sentry: server, middleware and browser errors, with the release and request ID | sentry.io, and Sentry's email alerts |
| Logs | One JSON line per entry (`src/lib/log.ts`), each with the request's `x-request-id` | `fly logs` (live), Better Stack Logs (searchable history) |
| Problems the team should know about | Payments, SMS, email, background jobs, stock alerts, security and unhandled errors are saved for 30 days | Admin, then **System health** (`/admin/system`) |
| Is the site up? | Fly checks `/api/health` every 30s and restarts the machine; Better Stack Uptime checks from outside and alerts you | Better Stack Uptime, your email or phone |
| Backups | Litestream copies every database change to R2 | System health page, `fly logs` at start-up |

Every response has an `x-request-id` header. When a customer reports a problem, the same ID appears in the logs, on the System health page and in Sentry. The error page shows a reference you can ask them for.

## One-time setup

### 1. Sentry (errors)
1. Create a free account at sentry.io, then a project of type **Next.js**.
2. Copy the project's **DSN**.
3. Run `fly secrets set SENTRY_DSN=<the DSN> -a closebuy`. The app restarts and error tracking is on for both the server and browsers; no rebuild is needed.
4. In Sentry, go to Alerts and keep the default "new issue" email alert (or add Slack).

Personal data is kept out of Sentry: no cookies, request bodies, auth headers, user details or tokens in links.

### 2. Better Stack Uptime (alerts when the site is down)
1. Create a free account at betterstack.com and open **Uptime**.
2. Add a monitor of type **Keyword**: URL `https://cbuyapp.com/api/health`, keyword `"ok":true`, checked every 3 minutes.
3. Add a second monitor for `https://cbuyapp.com/`, alerting when the page is unavailable.
4. Under on-call, choose how you're alerted (email, SMS, phone call or the app). An optional public status page is available there too.

### 3. Better Stack Logs (searchable log history)
Fly only keeps a short live tail. To keep and search logs, ship them with Fly's log shipper (a small separate Fly app):
1. In Better Stack **Telemetry**, create a source of type **Fly.io**. Note its source token and ingesting host.
2. In an empty folder:
   ```
   fly launch --no-deploy --image flyio/log-shipper:latest
   ```
   In the new `fly.toml`, replace the `[http_service]` section with:
   ```
   [[services]]
     http_checks = []
     internal_port = 8686
   ```
3. Set the secrets (your organisation slug is shown by `fly orgs list`, usually `personal`):
   ```
   fly secrets set ORG=personal
   fly secrets set ACCESS_TOKEN=$(fly tokens create readonly personal | cut -d' ' -f2)
   fly secrets set BETTER_STACK_SOURCE_TOKEN=<source token>
   fly secrets set BETTER_STACK_INGESTING_HOST=<ingesting host>
   fly deploy
   ```
Logs are JSON, so in Better Stack you can filter on `level`, `area` or `requestId`.

## In the code
- `log.info / warn / error(message, { area, err, ...fields })` from `@/lib/log`. In route handlers, use `log.forRequest(request)` so the entry carries the request ID.
- Warnings and errors that have an `area` show up on System health. Errors also go to Sentry.
- Don't log passwords, codes or full card or bank details. Fields with names like password, token, code or secret are hidden automatically.
