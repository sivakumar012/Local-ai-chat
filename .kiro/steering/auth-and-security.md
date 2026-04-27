---
inclusion: fileMatch
fileMatchPattern: "auth.ts,proxy.ts,app/login/**,app/api/auth/**"
---

# Auth & Security

## Authentication stack

- **NextAuth.js v5 (beta)** — `next-auth@^5.0.0-beta.31`
- **Provider** — Google OAuth 2.0 only
- **Session strategy** — JWT (default for NextAuth v5)
- **Config file** — `auth.ts` at project root

## Route protection

`proxy.ts` (Next.js proxy middleware) runs on every request:

```
Public routes (no auth required):
  /login
  /api/auth/*          ← NextAuth OAuth callbacks
  /api/probe-server    ← needed before auth for setup screen
  /_next/*             ← static assets
  /favicon.ico

Protected routes (redirect to /login if !req.auth):
  /                    ← main chat UI
  /api/chat            ← LLM proxy
  everything else
```

## Session shape

```ts
session.user = {
  id: string      // Google sub (unique, stable user ID)
  name: string    // Google display name
  email: string   // Google email address
  image: string   // Google profile picture URL (lh3.googleusercontent.com)
}
```

The `id` field is added by the session callback in `auth.ts` — it is not present by default in NextAuth v5.

## Google OAuth setup

1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID → Web application
3. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID → `AUTH_GOOGLE_ID` in `.env.local`
5. Copy Client Secret → `AUTH_GOOGLE_SECRET` in `.env.local`

For production/other environments, add the corresponding redirect URI:
```
https://your-domain.com/api/auth/callback/google
```

## Environment variables

```env
AUTH_SECRET=<32-byte hex>          # REQUIRED — signs JWT sessions
AUTH_GOOGLE_ID=<client id>         # REQUIRED — Google OAuth
AUTH_GOOGLE_SECRET=<client secret> # REQUIRED — Google OAuth
NEXTAUTH_URL=http://localhost:3000 # REQUIRED — must match redirect URI base
```

Generate `AUTH_SECRET`:
```bash
node -e "const c = require('crypto'); console.log(c.randomBytes(32).toString('hex'))"
```

## Security notes

- `.env.local` is in `.gitignore` — never commit it
- `AUTH_SECRET` in this repo is a placeholder — replace it before any shared deployment
- The `probe-server` route is intentionally public — it only makes a GET request to `/v1/models` and returns `{ ok: true/false }`, no sensitive data
- The `/api/chat` route is protected — unauthenticated requests are blocked by `proxy.ts`
- No user data is sent to Google beyond the OAuth handshake — conversations are stored in the browser's localStorage only

## Adding a new OAuth provider

1. Install the provider: `npm install next-auth` (already installed)
2. Import in `auth.ts`: `import GitHub from "next-auth/providers/github"`
3. Add to the `providers` array in `auth.ts`
4. Add the required env vars to `.env.local`
5. Add the callback URL to the provider's developer console
6. Update the login page (`app/login/page.tsx`) to add a sign-in button for the new provider
