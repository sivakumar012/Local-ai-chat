"use client";

/**
 * Firestore service layer for RAG documents and chunks.
 *
 * Data layout:
 *   /users/{userId}/documents/{docId}           ← RagDocument metadata
 *   /users/{userId}/documents/{docId}/chunks/{chunkId}  ← RagChunk with embedding
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
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import type { RagDocument, RagChunk, RagResult } from "@/app/lib/types";
import { cosineSimilarity } from "@/app/lib/ragUtils";
import { logger } from "@/app/lib/logger";

// ─── Path helpers ─────────────────────────────────────────────────────────────

function documentsCol(db: Firestore, userId: string) {
  return collection(db, "users", userId, "documents");
}

function documentRef(db: Firestore, userId: string, docId: string) {
  return doc(db, "users", userId, "documents", docId);
}

function chunksCol(db: Firestore, userId: string, docId: string) {
  return collection(db, "users", userId, "documents", docId, "chunks");
}

function chunkRef(db: Firestore, userId: string, docId: string, chunkId: string) {
  return doc(db, "users", userId, "documents", docId, "chunks", chunkId);
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function saveRagDocument(
  db: Firestore,
  document: RagDocument
): Promise<void> {
  try {
    await setDoc(documentRef(db, document.userId, document.id), document);
    logger.info("rag.document.save", { documentId: document.id, name: document.name });
  } catch (err) {
    logger.error("rag.document.save.failed", {
      documentId: document.id,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function updateRagDocument(
  db: Firestore,
  userId: string,
  docId: string,
  patch: Partial<Pick<RagDocument, "status" | "chunkCount" | "errorMessage" | "updatedAt">>
): Promise<void> {
  try {
    await updateDoc(documentRef(db, userId, docId), patch);
    logger.info("rag.document.update", { documentId: docId, fields: Object.keys(patch) });
  } catch (err) {
    logger.error("rag.document.update.failed", {
      documentId: docId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function loadRagDocuments(
  db: Firestore,
  userId: string
): Promise<RagDocument[]> {
  try {
    const q = query(documentsCol(db, userId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => d.data() as RagDocument);
    logger.info("rag.documents.load", { userId, count: results.length });
    return results;
  } catch (err) {
    logger.error("rag.documents.load.failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function deleteRagDocument(
  db: Firestore,
  userId: string,
  docId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const chunkSnap = await getDocs(chunksCol(db, userId, docId));
    chunkSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(documentRef(db, userId, docId));
    await batch.commit();
    logger.info("rag.document.delete", { documentId: docId, chunkCount: chunkSnap.size });
  } catch (err) {
    logger.error("rag.document.delete.failed", {
      documentId: docId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Chunks ───────────────────────────────────────────────────────────────────

/**
 * Save all chunks for a document in batches of 500 (Firestore batch limit).
 */
export async function saveRagChunks(
  db: Firestore,
  chunks: RagChunk[]
): Promise<void> {
  if (chunks.length === 0) return;
  const { userId, documentId } = chunks[0];

  try {
    const BATCH_SIZE = 500;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      chunks.slice(i, i + BATCH_SIZE).forEach((chunk) => {
        batch.set(chunkRef(db, userId, documentId, chunk.id), chunk);
      });
      await batch.commit();
    }
    logger.info("rag.chunks.save", { documentId, count: chunks.length });
  } catch (err) {
    logger.error("rag.chunks.save.failed", {
      documentId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export async function loadRagChunks(
  db: Firestore,
  userId: string,
  docId: string
): Promise<RagChunk[]> {
  try {
    const q = query(chunksCol(db, userId, docId), orderBy("chunkIndex", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RagChunk);
  } catch (err) {
    logger.error("rag.chunks.load.failed", {
      documentId: docId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

// ─── Similarity search ────────────────────────────────────────────────────────

/**
 * Retrieve the top-K most relevant chunks across all of a user's documents.
 * Loads all chunks from Firestore and scores them in-process.
 * Suitable for small-to-medium document sets (< ~5000 chunks).
 */
export async function retrieveRelevantChunks(
  db: Firestore,
  userId: string,
  queryEmbedding: number[],
  topK: number
): Promise<RagResult[]> {
  try {
    // Load all ready documents
    const docs = await loadRagDocuments(db, userId);
    const readyDocs = docs.filter((d) => d.status === "ready");

    if (readyDocs.length === 0) return [];

    // Load all chunks across all documents
    const allChunks: Array<{ chunk: RagChunk; documentName: string }> = [];
    await Promise.all(
      readyDocs.map(async (ragDoc) => {
        const chunks = await loadRagChunks(db, userId, ragDoc.id);
        chunks.forEach((chunk) =>
          allChunks.push({ chunk, documentName: ragDoc.name })
        );
      })
    );

    // Score and sort
    const scored: RagResult[] = allChunks.map(({ chunk, documentName }) => ({
      chunk,
      documentName,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, topK).filter((r) => r.score > 0.3);
    logger.info("rag.retrieve", {
      userId,
      totalChunks: allChunks.length,
      returned: results.length,
      topScore: results[0]?.score.toFixed(3),
    });

    return results;
  } catch (err) {
    logger.error("rag.retrieve.failed", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
