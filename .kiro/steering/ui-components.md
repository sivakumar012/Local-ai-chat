---
inclusion: fileMatch
fileMatchPattern: "app/components/**"
---

# UI Components Guide

## Component map

```
AppShell          — root, owns streaming state + send/stop logic
├── Sidebar       — conversation list, URL editor, user profile
└── ChatWindow    — main panel
    ├── MessageBubble (×n)
    └── ChatInput
        └── (send button | stop button)

ServerSetup       — shown instead of AppShell when setupComplete = false
ModelSettings     — modal, opened from ChatWindow header
SessionProviderWrapper — wraps entire app, passes server session to client
```

## AppShell

**File:** `app/components/AppShell.tsx`  
**Type:** Client component  
**Owns:** `isStreaming`, `streamingMsgId`, `error`, `sidebarOpen`  
**Reads:** `useSession()` (NextAuth), `useUserStore()` (llmBaseUrl, setupComplete)

Key behaviours:
- Hydration guard via `useSyncExternalStore` — renders spinner until client-side mount
- If `!setupComplete` → renders `<ServerSetup />` instead of the chat UI
- `handleSend` auto-creates a conversation if none is active
- Reads latest store state with `useChatStore.getState()` inside async callbacks (avoids stale closure)
- Passes `llmBaseUrl` in every `/api/chat` request body
- `AbortController` ref enables stop-generation; `AbortError` is caught silently

## Sidebar

**File:** `app/components/Sidebar.tsx`  
**Props:** `userImage?`, `userName?`, `userEmail?`

Sections:
1. Header — app title + new chat button
2. Conversation list — scrollable, active item highlighted `bg-gray-700`
3. Footer:
   - LM Studio URL display + inline editor (Edit → input → Enter/Escape/✓/✕)
   - Clear all chats button (only shown when conversations exist)
   - User profile row — avatar (next/image or initial fallback), name, email, sign-out

Inline rename: local `editingId` + `editTitle` state; commits on Enter or ✓, cancels on Escape or ✕.

## ChatWindow

**File:** `app/components/ChatWindow.tsx`  
**Props:** `streamingId`, `isStreaming`, `onSend`, `onStop`

- Filters messages to non-system roles before rendering
- Auto-scroll: `useEffect` on `messages.length` and `lastMessageContent` (extracted variable)
- Export: serialises `Conversation` to JSON → `URL.createObjectURL` → anchor click
- Clear: `useChatStore.setState` directly — filters to system message only, resets title
- Empty state: shown when no non-system messages exist

## MessageBubble

**File:** `app/components/MessageBubble.tsx`  
**Props:** `message`, `onDelete?`, `isStreaming?`

- System messages return `null`
- User: right-aligned, `bg-indigo-600`, `rounded-br-sm`, plain `whitespace-pre-wrap` text
- Assistant: left-aligned, `bg-gray-800`, `rounded-bl-sm`, full `ReactMarkdown` with GFM
- Code blocks: detected by `language-*` className → `react-syntax-highlighter` Prism One Dark
- Inline code: `bg-gray-700 px-1 py-0.5 rounded text-xs font-mono`
- Streaming cursor: `animate-pulse` indigo block, shown when `isStreaming && msg.id === streamingId`
- Copy: `navigator.clipboard.writeText`, icon swaps to `ClipboardDocumentCheckIcon` for 2s
- Actions (copy + delete) are `opacity-0 group-hover:opacity-100`

## ChatInput

**File:** `app/components/ChatInput.tsx`  
**Props:** `onSend`, `disabled?`, `isStreaming?`, `onStop?`

- Auto-resize: `onInput` sets `el.style.height` from `scrollHeight`, capped at 200px
- Enter → submit, Shift+Enter → newline (default textarea behaviour)
- Send button: `bg-indigo-600`, disabled when empty or `disabled` prop
- Stop button: `bg-red-600`, shown instead of send when `isStreaming`
- After send: clears value and resets textarea height to `auto`

## ServerSetup

**File:** `app/components/ServerSetup.tsx`  
**Shown when:** `useUserStore().setupComplete === false`

- URL input pre-filled from `userStore.llmBaseUrl` (default `http://127.0.0.1:1234`)
- Test Connection → `POST /api/probe-server` → green/red feedback banner
- Save & Continue → `completeSetup(url)` → `setupComplete = true` → AppShell renders chat UI
- Instructions panel explains how to start LM Studio server

## ModelSettings

**File:** `app/components/ModelSettings.tsx`  
**Props:** `conversation: Conversation`

Modal with backdrop blur (`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm`):
- Model name: free text input
- Temperature: range slider 0–2, step 0.1, live value display
- Max tokens: number input 64–32000, step 64
- All changes written immediately to `chatStore.updateSettings` (no save button needed)

## Adding a new component

1. Create `app/components/MyComponent.tsx`
2. Add `"use client"` if it uses hooks, event handlers, or browser APIs
3. Define props interface above the component
4. Use Tailwind classes only — no inline styles
5. Use `@heroicons/react/24/outline` for icons (solid for primary actions)
6. Export as default
