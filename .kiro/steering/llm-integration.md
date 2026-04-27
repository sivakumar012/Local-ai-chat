---
inclusion: fileMatch
fileMatchPattern: "app/api/**,app/lib/**,app/store/**"
---

# LLM Integration Guide

## Endpoint

LM Studio exposes two separate APIs — use the correct one:

| API | Path | Format | Use |
|-----|------|--------|-----|
| OpenAI-compatible | `POST /v1/chat/completions` | `{ model, messages[], temperature, max_tokens, stream }` | ✅ This project |
| LM Studio stateful | `POST /api/v1/chat` | `{ model, input, system_prompt, max_output_tokens }` | ❌ Different schema |

**Always use `/v1/chat/completions`** — configured via `LLM_API_PATH=/v1/chat/completions` in `.env.local`.

## Request format

```ts
{
  model: string,           // e.g. "gemma-4-e4b" — must match model loaded in LM Studio
  messages: [
    { role: "system",    content: "You are a helpful assistant." },
    { role: "user",      content: "Hello" },
    { role: "assistant", content: "Hi there!" },
    { role: "user",      content: "What is 2+2?" }
  ],
  temperature: number,     // 0.0–2.0, default 0.7
  max_tokens: number,      // default 1000, max depends on model context window
  stream: true             // always true — we use SSE streaming
}
```

## SSE response format (from LM Studio)

```
data: {"id":"...","choices":[{"delta":{"content":"Hello"},"index":0}]}
data: {"id":"...","choices":[{"delta":{"content":" there"},"index":0}]}
data: [DONE]
```

Extract token: `parsed.choices[0].delta.content`

## Re-emitted format (from /api/chat to browser)

```
data: {"content":"Hello"}
data: {"content":" there"}
data: [DONE]
```

## Error handling in /api/chat

| Error | HTTP status | Message |
|-------|-------------|---------|
| Missing messages | 400 | `"messages array is required"` |
| ECONNREFUSED / fetch failed | 503 | `"Cannot connect to LLM server at <url>..."` |
| LM Studio non-2xx | 503 | `"LLM server error <status>: <body>"` |
| Stream error (mid-response) | inline SSE | `data: {"error":"<message>"}` |
| Unexpected exception | 500 | `"Internal server error"` |

## Token management

File: `app/lib/tokenUtils.ts`

```ts
estimateTokens(text)           // Math.ceil(text.length / 4)
estimateMessagesTokens(msgs)   // sum of tokens + 4 overhead per message
trimMessagesToLimit(msgs, max) // drops oldest non-system messages until < max
```

- `MAX_CONTEXT_TOKENS = 8000` (set in `app/lib/types.ts`)
- Trimming is applied server-side in `/api/chat` before forwarding
- System message is always preserved
- At least one non-system message is always preserved

## Adding a new LLM feature

1. If it requires a new API call to LM Studio, add it in `/api/chat/route.ts` or a new route under `app/api/`
2. Pass any user-configurable parameters through the request body from the client
3. Read `llmBaseUrl` from the request body (client sends it from `userStore`)
4. Always handle ECONNREFUSED and non-2xx responses explicitly
5. For streaming features, use `TransformStream` to pipe and transform the SSE
6. Update `tokenUtils.ts` if the new feature affects context management

## Model name

The default model is `gemma-4-e4b` (set in `DEFAULT_SETTINGS` in `app/lib/types.ts`).  
The model name must exactly match the identifier shown in LM Studio's loaded model list.  
Users can change it per-conversation via the ModelSettings modal (⚙ in chat header).
