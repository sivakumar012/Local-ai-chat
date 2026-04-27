# Local AI Chat

A production-ready, full-stack ChatGPT-like interface that runs entirely on your local machine. Connects to LM Studio (or any OpenAI-compatible local LLM server) via a streaming API. No cloud inference — your conversations never leave your machine.

---

## Table of Contents

1. Features
2. Tech Stack
3. Dependencies
4. Project Structure
5. Architecture Overview
6. Authentication — Google SSO
7. First-Run Setup — LM Studio URL
8. User Preferences Store
9. Data Model
10. State Management
11. Streaming Pipeline
12. Token Management
13. API Reference
14. Component Reference
15. Environment Configuration
16. Google OAuth Setup
17. Setup and Running
18. Usage Guide
19. Error Handling
20. Persistence
21. Upgrading to SQLite (v2)
22. Troubleshooting

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
| Setup | URL persisted to localStorage under user preferences |
| Setup | URL editable at any time from the sidebar footer |
| Chat | Multi-session conversations with independent history |
| Streaming | Token-by-token response streaming with live cursor indicator |
| Stop | Abort generation mid-stream, keeping the partial response |
| Markdown | Full markdown rendering in assistant messages (GFM) |
| Code | Syntax-highlighted code blocks (Prism, One Dark theme) |
| Persistence | All conversations auto-saved to localStorage |
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
| LLM backend | LM Studio | any | Local OpenAI-compatible inference server |

---

## Dependencies

### Runtime

```
@heroicons/react ^2.2.0
@tailwindcss/typography ^0.5.19
@types/react-syntax-highlighter ^15.5.13
@types/uuid ^10.0.0
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
│   │   ├── llm.ts                       # LLM HTTP client (streamChat function)
│   │   └── tokenUtils.ts                # Token estimation and context window trimming
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

Two localStorage keys:

| Key | Contents |
|-----|---------|
| local-ai-chat-store | All conversations, messages, active conversation ID |
| local-ai-chat-user-prefs | llmBaseUrl, setupComplete flag |

Both are managed by Zustand's persist middleware and survive page refreshes and browser restarts. Data is per-browser and per-origin (http://localhost:3000).

To reset the setup screen (re-show the URL configuration): call useUserStore.getState().resetSetup() from the browser console, or clear localStorage.

---

## Upgrading to SQLite (v2)

To persist data in a local SQLite database instead of localStorage:

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite
```

Schema (prisma/schema.prisma):
```prisma
model Conversation {
  id          String    @id @default(cuid())
  title       String
  model       String    @default("gemma-4-e4b")
  temperature Float     @default(0.7)
  maxTokens   Int       @default(1000)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  messages    Message[]
}

model Message {
  id             String       @id @default(cuid())
  role           String
  content        String
  createdAt      DateTime     @default(now())
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  conversationId String
}
```

Then create API routes for conversations and messages backed by Prisma, and replace the Zustand persist middleware with fetch calls to those routes.

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

### ✅ Done (v0.1 + v0.2)

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
- Lint clean — 0 errors, 0 warnings

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
