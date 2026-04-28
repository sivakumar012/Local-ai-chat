---
inclusion: manual
---

# Deployment Guide

## Option 1 — Local machine (default)

```bash
npm run dev          # dev server with hot-reload → http://localhost:3000
npm run build && npm start   # production build
```

## Option 2 — Local network

Bind to all interfaces so teammates on the same network can connect:

```bash
npm run build
npx next start -H 0.0.0.0 -p 3000
```

Update `.env.local`:
```env
NEXTAUTH_URL=http://<your-local-ip>:3000
```

Add `http://<your-local-ip>:3000/api/auth/callback/google` as an Authorised Redirect URI in Google Cloud Console.

Find your IP: `ifconfig | grep "inet "` (macOS) or `ipconfig` (Windows).

## Option 3 — Vercel

> LM Studio must be publicly reachable or on a shared VPN. The app proxies requests — it does not run the model.

```bash
npm install -g vercel
vercel
```

Environment variables to set in Vercel dashboard:

| Variable | Value |
|----------|-------|
| `LLM_BASE_URL` | Your LM Studio URL (publicly reachable) |
| `LLM_API_PATH` | `/v1/chat/completions` |
| `AUTH_SECRET` | 32-byte hex secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

Google Cloud Console → Authorised Redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

## Option 4 — Docker

### 1. Enable standalone output

In `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};
```

### 2. Create Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3. Build and run

```bash
docker build -t local-ai-chat .

docker run -p 3000:3000 \
  -e AUTH_SECRET=<your-secret> \
  -e AUTH_GOOGLE_ID=<client-id> \
  -e AUTH_GOOGLE_SECRET=<client-secret> \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e LLM_BASE_URL=http://host.docker.internal:1234 \
  -e LLM_API_PATH=/v1/chat/completions \
  local-ai-chat
```

`host.docker.internal` resolves to the host machine from inside Docker — lets the container reach LM Studio on your Mac/PC.

## Pre-deployment checklist

- [ ] `AUTH_SECRET` is a strong random value — generate with:
  ```bash
  node -e "const c=require('crypto'); console.log(c.randomBytes(32).toString('hex'))"
  ```
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are real credentials
- [ ] `NEXTAUTH_URL` exactly matches the URL users will access (protocol + domain + port)
- [ ] Google Cloud Console redirect URI = `NEXTAUTH_URL` + `/api/auth/callback/google`
- [ ] LM Studio is running and reachable from the deployment environment
- [ ] `.env.local` is **not** committed (it is in `.gitignore` by default)
- [ ] Firestore security rules deployed: `firebase deploy --only firestore:rules`
- [ ] Firestore indexes deployed: `firebase deploy --only firestore:indexes`
- [ ] `npm run build` passes with 0 errors
- [ ] `npm run lint` passes with 0 errors and 0 warnings
