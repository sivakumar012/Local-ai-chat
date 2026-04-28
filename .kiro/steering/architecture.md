---
inclusion: always
---

# Architecture

## Directory structure

```
local-ai-chat/
├── auth.ts                              # NextAuth config — Google provider
├── proxy.ts                             # Route protection middleware
├── next.config.ts                       # Next.js config (image remotePatterns)
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts  # NextAuth GET/POST handler
│   │   ├── chat/route.ts                # POST — streaming proxy to LM Studio
│   │   └── probe-server/route.ts        # POST — test LM Studio reachability
│   ├── components/
│   │   ├── AppShell.tsx                 # Root: streaming logic, auth, setup gate
│   │   ├── ChatWindow.tsx               # Message list, header, export, clear
│   │   ├── MessageBubble.tsx            # Single message: markdown, copy, delete
│   │   ├── ChatInput.tsx                # Auto-resize textarea, send/stop
│   │   ├── Sidebar.tsx                  # Conversations, URL editor, user profile
│   │   ├── ServerSetup.tsx              # First-run LM Studio URL screen
│   │   ├── ModelSettings.tsx            # Modal: model, temperature, max tokens
│   │   └── SessionProviderWrapper.tsx   # NextAuth client SessionProvider
│   ├── lib/
│   │   ├── types.ts                     # Shared interfaces and constants
│   │   ├── tokenUtils.ts                # Token estimation + context trimming
│   │   ├── firebase.ts                  # Firebase app + Firestore db singleton
│   │   ├── firestoreService.ts          # All Firestore read/write operations
│   │   └── logger.ts                    # Structured logger (JSON in prod, colour in dev)
│   ├── login/page.tsx                   # Google sign-in page
│   ├── store/
│   │   ├── chatStore.ts                 # Conversations + messages (Zustand)
│   │   └── userStore.ts                 # LM Studio URL + setup state (Zustand)
│   ├── globals.css                      # Tailwind + scrollbar + prose overrides
│   ├── layout.tsx                       # Root layout — auth session + providers
│   └── page.tsx                         # Entry → renders AppShell
```

## Data flow

```
User types → ChatInput.onSend
  → AppShell.handleSend
    → chatStore.addMessage (user + empty assistant placeholder)
    → fetch POST /api/chat { messages, model, temperature, max_tokens, llmBaseUrl }
      → API route: trim context → fetch LM Studio /v1/chat/completions (stream: true)
        → TransformStream: parse SSE → re-emit data: {"content":"<token>"}
      → AppShell: read stream → chatStore.updateLastAssistantMessage (per token)
    → isStreaming = false on [DONE] or abort
```

## Auth flow

```
Request → proxy.ts
  → if /login, /api/auth/*, /api/probe-server, /_next → pass through
  → if !req.auth → redirect to /login
  → else → pass through

/login → signIn("google") → Google OAuth → /api/auth/callback/google
  → NextAuth creates JWT session → redirect to /
```

## State management

Two Zustand stores, both persisted to localStorage:

**chatStore** (`local-ai-chat-store`)
- `conversations[]` — full history including system messages
- `activeId` — currently selected conversation
- Actions: create, delete, select, rename, clear, addMessage, updateLastAssistantMessage, deleteMessage, updateSettings

**userStore** (`local-ai-chat-user-prefs`)
- `llmBaseUrl` — LM Studio server URL (sent in every /api/chat request)
- `setupComplete` — false until user completes ServerSetup screen
- Actions: setLlmBaseUrl, completeSetup, resetSetup

## Key constants (app/lib/types.ts)

```ts
DEFAULT_SETTINGS = { model: "gemma-4-e4b", temperature: 0.7, maxTokens: 1000 }
SYSTEM_PROMPT    = "You are a helpful, harmless, and honest AI assistant."
MAX_CONTEXT_TOKENS = 8000
```

## Token management (app/lib/tokenUtils.ts)

- Estimation: `Math.ceil(text.length / 4)` — ~4 chars per token
- Trimming: drops oldest non-system messages until total < 8000 tokens
- Applied server-side in `/api/chat` before forwarding to LM Studio
