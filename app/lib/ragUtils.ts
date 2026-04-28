/**
 * RAG utility functions — chunking, embedding, and similarity search.
 * All pure functions, no side effects.
 */

import { RAG_CHUNK_TOKENS, RAG_CHUNK_OVERLAP_TOKENS } from "@/app/lib/types";

// ─── Text extraction ──────────────────────────────────────────────────────────

/**
 * Extract plain text from a File object.
 * Supports: .txt, .md, .csv — returns raw text.
 * PDF extraction is handled server-side in the ingest route.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

// ─── Chunking ─────────────────────────────────────────────────────────────────

/**
 * Estimate token count (~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Split text into overlapping chunks of approximately RAG_CHUNK_TOKENS tokens.
 * Splits on sentence/paragraph boundaries where possible.
 */
export function chunkText(text: string): string[] {
  const chunkSize = RAG_CHUNK_TOKENS * 4;       // chars
  const overlapSize = RAG_CHUNK_OVERLAP_TOKENS * 4; // chars

  // Normalise whitespace
  const normalised = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (normalised.length === 0) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalised.length) {
    let end = start + chunkSize;

    if (end < normalised.length) {
      // Try to break at a paragraph boundary first
      const paraBreak = normalised.lastIndexOf("\n\n", end);
      if (paraBreak > start + chunkSize / 2) {
        end = paraBreak;
      } else {
        // Fall back to sentence boundary
        const sentBreak = normalised.lastIndexOf(". ", end);
        if (sentBreak > start + chunkSize / 2) {
          end = sentBreak + 1; // include the period
        }
      }
    }

    const chunk = normalised.slice(start, end).trim();
    if (chunk.length > 0) chunks.push(chunk);

    // Advance with overlap
    start = end - overlapSize;
    if (start <= 0 || start >= normalised.length) break;
  }

  return chunks;
}

// ─── Cosine similarity ────────────────────────────────────────────────────────

/**
 * Compute cosine similarity between two equal-length vectors.
 * Returns a value in [0, 1] (embeddings are typically normalised).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Context formatting ───────────────────────────────────────────────────────

/**
 * Format retrieved RAG chunks into a context block to prepend to the system prompt.
 */
export function formatRagContext(
  results: Array<{ text: string; documentName: string; score: number }>
): string {
  if (results.length === 0) return "";

  const sections = results
    .map(
      (r, i) =>
        `[Source ${i + 1}: ${r.documentName} (relevance: ${(r.score * 100).toFixed(0)}%)]\n${r.text}`
    )
    .join("\n\n---\n\n");

  return (
    `You have access to the following relevant excerpts from uploaded documents. ` +
    `Use them to answer the user's question accurately. ` +
    `If the answer is not in the excerpts, say so.\n\n` +
    `<context>\n${sections}\n</context>`
  );
}

// ─── Supported file types ─────────────────────────────────────────────────────

export const SUPPORTED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
] as const;

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".csv", ".pdf"];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isFileSupported(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return (
    SUPPORTED_EXTENSIONS.includes(ext) ||
    (SUPPORTED_MIME_TYPES as readonly string[]).includes(file.type)
  );
}
