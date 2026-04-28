/**
 * POST /api/rag/ingest
 *
 * Accepts a multipart/form-data upload with:
 *   - file: the document file (txt, md, csv, pdf)
 *   - userId: the authenticated user's ID
 *   - llmBaseUrl: the LM Studio base URL for embeddings
 *
 * Pipeline:
 *   1. Validate file type and size
 *   2. Extract text (PDF via pdf-parse, others as UTF-8)
 *   3. Chunk text into ~512-token segments with overlap
 *   4. Embed each chunk via LM Studio /v1/embeddings
 *   5. Persist document metadata + chunks to Firestore Admin SDK
 *
 * Returns: { documentId, chunkCount }
 */

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { v4 as uuidv4 } from "uuid";
import { chunkText, MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS } from "@/app/lib/ragUtils";
import { logger } from "@/app/lib/logger";
import type { RagDocument, RagChunk } from "@/app/lib/types";
import { getAdminDb, isAdminConfigured } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL ?? "http://127.0.0.1:1234";
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ?? "text-embedding-nomic-embed-text-v1.5";

// ─── Embedding helper ─────────────────────────────────────────────────────────

async function embedTexts(
  texts: string[],
  baseUrl: string
): Promise<number[][]> {
  const endpoint = `${baseUrl.replace(/\/$/, "")}/v1/embeddings`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }

  const json = await res.json() as { data: Array<{ embedding: number[] }> };
  return json.data.map((d) => d.embedding);
}

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractText(file: File): Promise<string> {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();

  if (ext === ".pdf") {
    // Dynamically import pdf-parse only when needed (server-side only)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text as string;
  }

  // txt / md / csv — read as UTF-8
  return await file.text();
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const start = Date.now();

  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Firebase Admin SDK not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to .env.local — see DEPLOYMENT.md for setup instructions." },
      { status: 503 }
    );
  }

  // Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const llmBaseUrl = (formData.get("llmBaseUrl") as string | null)?.trim() || DEFAULT_BASE_URL;

    // Validate file
    if (!(file instanceof File)) {
      return Response.json({ error: "file field is required" }, { status: 400 });
    }

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      return Response.json(
        { error: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return Response.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    const documentId = uuidv4();
    const now = Date.now();

    logger.info("rag.ingest.start", { documentId, fileName: file.name, sizeBytes: file.size });

    // Create document record (status: processing)
    const ragDoc: RagDocument = {
      id: documentId,
      userId,
      name: file.name,
      mimeType: file.type || "text/plain",
      sizeBytes: file.size,
      chunkCount: 0,
      status: "processing",
      createdAt: now,
      updatedAt: now,
    };

    const adminDb = getAdminDb();
    const docRef = adminDb.doc(`users/${userId}/documents/${documentId}`);
    await docRef.set(ragDoc);

    // Extract text
    let text: string;
    try {
      text = await extractText(file);
    } catch (err) {
      await docRef.update({ status: "error", errorMessage: "Failed to extract text", updatedAt: Date.now() });
      logger.error("rag.ingest.extract.failed", { documentId, error: err instanceof Error ? err.message : String(err) });
      return Response.json({ error: "Failed to extract text from file" }, { status: 422 });
    }

    if (text.trim().length === 0) {
      await docRef.update({ status: "error", errorMessage: "No text content found", updatedAt: Date.now() });
      return Response.json({ error: "No text content found in file" }, { status: 422 });
    }

    // Chunk
    const textChunks = chunkText(text);
    logger.info("rag.ingest.chunked", { documentId, chunkCount: textChunks.length });

    // Embed in batches of 20 (LM Studio handles small batches well)
    const EMBED_BATCH = 20;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < textChunks.length; i += EMBED_BATCH) {
      const batch = textChunks.slice(i, i + EMBED_BATCH);
      try {
        const embeddings = await embedTexts(batch, llmBaseUrl);
        allEmbeddings.push(...embeddings);
      } catch (err) {
        await docRef.update({ status: "error", errorMessage: "Embedding failed", updatedAt: Date.now() });
        logger.error("rag.ingest.embed.failed", { documentId, batchStart: i, error: err instanceof Error ? err.message : String(err) });
        return Response.json({ error: "Failed to generate embeddings. Is the embedding model loaded in LM Studio?" }, { status: 503 });
      }
    }

    // Build chunk documents
    const chunks: RagChunk[] = textChunks.map((text, i) => ({
      id: uuidv4(),
      documentId,
      userId,
      text,
      embedding: allEmbeddings[i],
      chunkIndex: i,
      createdAt: now,
    }));

    // Persist chunks in Firestore batches (max 500 per batch)
    const BATCH_SIZE = 500;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      chunks.slice(i, i + BATCH_SIZE).forEach((chunk) => {
        batch.set(adminDb.doc(`users/${userId}/documents/${documentId}/chunks/${chunk.id}`), chunk);
      });
      await batch.commit();
    }

    // Mark document as ready
    await docRef.update({
      status: "ready",
      chunkCount: chunks.length,
      updatedAt: Date.now(),
    });

    logger.info("rag.ingest.done", {
      documentId,
      chunkCount: chunks.length,
      durationMs: Date.now() - start,
    });

    return Response.json({ documentId, chunkCount: chunks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("rag.ingest.unhandled", { error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
