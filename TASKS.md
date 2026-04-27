# Task List — Local AI Chat

Track of completed work and upcoming features. Status: ✅ Done · 🔄 In Progress · ⬜ Planned

---

## ✅ Completed

### v0.1 — Core Chat App
- [x] Next.js 16 App Router project scaffold (TypeScript + Tailwind v4)
- [x] ChatGPT-like UI — sidebar + main panel layout
- [x] Multi-session conversations with independent message history
- [x] Zustand store with localStorage persistence (`local-ai-chat-store`)
- [x] System message injected automatically into every conversation
- [x] Auto-title conversations from first user message (40 chars)
- [x] Message bubbles — user (right, indigo) vs assistant (left, gray)
- [x] Auto-scroll to latest message on new content
- [x] Multiline textarea input — Enter to send, Shift+Enter for newline
- [x] Auto-resize textarea (up to 200px)
- [x] Streaming responses via SSE — token-by-token rendering
- [x] Live cursor indicator during streaming
- [x] Stop generation button (AbortController) — keeps partial response
- [x] POST `/api/chat` — streaming proxy to LM Studio
- [x] OpenAI-compatible endpoint: `POST /v1/chat/completions`
- [x] Token estimation (~4 chars/token) and context trimming (8k limit)
- [x] Markdown rendering in assistant messages (react-markdown + remark-gfm)
- [x] Syntax-highlighted code blocks (Prism, One Dark theme)
- [x] Inline code styling
- [x] Copy message button (clipboard API, 2s checkmark feedback)
- [x] Delete individual messages
- [x] Inline conversation rename (pencil icon, Enter/Escape)
- [x] Delete conversation (auto-selects next)
- [x] Clear all messages in a conversation
- [x] Clear all conversations
- [x] Export conversation as JSON download
- [x] Per-conversation model settings modal (model name, temperature, max tokens)
- [x] Error banner with dismiss — connection refused, LLM errors
- [x] Error written into assistant bubble on failure
- [x] Responsive layout — collapsible sidebar with mobile overlay
- [x] Hydration guard (`useSyncExternalStore`) to prevent SSR/client mismatch
- [x] Environment config via `.env.local` (`LLM_BASE_URL`, `LLM_API_PATH`)

### v0.2 — Auth + User Preferences
- [x] Google SSO via NextAuth.js v5 (beta)
- [x] `/login` page with Google sign-in button
- [x] Route protection via `proxy.ts` (Next.js proxy middleware)
- [x] Session passed server-side to `SessionProviderWrapper` (no extra client fetch)
- [x] User avatar, name, email displayed in sidebar footer
- [x] Sign-out button in sidebar
- [x] First-run LM Studio URL setup screen (`ServerSetup`)
- [x] URL text input pre-filled with `http://127.0.0.1:1234`
- [x] Test Connection button — probes `GET /v1/models` with 5s timeout
- [x] Green/red feedback on connection test
- [x] `POST /api/probe-server` route (excluded from auth protection)
- [x] User preferences Zustand store (`local-ai-chat-user-prefs`) — `llmBaseUrl`, `setupComplete`
- [x] Inline URL editor in sidebar footer (Edit → input → Enter/Escape)
- [x] `llmBaseUrl` sent in every `/api/chat` request body (server falls back to env)
- [x] Fixed LLM API path: `/v1/chat/completions` (not `/api/v1/chat`)
- [x] Lint clean — 0 errors, 0 warnings
- [x] `next/image` `remotePatterns` configured for `lh3.googleusercontent.com` (Google avatars)
- [x] Removed unused `app/lib/llm.ts` (route inlines the fetch directly)

---

## ⬜ Planned

### High Priority

- [ ] **Regenerate last response**
  Trash + retry button on the last assistant message. Removes the last assistant turn and re-sends the last user message.
  _Files: `ChatWindow.tsx`, `AppShell.tsx`, `chatStore.ts`_

- [ ] **System prompt editor**
  Per-conversation editable system prompt. Accessible from the model settings modal or a dedicated button in the chat header. Updates the hidden system message in the conversation.
  _Files: `ModelSettings.tsx`, `chatStore.ts`_

- [ ] **Multi-model switcher**
  Fetch `GET /v1/models` from the configured LM Studio URL to list currently loaded models. Show a dropdown in the model settings modal instead of a free-text field.
  _Files: `ModelSettings.tsx`, new `app/api/models/route.ts`_

### Medium Priority

- [ ] **Conversation search / filter**
  Search input at the top of the sidebar that filters conversations by title or message content in real time.
  _Files: `Sidebar.tsx`_

- [ ] **SQLite persistence via Prisma (v2)**
  Replace localStorage with a local SQLite database. Add `prisma/schema.prisma` with `Conversation` and `Message` models. Create REST API routes for CRUD. Replace Zustand `persist` middleware with fetch calls.
  _Files: new `prisma/schema.prisma`, new `app/api/conversations/`, new `app/api/messages/`_

- [ ] **Keyboard shortcuts**
  `Cmd/Ctrl+K` → new chat, `Cmd/Ctrl+Shift+S` → sidebar toggle, `Escape` → close modals.
  _Files: `AppShell.tsx`, global `useKeyboardShortcuts` hook_

- [ ] **Message timestamps**
  Show relative timestamps (e.g. "2 min ago") on hover for each message bubble.
  _Files: `MessageBubble.tsx`_

- [ ] **Conversation folders / tags**
  Group conversations into user-defined folders or tag them for organisation.
  _Files: `Sidebar.tsx`, `chatStore.ts`, `types.ts`_

### Low Priority

- [ ] **Image upload (vision models)**
  Attach images to messages via drag-and-drop or file picker. Encode as base64 and include in the messages array for vision-capable models.
  _Files: `ChatInput.tsx`, `app/api/chat/route.ts`, `types.ts`_

- [ ] **Chat export to PDF / Markdown**
  Export a conversation as a formatted PDF or `.md` file in addition to the existing JSON export.
  _Files: `ChatWindow.tsx`, new `app/lib/exportUtils.ts`_

- [ ] **Chat sharing (read-only link)**
  Generate a shareable read-only URL for a conversation. Requires a backend store (SQLite v2 first).
  _Depends on: SQLite persistence_

- [ ] **Prompt templates / quick actions**
  Pre-defined prompt starters shown on the empty chat screen (e.g. "Summarise this", "Write a function that…").
  _Files: `ChatWindow.tsx`, new `app/lib/templates.ts`_

- [ ] **Token usage display**
  Show estimated input/output token counts per message and a running total for the conversation.
  _Files: `MessageBubble.tsx`, `tokenUtils.ts`_

- [ ] **Dark / light theme toggle**
  Add a theme switcher to the sidebar footer. Persist preference in `userStore`.
  _Files: `Sidebar.tsx`, `userStore.ts`, `globals.css`_

- [ ] **PWA / offline support**
  Add a `manifest.json` and service worker so the app can be installed and used offline (chat history only — LLM still requires the local server).

---

### Known Issues / Tech Debt

- [ ] `confirm()` dialogs (clear chat, delete conversation) should be replaced with a proper modal component for better UX and accessibility.
- [ ] No loading state shown while the initial session check runs (brief flash before redirect).
- [ ] No rate limiting on `/api/chat` — a malformed client could spam the LLM server.
