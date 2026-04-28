/**
 * POST /api/rag/retrieve
 *
 * Embeds the user's query and returns the top-K most relevant chunks
 * from the user's uploaded documents.
 *
 * Request body:
 *   { query: string, llmBaseUrl?: string, topK?: number }
 *
 * Response:
 *   { results: Array<{ text, documentName, score }> }
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/app/lib/logger";
import { RAG_TOP_K } from "@/app/lib/types";

// Firebase Admin SDK
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { RagDocument, RagChunk, RagResult } from "@/app/lib/types";
import { cosineSimilarity } from "@/app/lib/ragUtils";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL ?? "http://127.0.0.1:1234";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "text-embedding-nomic-embed-text-v1.5";

// ─── Firebase Admin singleton ─────────────────────────────────────────────────

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID ?? "prepforexams-aabbd",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? "",
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const body = await req.json() as {
      query: string;
      llmBaseUrl?: string;
      topK?: number;
    };

    const { query, llmBaseUrl, topK = RAG_TOP_K } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return Response.json({ error: "query is required" }, { status: 400 });
    }

    const baseUrl = (llmBaseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");

    // Embed the query
    let queryEmbedding: number[];
    try {
      const res = await fetch(`${baseUrl}/v1/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: EMBEDDING_MODEL, input: [query.trim()] }),
      });
      if (!res.ok) throw new Error(`Embedding API ${res.status}`);
      const json = await res.json() as { data: Array<{ embedding: number[] }> };
      queryEmbedding = json.data[0].embedding;
    } catch (err) {
      logger.error("rag.retrieve.embed.failed", { error: err instanceof Error ? err.message : String(err) });
      return Response.json(
        { error: "Failed to embed query. Is the embedding model loaded in LM Studio?" },
        { status: 503 }
      );
    }

    // Load all ready documents and their chunks
    const adminApp = getAdminApp();
    const db = getFirestore(adminApp);

    const docsSnap = await db
      .collection(`users/${userId}/documents`)
      .where("status", "==", "ready")
      .get();

    if (docsSnap.empty) {
      return Response.json({ results: [] });
    }

    const docMap = new Map<string, string>(); // docId → name
    docsSnap.docs.forEach((d) => {
      const data = d.data() as RagDocument;
      docMap.set(data.id, data.name);
    });

    // Load all chunks in parallel
    const chunkArrays = await Promise.all(
      docsSnap.docs.map(async (d) => {
        const snap = await db
          .collection(`users/${userId}/documents/${d.id}/chunks`)
          .orderBy("chunkIndex")
          .get();
        return snap.docs.map((c) => c.data() as RagChunk);
      })
    );

    const allChunks = chunkArrays.flat();

    // Score
    const scored: RagResult[] = allChunks.map((chunk) => ({
      chunk,
      documentName: docMap.get(chunk.documentId) ?? "Unknown",
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    const results = scored
      .slice(0, topK)
      .filter((r) => r.score > 0.3)
      .map((r) => ({
        text: r.chunk.text,
        documentName: r.documentName,
        score: r.score,
      }));

    logger.info("rag.retrieve", {
      userId,
      totalChunks: allChunks.length,
      returned: results.length,
    });

    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("rag.retrieve.unhandled", { error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
