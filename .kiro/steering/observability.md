---
inclusion: fileMatch
fileMatchPattern: "app/lib/logger.ts,app/api/**,app/lib/firestoreService.ts"
---

# Observability

## Logger

All structured logging goes through `app/lib/logger.ts`. Never use `console.log`
directly in application code — use the logger instead.

```ts
import { logger } from "@/app/lib/logger";

logger.debug("event.name", { key: "value" });
logger.info("event.name",  { key: "value" });
logger.warn("event.name",  { key: "value" });
logger.error("event.name", { error: err.message, key: "value" });
```

### Output format

| Environment | Format | Destination |
|-------------|--------|-------------|
| `development` | Colour-coded human-readable | `console.log` |
| `production` | JSON lines (one object per line) | `stdout` |

### JSON line shape (production)

```json
{
  "level": "info",
  "event": "firestore.conversation.save",
  "timestamp": "2026-04-28T10:23:45.123Z",
  "conversationId": "abc-123"
}
```

JSON lines on stdout are compatible with CloudWatch Logs, Datadog, GCP Logging,
and any log aggregator that reads container stdout.

## Event naming convention

Use dot-separated namespaces: `<layer>.<entity>.<action>[.failed]`

| Layer | Examples |
|-------|---------|
| `firestore` | `firestore.conversation.save`, `firestore.message.load.failed` |
| `api` | `api.chat.request`, `api.chat.stream.done`, `api.chat.error` |
| `auth` | `auth.session.missing`, `auth.redirect` |
| `llm` | `llm.request`, `llm.stream.token`, `llm.abort` |

Always include `.failed` suffix on error events so they are easy to filter.

## What to log

### API routes (`app/api/**`)

```ts
// On every request
logger.info("api.chat.request", { model, messageCount, userId });

// On successful stream completion
logger.info("api.chat.stream.done", { durationMs, tokenCount });

// On connection error to LM Studio
logger.error("api.chat.llm.unreachable", { error: err.message, llmBaseUrl });

// On bad request
logger.warn("api.chat.badRequest", { reason: "missing messages field" });
```

### Firestore service (`app/lib/firestoreService.ts`)

Already instrumented — every function logs `info` on success and `error` on failure.
Do not add duplicate logging in callers.

### Components / stores

Keep component-level logging minimal. Log user-initiated actions at `debug` level only:

```ts
logger.debug("ui.conversation.create", { conversationId });
logger.debug("ui.message.send", { conversationId, role: "user" });
```

## What NOT to log

- Passwords, tokens, API keys, or `AUTH_SECRET`
- Full message content (can contain PII) — log `messageId` and `role` only
- Full LM Studio URLs if they contain credentials
- Raw stack traces — log `err.message` only; stack traces go to `err.stack` at `debug` level

## Error handling pattern

```ts
try {
  await someOperation();
  logger.info("operation.success", { id });
} catch (err) {
  logger.error("operation.failed", {
    error: err instanceof Error ? err.message : String(err),
    id,
  });
  throw err; // re-throw so the caller can handle it
}
```

## Future observability integrations

The JSON-line format on stdout is ready for:
- **AWS CloudWatch** — use the `aws-observability` power to query logs
- **Datadog** — configure the Datadog agent to tail stdout
- **GCP Cloud Logging** — structured JSON is auto-parsed
- **Firebase Crashlytics** — add `@firebase/crashlytics` for client-side crash reporting

To add CloudWatch alarms or dashboards, activate the `aws-observability` power.
