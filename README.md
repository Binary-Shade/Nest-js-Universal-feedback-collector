# Feedback Bot — Universal Product Feedback → Discord

A self-hosted feedback collection API for multiple apps/products. Apps POST
feedback to a REST endpoint; it's stored in PostgreSQL and forwarded to Discord
via **webhooks** (no persistent bot process, no gateway/websocket connection —
works entirely over HTTP, so it deploys cleanly to Vercel serverless functions,
Render, Railway, or a plain VPS).

## Stack
- Next.js 14 (App Router) — API routes + admin dashboard, one deployable unit
- Prisma ORM + PostgreSQL
- Zod validation
- Discord Webhooks (no bot token, no gateway)
- API key auth for feedback ingestion, bearer-token auth for admin routes
- In-memory per-instance rate limiting (swappable for Redis, see `src/lib/ratelimit.ts`)

## Local Setup

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to a real Postgres instance, set ADMIN_TOKEN
npx prisma migrate dev --name init
npm run dev
```

App runs at `http://localhost:3000`. Admin dashboard at `/admin` (log in with
your `ADMIN_TOKEN`).

Need a quick local Postgres? `docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=feedback_bot postgres:16-alpine`
then `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/feedback_bot"`.

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string (use the **pooled** connection string on Vercel) |
| `ADMIN_TOKEN` | Secret bearer token protecting `/api/admin/*` and `/admin` |
| `RATE_LIMIT_PER_MINUTE` | Requests allowed per API key per minute (default 10) |
| `DISCORD_BUG_WEBHOOK_URL` | Fallback webhook for `bug` feedback if an app hasn't set its own |
| `DISCORD_FEEDBACK_WEBHOOK_URL` | Fallback webhook for `feedback` type |
| `DISCORD_FEATURE_WEBHOOK_URL` | Fallback webhook for `feature` type |
| `NODE_ENV` | `development` / `production` |

Per-app webhooks (configured in the admin dashboard or via `/api/admin/webhooks`)
always take priority over the env-var defaults above.

## API

### Register / send feedback (public, API-key authenticated)

```
POST /api/v1/feedback
Headers:
  X-API-Key: fb_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  Content-Type: application/json

Body:
{
  "type": "bug" | "feedback" | "feature",
  "message": "string (required)",
  "appVersion": "string (optional)",
  "platform": "string (optional)",
  "device": "string (optional)",
  "language": "string (optional)",
  "userId": "string (optional)",
  "metadata": { "any": "json (optional)" }
}
```

Feedback is always saved to Postgres first — if the Discord webhook call fails
(bad URL, Discord outage, etc.), the row is kept with `discordDelivered: false`
and `discordError` set, instead of the request failing.

### Admin API (bearer-token authenticated: `Authorization: Bearer <ADMIN_TOKEN>`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/apps` | Create an app → returns a one-time-visible API key |
| `GET` | `/api/admin/apps` | List apps (API keys are masked) |
| `PATCH` | `/api/admin/apps/:id/revoke` | Disable (or re-enable via `{"disabled": false}`) an app's key |
| `GET` | `/api/admin/feedback` | List feedback, filter with `?appId=` `?type=` `?limit=` `?cursor=` |
| `POST` | `/api/admin/webhooks` | Set an app's Discord webhook for a feedback type: `{ appId, type, url }` |

### Admin Dashboard

Visit `/admin` — log in with `ADMIN_TOKEN`, create apps (the API key is shown
once, so copy it immediately), configure per-type Discord webhooks, revoke
keys, and browse recent feedback.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add environment variables (`DATABASE_URL`, `ADMIN_TOKEN`, etc.) in
   Project Settings → Environment Variables. Use a serverless-friendly Postgres
   (Vercel Postgres, Neon, or Supabase) and its **pooled** connection string.
4. Vercel runs `npm install` → `postinstall` (`prisma generate`) → `npm run build`
   automatically. Run migrations once from your machine or CI:
   ```bash
   DATABASE_URL="<your prod url>" npx prisma migrate deploy
   ```
5. Deploy. All routes are plain serverless functions — no background workers,
   no long-lived connections.

## Deploying to Render

1. New → Web Service, connect the repo.
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `npm start`
4. Add a Render PostgreSQL instance, set `DATABASE_URL` to its connection string.
5. Set `ADMIN_TOKEN` and the other env vars.
6. After first deploy, run `npx prisma migrate deploy` from the Render shell
   (or add it as a pre-deploy/release command).

## Deploying with Docker (VPS / Railway / anywhere)

```bash
docker build -t feedback-bot .
docker run -p 3000:3000 --env-file .env feedback-bot
```

Run `npx prisma migrate deploy` against your production `DATABASE_URL` once
before or during first boot.

## Production Notes

- **API keys are stored in plaintext** in the database for simplicity (matching
  a typical self-hosted webhook-style setup). For higher security, hash them
  (e.g. SHA-256) before storing and compare hashes on lookup — happy to add
  this if you want it.
- **Rate limiting** is in-memory per serverless instance (see
  `src/lib/ratelimit.ts`). It's a reasonable abuse guard, but not a hard global
  cap across all instances. Swap in `@upstash/ratelimit` + Upstash Redis for a
  true global limit if you need one.
- CORS: not restricted by default since feedback is meant to come from your
  own mobile/web apps using a secret API key. If you need to call
  `/api/v1/feedback` directly from browser JS on a different origin, add CORS
  headers in `next.config.js` or the route handler.
# Nest-js-Universal-feedback-collector
