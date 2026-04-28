# Local AI Chat

A production-ready, full-stack ChatGPT-like interface that runs entirely on your local machine. Connects to [LM Studio](https://lmstudio.ai) (or any OpenAI-compatible server) via streaming API. No cloud inference — conversations never leave your machine.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Dependencies](#dependencies)
4. [Project Structure](#project-structure)
5. [Architecture Overview](#architecture-overview)
6. [Authentication — Google SSO](#authentication--google-sso)
7. [First-Run Setup — LM Studio URL](#first-run-setup--lm-studio-url)
8. [User Preferences Store](#user-preferences-store)
9. [Data Model](#data-model)
10. [State Management](#state-management)
11. [Firestore Integration](#firestore-integration)
12. [Observability & Logging](#observability--logging)
13. [Streaming Pipeline](#streaming-pipeline)
14. [Token Management](#token-management)
15. [API Reference](#api-reference)
16. [Component Reference](#component-reference)
17. [Environment Configuration](#environment-configuration)
18. [Google OAuth Setup](#google-oauth-setup)
19. [Setup and Running](#setup-and-running)
20. [Usage Guide](#usage-guide)
21. [Error Handling](#error-handling)
22. [Persistence](#persistence)
23. [Deployment](#deployment)
24. [Troubleshooting](#troubleshooting)

---

## Features

| Category | Feature |
|----------|---------|
| Auth | Google SSO via NextAuth.js v5 — sign in with your Google account |
| Auth | Protected routes — unauthenticated users redirected to /login |
| Auth | User avatar, name, and email shown in sidebar footer |
| Auth | Sign-out button in sidebar |
| Setup | First-run server URL screen — enter your LM Studio URL before chatting |
| Setup | Test Connection button — probes /v1/models to verify reachability |
| Setup | URL persisted to localStorage and Firestore under user preferences |
| Setup | URL editable at any time from the sidebar footer |
| Chat | Multi-session conversations with independent history |
| Streaming | Token-by-token response streaming with live cursor indicator |
| Stop | Abort generation mid-stream, keeping the partial response |
| Markdown | Full markdown rendering in assistant messages (GFM) |
| Code | Syntax-highlighted code blocks (Prism, One Dark theme) |
| Persistence | All conversations auto-saved to localStorage + Firestore |
| Model controls | Per-conversation model name, temperature, and max tokens |
| Context trimming | Oldest messages automatically dropped when nearing 8k token limit |
| Auto-title | Conversation title set from the first user message (40 chars) |
| Export | Download any conversation as a formatted JSON file |
| Copy | One-click copy for any message |
| Delete | Delete individual messages or entire conversations |
| Clear | Wipe all messages in a conversation or all conversations at once |
| Rename | Inline rename of conversations in the sidebar |
| Responsive | Collapsible sidebar with mobile overlay |
| Error display | Inline error banner with dismiss, error written into assistant bubble |
| Observability | Structured JSON logging on all API routes and Firestore operations |

---

## Tech Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Framework | Next.js (App Router) | 16.2.4 | Full-stack React framework, API routes, proxy middleware |
| UI | React | 19.2.4 | Component rendering |
| Language | TypeScript | 5.x | Type safety across the entire codebase |
| Styling | Tailwind CSS | 4.x | Utility-first CSS, dark theme |
| Typography | @tailwindcss/typography | 0.5.x | Prose styles for markdown rendering |
| Auth | NextAuth.js | 5.x (beta) | Google OAuth 2.0, session management, route protection |
| State | Zustand | 5.x | Lightweight global store with persistence middleware |
| Markdown | react-markdown + remark-gfm | 10.x / 4.x | Markdown parsing and GitHub Flavored Markdown |
| Syntax highlighting | react-syntax-highlighter (Prism) | 16.x | Code block highlighting, One Dark theme |
| Icons | @heroicons/react | 2.x | SVG icon set (outline + solid) |
| IDs | uuid (v4) | 14.x | Collision-resistant unique IDs for messages and conversations |
| Database | Firebase Firestore | 12.x | Cloud NoSQL — cross-device conversation persistence |
| LLM backend | LM Studio | any | Local OpenAI-compatible inference server |

---

## Dependencies

### Runtime

```
@heroicons/react ^2.2.0
@tailwindcss/typography ^0.5.19
@types/react-syntax-highlighter ^15.5.13
@types/uuid ^10.0.0
firebase 12.12.1
next 16.2.4
next-auth ^5.0.0-beta (beta)
react 19.2.4
react-dom 19.2.4
react-markdown ^10.1.0
react-syntax-highlighter ^16.1.1
remark-gfm ^4.0.1
uuid ^14.0.0
zustand ^5.0.12
```

### Dev

```
@tailwindcss/postcss ^4
@types/node ^20
@types/react ^19
@types/react-dom ^19
eslint ^9
eslint-config-next 16.2.4
tailwindcss ^4
typescript ^5
```

---

## Project Structure

```
local-ai-chat/
├── auth.ts                              # NextAuth config — Google provider, session callback
├── proxy.ts                             # Next.js proxy middleware — route protection
├── firebase.json                        # Firebase project config (Firestore rules + indexes)
├── firestore.rules                      # Firestore security rules (owner-only, field validation)
├── firestore.indexes.json               # Composite index definitions
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   │   └── route.ts                 # NextAuth GET/POST handler
│   │   ├── chat/
│   │   │   └── route.ts                 # POST /api/chat — streaming proxy to LLM
│   │   └── probe-server/
│   │       └── route.ts                 # POST /api/probe-server — test LM Studio reachability
│   ├── components/
│   │   ├── AppShell.tsx                 # Root layout, streaming orchestration, setup gate
│   │   ├── ChatWindow.tsx               # Main panel: header, message list, export, clear
│   │   ├── MessageBubble.tsx            # Single message: markdown, code highlight, copy, delete
│   │   ├── ChatInput.tsx                # Auto-resize textarea, send/stop button
│   │   ├── Sidebar.tsx                  # Conversations, URL editor, user profile, sign-out
│   │   ├── ServerSetup.tsx              # First-run LM Studio URL configuration screen
│   │   ├── ModelSettings.tsx            # Modal: model name, temperature slider, max tokens
│   │   └── SessionProviderWrapper.tsx   # Client wrapper for NextAuth SessionProvider
│   ├── lib/
│   │   ├── types.ts                     # Shared TypeScript interfaces and constants
│   │   ├── tokenUtils.ts                # Token estimation and context window trimming
│   │   ├── firebase.ts                  # Firebase app + Firestore db singleton
│   │   ├── firestoreService.ts          # All Firestore read/write operations (service layer)
│   │   └── logger.ts                    # Structured logger — JSON in prod, colour in dev
│   ├── login/
│   │   └── page.tsx                     # Google sign-in page
│   ├── store/
│   │   ├── chatStore.ts                 # Zustand chat store with localStorage persistence
│   │   └── userStore.ts                 # Zustand user preferences store (URL, setup state)
│   ├── globals.css                      # Tailwind imports, scrollbar styles, prose overrides
│   ├── layout.tsx                       # Root HTML layout — auth session, SessionProvider
│   └── page.tsx                         # Entry point — renders AppShell
├── .env.local                           # Environment variables (not committed)
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## Architecture Overview

```
Browser
  │
  ├── /login  (public)
  │     └── Google sign-in button → NextAuth → Google OAuth → redirect to /
  │
  └── /  (protected by proxy.ts)
        │
        ├── AppShell (client component)
        │     ├── reads: useSession() for user info
        │     ├── reads: useUserStore() for llmBaseUrl + setupComplete
        │     ├── gate: if !setupComplete → renders <ServerSetup />
        │     ├── manages: isStreaming, streamingMsgId, error, sidebarOpen
        │     ├── owns: AbortController ref for stop-generation
        │     └── calls: POST /api/chat with llmBaseUrl in body
        │
        ├── ServerSetup (shown on first run)
        │     ├── URL text input with default http://127.0.0.1:1234
        │     ├── Test Connection → POST /api/probe-server → GET /v1/models
        │     └── Save & Continue → useUserStore.completeSetup(url)
        │
        ├── Sidebar
        │     ├── conversation list (Zustand chatStore)
        │     ├── inline URL editor (Zustand userStore)
        │     └── user avatar + sign-out (NextAuth signOut)
        │
        └── ChatWindow
              ├── message list from active conversation
              └── ChatInput → fires onSend → AppShell.handleSend

Next.js Server
  ├── proxy.ts — checks req.auth, redirects to /login if missing
  ├── POST /api/chat
  │     ├── reads llmBaseUrl from request body (falls back to env)
  │     ├── trims messages to 8k token limit
  │     └── streams response from LM Studio back to browser
  └── POST /api/probe-server
        └── GET {url}/v1/models with 5s timeout → returns { ok: true/false }

LM Studio (local process)
  └── POST http://127.0.0.1:1234/v1/chat/completions
        └── streams chat completions in OpenAI SSE format
```

### Request lifecycle (chat)

1. User types a message and presses Enter.
2. AppShell.handleSend adds the user message and an empty assistant placeholder to Zustand.
3. fetch POST /api/chat with messages, model settings, and llmBaseUrl from userStore.
4. API route trims context, constructs endpoint from llmBaseUrl + /v1/chat/completions.
5. Route opens a streaming connection to LM Studio, pipes each choices[0].delta.content token back as data: {"content":"..."} SSE.
6. AppShell reads the stream, accumulates text, calls updateLastAssistantMessage on every token.
7. On [DONE] or stream end, isStreaming → false.
8. Stop button calls AbortController.abort() — partial response is kept.

---

## Authentication — Google SSO

Authentication is handled by NextAuth.js v5 (beta) with the Google OAuth 2.0 provider.

### How it works

- auth.ts configures NextAuth with the Google provider and a session callback that exposes the user's sub (Google ID) as session.user.id.
- proxy.ts (Next.js proxy middleware) runs on every request. It checks req.auth and redirects unauthenticated users to /login.
- /login/page.tsx is a server component that renders the sign-in card. The form action calls signIn("google") server-side.
- After successful OAuth, Google redirects back to /api/auth/callback/google, NextAuth creates a JWT session, and the user is redirected to /.
- SessionProviderWrapper.tsx wraps the app in NextAuth's client-side SessionProvider so useSession() works in client components.
- The Sidebar reads session.user.image, session.user.name, and session.user.email to display the user profile and sign-out button.

### Session data

```typescript
session.user = {
  id: string        // Google sub (unique user ID)
  name: string      // Google display name
  email: string     // Google email
  image: string     // Google profile picture URL
}
```

### Routes protected by proxy.ts

All routes except:
- /login
- /api/auth/* (NextAuth callbacks)
- /api/probe-server (needed before auth for setup screen)
- /_next/* (static assets)
- /favicon.ico

---

## First-Run Setup — LM Studio URL

On first load (after sign-in), if useUserStore.setupComplete is false, AppShell renders the ServerSetup screen instead of the chat UI.

### ServerSetup screen

- URL input pre-filled with http://127.0.0.1:1234
- Step-by-step instructions for starting LM Studio server
- Test Connection button — calls POST /api/probe-server which does GET {url}/v1/models with a 5-second timeout
- Green success banner if reachable, red error banner with message if not
- Save & Continue — calls completeSetup(url), sets setupComplete: true in localStorage, renders the chat UI

### Changing the URL later

The sidebar footer always shows the current LM Studio URL with an Edit button. Clicking Edit opens an inline input (Enter to save, Escape to cancel). Changes are written immediately to userStore and take effect on the next message sent.

---

## User Preferences Store

Zustand store at app/store/userStore.ts, persisted to localStorage under the key local-ai-chat-user-prefs.

```typescript
interface UserState {
  llmBaseUrl: string       // e.g. "http://127.0.0.1:1234"
  setupComplete: boolean   // false until user completes ServerSetup

  setLlmBaseUrl: (url: string) => void
  completeSetup: (url: string) => void   // sets both llmBaseUrl and setupComplete: true
  resetSetup: () => void                 // resets to defaults (shows setup screen again)
}
```

Default values: llmBaseUrl = "http://127.0.0.1:1234", setupComplete = false.

The llmBaseUrl is sent with every POST /api/chat request in the body as the llmBaseUrl field. The API route uses it to construct the full endpoint URL, falling back to the LLM_BASE_URL environment variable if not provided.

---

## Data Model

All types are defined in app/lib/types.ts.

### Role
```typescript
type Role = "system" | "user" | "assistant"
```

### Message
```typescript
interface Message {
  id: string        // UUID v4
  role: Role
  content: string
  createdAt: number // Unix timestamp (ms)
}
```

### Conversation
```typescript
interface Conversation {
  id: string          // UUID v4
  title: string       // Auto-set from first user message (max 40 chars)
  messages: Message[] // Includes the hidden system message at index 0
  createdAt: number
  updatedAt: number
  model: string       // LM Studio model identifier
  temperature: number // 0.0 to 2.0
  maxTokens: number   // Max tokens for the completion
}
```

### ChatSettings
```typescript
interface ChatSettings {
  model: string
  temperature: number
  maxTokens: number
}
```

### Constants
```
DEFAULT_SETTINGS = { model: "gemma-4-e4b", temperature: 0.7, maxTokens: 1000 }
SYSTEM_PROMPT    = "You are a helpful, harmless, and honest AI assistant."
MAX_CONTEXT_TOKENS = 8000
```

---

## State Management

Two Zustand stores, both persisted to localStorage.

### chatStore (local-ai-chat-store)

Manages all conversations and messages.

```typescript
interface ChatState {
  conversations: Conversation[]
  activeId: string | null
  activeConversation: () => Conversation | null
  createConversation: () => string
  deleteConversation: (id: string) => void
  selectConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  clearConversations: () => void
  addMessage: (convId, msg) => Message
  updateLastAssistantMessage: (convId, content) => void
  deleteMessage: (convId, messageId) => void
  updateSettings: (convId, Partial<ChatSettings>) => void
}
```

### userStore (local-ai-chat-user-prefs)

Manages user preferences — LM Studio URL and setup state.

```typescript
interface UserState {
  llmBaseUrl: string
  setupComplete: boolean
  setLlmBaseUrl: (url: string) => void
  completeSetup: (url: string) => void
  resetSetup: () => void
}
```

---

## Firestore Integration

Conversations, messages, and user preferences are persisted to **Cloud Firestore** (Firebase project `prepforexams-aabbd`) in addition to localStorage. This enables cross-device access and durable storage.

### Data layout

```
/users/{userId}                                    ← user preferences
/users/{userId}/conversations/{id}                 ← conversation metadata
/users/{userId}/conversations/{id}/messages/{id}   ← individual messages
```

`userId` is the Google `sub` from the NextAuth session (`session.user.id`).

### Service layer

All Firestore operations go through `app/lib/firestoreService.ts`. Never call the Firestore SDK directly from components or stores.

| Function | Purpose |
|----------|---------|
| `saveConversation` | Upsert conversation metadata |
| `loadConversations` | List all conversations for a user, ordered by `updatedAt` desc |
| `deleteConversation` | Batch-delete conversation + all child messages atomically |
| `updateConversationMeta` | Patch title / settings / updatedAt |
| `saveMessage` | Append a single message |
| `loadMessages` | Load all messages ordered by `createdAt` asc |
| `updateMessageContent` | Update content after streaming completes |
| `deleteMessage` | Remove a single message |
| `saveUserPrefs` | Persist `llmBaseUrl` + `setupComplete` |
| `loadUserPrefs` | Load user prefs (returns `null` for new users) |

### Security rules

Rules are in `firestore.rules` and deployed to Firebase. Key invariants:

- Every read/write requires `request.auth != null`
- Users can only access their own documents (`request.auth.uid == userId`)
- `userId` field in written documents must equal the caller's uid
- Message content capped at 32 768 chars; title capped at 200 chars
- Messages are **immutable** once written (no update via rules)
- Catch-all deny — everything not explicitly allowed is blocked

Deploy rules:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Observability & Logging

All structured logging goes through `app/lib/logger.ts`. Never use `console.log` directly in application code.

```ts
import { logger } from "@/app/lib/logger";

logger.info("api.chat.request", { model, messageCount });
logger.error("firestore.message.save.failed", { error: err.message, messageId });
```

### Output by environment

| Environment | Format | Destination |
|-------------|--------|-------------|
| `development` | Colour-coded human-readable | console |
| `production` | JSON lines (one object per line) | stdout |

### JSON line shape (production)

```json
{
  "level": "info",
  "event": "api.chat.stream.done",
  "timestamp": "2026-04-28T10:23:45.123Z",
  "model": "gemma-4-e4b",
  "tokenCount": 142,
  "durationMs": 3210
}
```

JSON lines on stdout are compatible with **CloudWatch Logs**, **Datadog**, **GCP Cloud Logging**, and any log aggregator that reads container stdout. To add CloudWatch alarms or dashboards, activate the `aws-observability` power in Kiro.

### Event naming convention

`<layer>.<entity>.<action>[.failed]`

| Layer | Example events |
|-------|---------------|
| `api` | `api.chat.request`, `api.chat.stream.done`, `api.chat.llm.unreachable` |
| `firestore` | `firestore.conversation.save`, `firestore.message.load.failed` |
| `auth` | `auth.session.missing`, `auth.redirect` |

### What is never logged

- Passwords, tokens, API keys, or `AUTH_SECRET`
- Full message content (potential PII) — only `messageId` and `role` are logged
- Raw stack traces — only `err.message` is logged

---

## Streaming Pipeline

### Server side (app/api/chat/route.ts)

1. Receives { messages, model, temperature, max_tokens, llmBaseUrl } in the POST body.
2. Constructs endpoint: (llmBaseUrl || LLM_BASE_URL) + /v1/chat/completions.
3. Validates messages array.
4. Calls trimMessagesToLimit(messages, 8000).
5. POSTs to LM Studio with stream: true.
6. Creates a TransformStream. An async IIFE reads from the LLM response body:
   - Splits each chunk on newline, looks for data: prefixed lines.
   - Parses JSON, extracts choices[0].delta.content.
   - Re-emits as data: {"content":"<token>"} newline newline.
   - Forwards data: [DONE] verbatim.
   - On stream error, emits data: {"error":"<message>"}.
7. Returns the readable side with Content-Type: text/event-stream.

### Client side (app/components/AppShell.tsx)

1. fetch("/api/chat", { signal: controller.signal }) with llmBaseUrl in body.
2. Reads res.body via getReader() + TextDecoder with { stream: true }.
3. Accumulates content, calls updateLastAssistantMessage on every token.
4. On AbortError (Stop button): silently exits, keeping partial text.
5. On any other error: sets error banner, writes error into assistant bubble.

---

## Token Management

Implemented in app/lib/tokenUtils.ts.

Estimation: Math.ceil(text.length / 4) — approximately 4 characters per token (GPT-style heuristic).

Trimming: trimMessagesToLimit(messages, maxTokens) — separates the system message, iteratively drops the oldest non-system message until the estimated total is below maxTokens. Always preserves the system message and the most recent message. Applied server-side before forwarding to LM Studio.

---

## API Reference

### POST /api/chat

Streams the assistant response as Server-Sent Events.

Request body:
```json
{
  "messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
  "model": "gemma-4-e4b",
  "temperature": 0.7,
  "max_tokens": 1000,
  "llmBaseUrl": "http://127.0.0.1:1234"
}
```

Success response — 200 text/event-stream:
```
data: {"content":"Hello"}
data: {"content":", how can I help?"}
data: [DONE]
```

Error responses:

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Missing or empty messages | {"error":"messages array is required"} |
| 503 | LM Studio not running / ECONNREFUSED | {"error":"Cannot connect to LLM server at ..."} |
| 503 | LM Studio returned non-2xx | {"error":"LLM server error <status>: <body>"} |
| 500 | Unexpected server error | {"error":"<message>"} |

### POST /api/probe-server

Tests whether a given URL is a reachable LM Studio server.

Request body:
```json
{ "url": "http://127.0.0.1:1234" }
```

Success response:
```json
{ "ok": true }
```

Failure response:
```json
{ "ok": false, "error": "Connection refused. Make sure LM Studio is running." }
```

This route is excluded from auth protection so it can be called from the ServerSetup screen before the user is signed in.

---

## Component Reference

### AppShell

Root client component. Owns all streaming state and the send/stop logic.

State: isStreaming, streamingMsgId, error, sidebarOpen, hydrated.
Reads: useSession() for user info, useUserStore() for llmBaseUrl and setupComplete.
Gate: renders ServerSetup if !setupComplete, otherwise renders the full chat UI.
Passes llmBaseUrl to every POST /api/chat request.

### ServerSetup

First-run configuration screen. Shown when setupComplete is false.

- URL input with default http://127.0.0.1:1234
- Test Connection → POST /api/probe-server → shows green/red feedback
- Save & Continue → completeSetup(url) → dismissed permanently (until resetSetup)

### Sidebar

Displays conversation list, LM Studio URL editor, and user profile.

- Conversation CRUD: create, select, rename (inline), delete, clear all
- URL section: shows current llmBaseUrl with Edit button; inline input on edit
- User section: Google profile picture (next/image), name, email, sign-out button

### ChatWindow

Main panel. Reads active conversation from Zustand.

- Message list filtered to non-system roles
- Auto-scroll on new messages and streaming content updates
- Header: conversation title, model badge, export (JSON download), clear, settings

### MessageBubble

Renders a single message. System messages return null.

- User: right-aligned indigo bubble, plain text with whitespace-pre-wrap
- Assistant: left-aligned gray bubble, full ReactMarkdown with GFM
- Code blocks: Prism SyntaxHighlighter with One Dark theme
- Streaming cursor: pulsing indigo block when isStreaming and msg.id === streamingId
- Copy button: clipboard API, icon swaps to checkmark for 2 seconds
- Delete button: hover-reveal trash icon

### ChatInput

Auto-resizing textarea.

- Auto-resize up to 200px via scrollHeight
- Enter to send, Shift+Enter for newline
- Send button disabled when empty or streaming
- Stop button (red) shown during streaming, calls onStop

### ModelSettings

Modal dialog for per-conversation LLM parameters.

| Control | Range | Default |
|---------|-------|---------|
| Model name | Free text | gemma-4-e4b |
| Temperature | 0.0 to 2.0 (step 0.1) | 0.7 |
| Max tokens | 64 to 32000 (step 64) | 1000 |

### SessionProviderWrapper

Thin client wrapper that passes the server-fetched session to NextAuth's SessionProvider, avoiding an extra client-side fetch on load.

---

## Environment Configuration

.env.local:

```
LLM_BASE_URL=http://127.0.0.1:1234
LLM_API_PATH=/v1/chat/completions

AUTH_SECRET=<random 32-byte hex string>
AUTH_GOOGLE_ID=<your Google OAuth client ID>
AUTH_GOOGLE_SECRET=<your Google OAuth client secret>
NEXTAUTH_URL=http://localhost:3000
```

The LLM_BASE_URL and LLM_API_PATH are server-side fallbacks only. The actual URL used at runtime comes from the user's preference (llmBaseUrl in userStore), sent in the POST /api/chat request body.

AUTH_SECRET must be a cryptographically random string. Generate one with:
```bash
node -e "const c = require('crypto'); console.log(c.randomBytes(32).toString('hex'))"
```

---

## Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create a new project (or select an existing one)
3. Go to APIs & Services > Credentials
4. Click Create Credentials > OAuth 2.0 Client ID
5. Application type: Web application
6. Add Authorized redirect URI: http://localhost:3000/api/auth/callback/google
7. Copy the Client ID and Client Secret
8. Add them to .env.local as AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET

For production, add your production domain to the authorized redirect URIs and update NEXTAUTH_URL.

---

## Setup and Running

### 1. Start LM Studio

1. Download and open LM Studio from https://lmstudio.ai
2. Search for and download a model (Gemma 4 E4B or any GGUF model)
3. Go to the Local Server tab (the arrow icon in the left sidebar)
4. Select your model and click Load Model
5. Click Start Server — it should show Running on http://127.0.0.1:1234

### 2. Configure Google OAuth

Follow the Google OAuth Setup section above and fill in .env.local.

### 3. Install dependencies

```bash
npm install
```

### 4. Run in development

```bash
npm run dev
```

Open http://localhost:3000. You will be redirected to /login. Sign in with Google, then enter your LM Studio URL on the setup screen.

### 5. Build for production

```bash
npm run build
npm start
```

---

## Usage Guide

| Action | How |
|--------|-----|
| Sign in | Click Continue with Google on the login page |
| Configure LM Studio URL | Enter URL on the setup screen, optionally test, then Save & Continue |
| Change LM Studio URL | Sidebar footer → Edit next to the URL |
| New conversation | Click + in the sidebar header |
| Send message | Type and press Enter |
| Insert newline | Shift + Enter |
| Stop generation | Click the red stop button (appears during streaming) |
| Rename conversation | Hover over it in the sidebar → click pencil icon |
| Delete conversation | Hover over it in the sidebar → click trash icon |
| Clear all conversations | Sidebar footer → Clear all chats |
| Change model / temperature / tokens | Click the gear icon in the chat header |
| Export conversation | Click the download icon in the chat header |
| Clear messages in chat | Click the trash icon in the chat header |
| Copy a message | Hover over the message → click clipboard icon |
| Delete a message | Hover over the message → click trash icon |
| Sign out | Sidebar footer → click the sign-out icon next to your name |

---

## Error Handling

| Scenario | Behavior |
|----------|---------|
| Not signed in | proxy.ts redirects to /login |
| LM Studio not running | 503 with descriptive message; error banner + assistant bubble shows error |
| Wrong LM Studio URL | Same as above; user can edit URL in sidebar |
| Test connection fails | Red error banner in ServerSetup with specific reason |
| Stream error mid-response | data: {"error":"..."} event; client shows error banner |
| User aborts (Stop) | AbortError caught silently; partial response preserved |
| Empty message submitted | Send button disabled; no request made |
| Malformed SSE lines | Silently skipped on both server and client |

---

## Persistence

### localStorage (client-side, always active)

| Key | Contents |
|-----|---------|
| `local-ai-chat-store` | All conversations, messages, active conversation ID |
| `local-ai-chat-user-prefs` | `llmBaseUrl`, `setupComplete` flag |

Both are managed by Zustand's `persist` middleware and survive page refreshes and browser restarts. Data is per-browser and per-origin.

### Firestore (cloud, requires sign-in)

All data is also written to Firestore under `/users/{userId}/...` using the service layer in `app/lib/firestoreService.ts`. This enables:

- Cross-device access — sign in on any browser and your conversations are there
- Durable storage — data survives clearing localStorage
- Multi-user isolation — each user's data is strictly separated by security rules

To reset the setup screen (re-show the URL configuration): call `useUserStore.getState().resetSetup()` from the browser console, or clear localStorage.

---

## Deployment

This app is designed for **local use** — the LLM never leaves your machine. The Next.js frontend and API layer can also be deployed to a server so teammates on the same network or VPN can share one LM Studio instance.

### Pre-deployment checklist

- [ ] `AUTH_SECRET` is a strong random value:
  ```bash
  node -e "const c=require('crypto'); console.log(c.randomBytes(32).toString('hex'))"
  ```
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are real credentials
- [ ] `NEXTAUTH_URL` exactly matches the URL users will access (protocol + domain + port)
- [ ] Google Cloud Console redirect URI = `NEXTAUTH_URL` + `/api/auth/callback/google`
- [ ] LM Studio is running and reachable from the deployment environment
- [ ] `.env.local` is **not** committed (it is in `.gitignore`)
- [ ] Firestore rules deployed: `firebase deploy --only firestore`
- [ ] `npm run build` passes with 0 errors

### Option 1 — Local machine (default)

```bash
npm run dev          # development, hot-reload → http://localhost:3000
npm run build && npm start   # production build → http://localhost:3000
```

### Option 2 — Local network (share with teammates)

Bind to all interfaces so other machines on the network can reach the app:

```bash
npm run build
npx next start -H 0.0.0.0 -p 3000
```

Find your IP: `ifconfig | grep "inet "` (macOS/Linux) or `ipconfig` (Windows).
Share `http://<your-ip>:3000` with teammates.

Update `.env.local`:
```env
NEXTAUTH_URL=http://<your-local-ip>:3000
```

Add that URL as an Authorised Redirect URI in Google Cloud Console.

### Option 3 — Vercel (cloud)

> ⚠️ LM Studio must be publicly reachable (or on a VPN) — the app proxies requests to it but does not run the model itself.

```bash
npm install -g vercel
vercel
```

Set these in the Vercel dashboard (Project → Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `LLM_BASE_URL` | Your LM Studio URL (must be reachable from Vercel) |
| `LLM_API_PATH` | `/v1/chat/completions` |
| `AUTH_SECRET` | 32-byte hex secret |
| `AUTH_GOOGLE_ID` | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

Update Google Cloud Console → Authorised Redirect URIs:
```
https://your-app.vercel.app/api/auth/callback/google
```

### Option 4 — Docker (self-hosted)

Add `output: "standalone"` to `next.config.ts`:
```ts
const nextConfig: NextConfig = {
  output: "standalone",
  images: { remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }] },
};
```

Create `Dockerfile` at the project root:
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

Build and run:
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

`host.docker.internal` resolves to the host machine from inside Docker — lets the container reach LM Studio on your Mac/PC.-from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t local-ai-chat .
docker run -p 3000:3000 \
  -e AUTH_SECRET=... \
  -e AUTH_GOOGLE_ID=... \
  -e AUTH_GOOGLE_SECRET=... \
  -e NEXTAUTH_URL=http://localhost:3000 \
  -e LLM_BASE_URL=http://host.docker.internal:1234 \
  -e LLM_API_PATH=/v1/chat/completions \
  local-ai-chat
```

`host.docker.internal` resolves to the host machine from inside Docker, letting the container reach LM Studio on your Mac/PC.

### Pre-deployment checklist

- [ ] `AUTH_SECRET` is a strong random value (not the default from this repo)
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are set
- [ ] `NEXTAUTH_URL` matches the exact URL users will access (including protocol and port)
- [ ] Google Cloud Console redirect URI matches `NEXTAUTH_URL/api/auth/callback/google`
- [ ] LM Studio is running and reachable from the deployment environment
- [ ] `.env.local` is **not** committed (it is in `.gitignore` by default in Next.js)

---

## Troubleshooting

**Redirected to /login on every load**
- Check that AUTH_SECRET, AUTH_GOOGLE_ID, and AUTH_GOOGLE_SECRET are set in .env.local.
- Verify the Google OAuth redirect URI matches exactly: http://localhost:3000/api/auth/callback/google.

**Google sign-in fails with redirect_uri_mismatch**
- The redirect URI in Google Cloud Console must exactly match NEXTAUTH_URL + /api/auth/callback/google.

**Setup screen appears every time**
- The userStore is persisted to localStorage. If localStorage is cleared or blocked, setupComplete resets to false.

**Cannot connect to LLM server**
- Confirm LM Studio is open and the server is started (green indicator).
- Confirm a model is loaded.
- Check the URL in the sidebar footer matches what LM Studio shows.
- Use Test Connection to diagnose.

**LLM server error 400**
- Ensure the API path is /v1/chat/completions (OpenAI-compatible endpoint), not /api/v1/chat (LM Studio stateful API).
- The correct LLM_API_PATH in .env.local is /v1/chat/completions.

**Blank or empty assistant responses**
- Check LM Studio server logs for errors.
- Try increasing max_tokens in model settings.

**Responses cut off early**
- Increase max_tokens in the gear icon model settings modal (up to 32000).

**localStorage full**
- Export important conversations via the download icon, then delete old ones.
- Consider upgrading to SQLite.

---

## Roadmap

Full task tracking is in [TASKS.md](./TASKS.md). Summary below.

### ✅ Done (v0.1 → v0.3)

- Core chat UI — sidebar, message bubbles, auto-scroll, markdown, code highlighting
- Streaming responses (SSE) with stop-generation support
- Multi-session conversations with localStorage persistence
- Per-conversation model settings (model name, temperature, max tokens)
- Token estimation and context trimming (8k limit)
- Copy, delete, rename, export, clear actions
- Google SSO via NextAuth.js v5
- Route protection via proxy middleware
- First-run LM Studio URL setup screen with connection test
- User preferences store (URL, setup state) persisted to localStorage
- Inline URL editor in sidebar footer
- **Firestore integration** — conversations, messages, and user prefs persisted to Cloud Firestore
- **Firestore security rules** — owner-only access, field validation, immutable messages, catch-all deny
- **Structured observability** — JSON-line logger on all API routes and Firestore operations

### ⬜ Planned

| Priority | Feature | Notes |
|----------|---------|-------|
| 🔴 High | Regenerate last response | Remove last assistant turn, re-send last user message |
| 🔴 High | System prompt editor | Per-conversation, editable from model settings modal |
| 🔴 High | Multi-model switcher | Fetch `GET /v1/models` to list loaded models as a dropdown |
| 🟡 Medium | Conversation search | Filter sidebar by title or message content |
| 🟡 Medium | SQLite persistence (v2) | Replace localStorage with Prisma + SQLite |
| 🟡 Medium | Keyboard shortcuts | `Cmd+K` new chat, `Cmd+Shift+S` sidebar toggle |
| 🟡 Medium | Message timestamps | Relative timestamps on hover |
| 🟡 Medium | Conversation folders / tags | Group and organise conversations |
| 🟢 Low | Image upload (vision models) | Base64 encode, include in messages array |
| 🟢 Low | Export to PDF / Markdown | In addition to existing JSON export |
| 🟢 Low | Prompt templates | Quick-start prompts on empty chat screen |
| 🟢 Low | Token usage display | Per-message and conversation totals |
| 🟢 Low | Dark / light theme toggle | Persist in userStore |
| 🟢 Low | PWA / offline support | Install as app, offline chat history |

### Known Issues / Tech Debt

- `confirm()` dialogs should be replaced with a proper modal component
- No rate limiting on `/api/chat`

---
