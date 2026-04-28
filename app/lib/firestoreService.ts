"use client";

/**
 * Firestore service layer for local-ai-chat.
 *
 * Mirrors the Zustand chatStore data model in Firestore under:
 *   /users/{userId}/conversations/{conversationId}
 *   /users/{userId}/conversations/{conversationId}/messages/{messageId}
 *
 * All writes are scoped to the authenticated user's uid (Google sub).
 * This module is client-only — it imports the Firebase client SDK.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { Conversation, Message } from "@/app/lib/types";
import { logger } from "@/app/lib/logger";

// ─── Firestore document shapes ───────────────────────────────────────────────

interface ConversationDoc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  temperature: number;
  maxTokens: number;
  userId: string;
}

interface MessageDoc {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: number;
  conversationId: string;
  userId: string;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

function conversationsCol(db: Firestore, userId: string) {
  return collection(db, "users", userId, "conversations");
}

function conversationDoc(db: Firestore, userId: string, conversationId: string) {
  return doc(db, "users", userId, "conversations", conversationId);
}

function messagesCol(db: Firestore, userId: string, conversationId: string) {
  return collection(db, "users", userId, "conversations", conversationId, "messages");
}

function messageDoc(db: Firestore, userId: string, conversationId: string, messageId: string) {
  return doc(db, "users", userId, "conversations", conversationId, "messages", messageId);
}

// ─── Conversations ────────────────────────────────────────────────────────────

/**
 * Persist a full conversation (metadata only — messages are stored separately).
 */
export async function saveConversation(
  db: Firestore,
  userId: string,
  conversation: Conversation
): Promise<void> {
  const ref = conversationDoc(db, userId, conversation.id);
  const data: ConversationDoc = {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    model: conversation.model,
    temperature: conversation.temperature,
    maxTokens: conversation.maxTokens,
    userId,
  };
  try {
    await setDoc(ref, data, { merge: true });
    logger.info("firestore.conversation.save", { conversationId: conversation.id });
  } catch (err) {
    logger.error("firestore.conversation.save.failed", {
      conversationId: conversation.id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Load all conversations for a user (metadata only, no messages).
 */
export async function loadConversations(
  db: Firestore,
  userId: string
): Promise<ConversationDoc[]> {
  try {
    const q = query(conversationsCol(db, userId), orderBy("updatedAt", "desc"));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as ConversationDoc);
    logger.info("firestore.conversations.load", { userId, count: results.length });
    return results;
  } catch (err) {
    logger.error("firestore.conversations.load.failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Delete a conversation and all its messages in a single batch.
 */
export async function deleteConversation(
  db: Firestore,
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);

    // Delete all messages first
    const msgSnap = await getDocs(messagesCol(db, userId, conversationId));
    msgSnap.docs.forEach((d) => batch.delete(d.ref));

    // Delete the conversation document
    batch.delete(conversationDoc(db, userId, conversationId));

    await batch.commit();
    logger.info("firestore.conversation.delete", { conversationId, messageCount: msgSnap.size });
  } catch (err) {
    logger.error("firestore.conversation.delete.failed", {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Update mutable conversation fields (title, settings, updatedAt).
 */
export async function updateConversationMeta(
  db: Firestore,
  userId: string,
  conversationId: string,
  patch: Partial<Pick<ConversationDoc, "title" | "model" | "temperature" | "maxTokens" | "updatedAt">>
): Promise<void> {
  try {
    await updateDoc(conversationDoc(db, userId, conversationId), patch);
    logger.info("firestore.conversation.update", { conversationId, fields: Object.keys(patch) });
  } catch (err) {
    logger.error("firestore.conversation.update.failed", {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Messages ─────────────────────────────────────────────────────────────────

/**
 * Append a single message to a conversation's messages sub-collection.
 */
export async function saveMessage(
  db: Firestore,
  userId: string,
  conversationId: string,
  message: Message
): Promise<void> {
  const ref = messageDoc(db, userId, conversationId, message.id);
  const data: MessageDoc = {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt,
    conversationId,
    userId,
  };
  try {
    await setDoc(ref, data);
    logger.info("firestore.message.save", {
      conversationId,
      messageId: message.id,
      role: message.role,
    });
  } catch (err) {
    logger.error("firestore.message.save.failed", {
      conversationId,
      messageId: message.id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Load all messages for a conversation, ordered by createdAt ascending.
 */
export async function loadMessages(
  db: Firestore,
  userId: string,
  conversationId: string
): Promise<MessageDoc[]> {
  try {
    const q = query(messagesCol(db, userId, conversationId), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as MessageDoc);
    logger.info("firestore.messages.load", { conversationId, count: results.length });
    return results;
  } catch (err) {
    logger.error("firestore.messages.load.failed", {
      conversationId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Update the content of an existing message (used after streaming completes).
 */
export async function updateMessageContent(
  db: Firestore,
  userId: string,
  conversationId: string,
  messageId: string,
  content: string
): Promise<void> {
  try {
    await updateDoc(messageDoc(db, userId, conversationId, messageId), { content });
    logger.info("firestore.message.update", { conversationId, messageId });
  } catch (err) {
    logger.error("firestore.message.update.failed", {
      conversationId,
      messageId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Delete a single message.
 */
export async function deleteMessage(
  db: Firestore,
  userId: string,
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    await deleteDoc(messageDoc(db, userId, conversationId, messageId));
    logger.info("firestore.message.delete", { conversationId, messageId });
  } catch (err) {
    logger.error("firestore.message.delete.failed", {
      conversationId,
      messageId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── User preferences ─────────────────────────────────────────────────────────

interface UserPrefsDoc {
  llmBaseUrl: string;
  setupComplete: boolean;
  updatedAt: ReturnType<typeof serverTimestamp>;
}

/**
 * Persist user preferences to Firestore (mirrors userStore).
 */
export async function saveUserPrefs(
  db: Firestore,
  userId: string,
  prefs: { llmBaseUrl: string; setupComplete: boolean }
): Promise<void> {
  try {
    const ref = doc(db, "users", userId);
    const data: UserPrefsDoc = {
      ...prefs,
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, data, { merge: true });
    logger.info("firestore.userPrefs.save", { userId });
  } catch (err) {
    logger.error("firestore.userPrefs.save.failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/**
 * Load user preferences from Firestore.
 * Returns null if no document exists yet (first-time user).
 */
export async function loadUserPrefs(
  db: Firestore,
  userId: string
): Promise<{ llmBaseUrl: string; setupComplete: boolean } | null> {
  try {
    const snap = await getDoc(doc(db, "users", userId));
    if (!snap.exists()) {
      logger.info("firestore.userPrefs.notFound", { userId });
      return null;
    }
    const data = snap.data();
    logger.info("firestore.userPrefs.load", { userId });
    return {
      llmBaseUrl: typeof data.llmBaseUrl === "string" ? data.llmBaseUrl : "http://127.0.0.1:1234",
      setupComplete: typeof data.setupComplete === "boolean" ? data.setupComplete : false,
    };
  } catch (err) {
    logger.error("firestore.userPrefs.load.failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
