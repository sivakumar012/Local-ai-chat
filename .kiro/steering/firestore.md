---
inclusion: fileMatch
fileMatchPattern: "app/lib/firebase.ts,app/lib/firestoreService.ts,firestore.rules,firestore.indexes.json"
---

# Firestore Integration

## Project & database

- **Firebase project:** `prepforexams-aabbd`
- **Database:** `(default)` — Firestore in Native mode, region `nam5`
- **SDK:** `firebase@12.x` (client-side only — no Admin SDK)
- **Config file:** `app/lib/firebase.ts` — singleton `app` + `db` exports

## Data model

All data is scoped under the authenticated user's Google `sub` (uid):

```
/users/{userId}                              ← UserPrefsDoc
/users/{userId}/conversations/{id}           ← ConversationDoc
/users/{userId}/conversations/{id}/messages/{id}  ← MessageDoc
```

### ConversationDoc

```ts
{
  id: string          // UUID — matches Zustand chatStore id
  title: string       // ≤ 200 chars
  createdAt: number   // Unix ms
  updatedAt: number   // Unix ms
  model: string       // ≤ 100 chars
  temperature: number
  maxTokens: number
  userId: string      // must equal request.auth.uid (enforced by rules)
}
```

### MessageDoc

```ts
{
  id: string              // UUID — matches Zustand Message id
  role: "system" | "user" | "assistant"
  content: string         // ≤ 32 768 chars (32 KB)
  createdAt: number       // Unix ms
  conversationId: string  // parent conversation id
  userId: string          // must equal request.auth.uid
}
```

### UserPrefsDoc

```ts
{
  llmBaseUrl: string      // e.g. "http://127.0.0.1:1234"
  setupComplete: boolean
  updatedAt: Timestamp    // server timestamp
}
```

## Service layer

All Firestore operations go through `app/lib/firestoreService.ts`. Never call
Firestore SDK methods directly from components or stores.

| Function | Purpose |
|----------|---------|
| `saveConversation` | Upsert conversation metadata |
| `loadConversations` | List all conversations for a user |
| `deleteConversation` | Batch-delete conversation + all messages |
| `updateConversationMeta` | Patch title / settings / updatedAt |
| `saveMessage` | Append a single message |
| `loadMessages` | Load all messages ordered by createdAt |
| `updateMessageContent` | Update content after streaming completes |
| `deleteMessage` | Remove a single message |
| `saveUserPrefs` | Persist llmBaseUrl + setupComplete |
| `loadUserPrefs` | Load user prefs (returns null for new users) |

## Security rules

Rules file: `firestore.rules` — deployed with `firebase deploy --only firestore:rules`

Key invariants enforced by rules:
- Every read/write requires `request.auth != null`
- Users can only access their own documents (`request.auth.uid == userId`)
- `userId` field in written documents must equal the caller's uid
- Message content capped at 32 768 chars
- Messages are **immutable** once written (no update allowed via rules)
- All other paths are denied by a catch-all `allow read, write: if false`

## Indexes

Composite indexes are defined in `firestore.indexes.json`.

Current indexes:
- `conversations` ordered by `updatedAt DESC` (auto-created by SDK query)
- `messages` ordered by `createdAt ASC` (auto-created by SDK query)

Add explicit composite indexes here if queries span multiple fields.

## Deploying rules and indexes

```bash
# Deploy rules only
firebase deploy --only firestore:rules

# Deploy indexes only
firebase deploy --only firestore:indexes

# Deploy both
firebase deploy --only firestore
```

## Do not

- Do not call Firestore SDK methods outside `firestoreService.ts`
- Do not store raw stack traces or secrets in Firestore documents
- Do not use `allow read, write: if true` — the catch-all deny rule prevents this
- Do not use the Admin SDK on the client — it bypasses security rules
- Do not hardcode `userId` — always derive it from `session.user.id`
