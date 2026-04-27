---
inclusion: always
---

# Coding Standards

## General rules

- All files are TypeScript — no `.js` files in `app/`
- All React components are in `app/components/` and use the `.tsx` extension
- Client components must have `"use client"` as the first line
- Server components and API routes do not need `"use server"` unless using server actions
- `npm run lint` must pass with **0 errors and 0 warnings** before any commit
- `npm run build` must succeed before any commit

## Naming conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| Components | PascalCase | `ChatWindow.tsx` |
| Hooks / stores | camelCase | `chatStore.ts`, `userStore.ts` |
| Utility files | camelCase | `tokenUtils.ts` |
| API routes | `route.ts` inside named folder | `app/api/chat/route.ts` |
| Types/interfaces | PascalCase | `Conversation`, `Message`, `ChatSettings` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_CONTEXT_TOKENS`, `DEFAULT_SETTINGS` |

## Component patterns

- Prefer small, focused components — one responsibility per file
- Props interfaces defined inline above the component (not exported unless reused)
- Use `useCallback` for functions passed as props to avoid unnecessary re-renders
- Extract complex `useEffect` dependencies to named variables before the effect
- **Never** call `setState` directly inside a `useEffect` body — use `useSyncExternalStore` or restructure
- Hydration guard pattern: use `useSyncExternalStore` with a server snapshot of `false` and client snapshot of `true`

## State management

- All global state goes through Zustand stores in `app/store/`
- Do not use React Context for global state — use Zustand
- Zustand actions must be pure and synchronous where possible
- Async operations (fetch, streaming) live in components (`AppShell.tsx`), not in the store
- Read latest store state inside async callbacks with `useChatStore.getState()` — do not close over stale state

## API routes

- All routes use the Node.js runtime (`export const runtime = "nodejs"`)
- Use `Response.json()` for JSON responses
- Use `new Response(readable, { headers })` for streaming responses
- Validate all request body fields before use — return 400 for missing required fields
- Catch connection errors separately and return 503 with a user-friendly message
- Never expose raw stack traces in error responses

## Streaming (SSE)

- LM Studio returns OpenAI-format SSE: `data: {"choices":[{"delta":{"content":"..."}}]}`
- The API route re-emits a simplified format: `data: {"content":"<token>"}`
- The `[DONE]` sentinel is forwarded verbatim
- Malformed SSE lines are silently skipped (try/catch around JSON.parse)
- The client uses `AbortController` — on `AbortError`, keep the partial response silently

## Styling

- Tailwind CSS v4 only — no inline styles, no CSS modules
- Dark theme is the only theme (class `dark` on `<html>`)
- Use `gray-950` for page backgrounds, `gray-900` for panels, `gray-800` for inputs
- Use `indigo-600` as the primary action colour
- Responsive breakpoint: `md:` for sidebar behaviour (fixed on mobile, relative on desktop)
- Scrollbar styling is in `globals.css` — do not override per-component

## Imports

- Use the `@/` path alias for all imports from within the project (configured in `tsconfig.json`)
- Group imports: external packages first, then internal `@/` imports
- Do not import from `node_modules` paths directly

## Do not

- Do not add new dependencies without checking if existing ones cover the need
- Do not use `any` type — use `unknown` and narrow with type guards
- Do not use `confirm()` for new dialogs — use a modal component (existing ones use it, but new code should not)
- Do not hardcode the LM Studio URL — always read from `userStore.llmBaseUrl` on the client or `process.env.LLM_BASE_URL` on the server
- Do not commit `.env.local` — it is in `.gitignore`
- Do not use `middleware.ts` — this project uses `proxy.ts` (Next.js 16 convention)
