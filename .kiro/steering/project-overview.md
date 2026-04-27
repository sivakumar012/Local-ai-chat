---
inclusion: always
---

# Project: Local AI Chat

A production-ready, full-stack ChatGPT-like interface that runs entirely on the local machine. Connects to LM Studio (or any OpenAI-compatible server) via streaming API. No cloud inference — conversations never leave the machine.

## Project location

```
/Users/shiva/Documents/Projects/local-ai-chat
```

## Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js App Router | 16.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Auth | NextAuth.js | 5.x beta |
| State | Zustand + persist | 5.x |
| Markdown | react-markdown + remark-gfm | 10.x / 4.x |
| Syntax highlight | react-syntax-highlighter (Prism) | 16.x |
| Icons | @heroicons/react | 2.x |
| LLM backend | LM Studio (OpenAI-compatible) | any |

## Key commands

```bash
npm run dev      # start dev server → http://localhost:3000
npm run build    # production build
npm run lint     # ESLint (must be 0 errors before committing)
npm start        # serve production build
```

## Environment variables (.env.local)

```
LLM_BASE_URL=http://127.0.0.1:1234       # LM Studio server (fallback only)
LLM_API_PATH=/v1/chat/completions        # OpenAI-compatible endpoint
AUTH_SECRET=<32-byte hex>                # NextAuth secret
AUTH_GOOGLE_ID=<google client id>        # Google OAuth
AUTH_GOOGLE_SECRET=<google secret>       # Google OAuth
NEXTAUTH_URL=http://localhost:3000       # Must match redirect URI
```

## Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Protected | Main chat UI |
| `/login` | Public | Google sign-in page |
| `/api/chat` | Protected | Streaming proxy to LM Studio |
| `/api/probe-server` | Public | Test LM Studio reachability |
| `/api/auth/[...nextauth]` | Public | NextAuth OAuth handlers |

## localStorage keys

| Key | Contents |
|-----|---------|
| `local-ai-chat-store` | All conversations and messages |
| `local-ai-chat-user-prefs` | LM Studio URL, setupComplete flag |
