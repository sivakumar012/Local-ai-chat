export type Role = "system" | "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_SETTINGS: ChatSettings = {
  model: "google/gemma-4-e4b",
  temperature: 0.7,
  maxTokens: 1000,
};

export const SYSTEM_PROMPT =
  "You are a helpful, harmless, and honest AI assistant.";

export const MAX_CONTEXT_TOKENS = 8000;

// ─── RAG types ────────────────────────────────────────────────────────────────

export type RagDocumentStatus = "pending" | "processing" | "ready" | "error";

export interface RagDocument {
  id: string;               // UUID
  userId: string;
  name: string;             // original filename
  mimeType: string;
  sizeBytes: number;
  chunkCount: number;
  status: RagDocumentStatus;
  errorMessage?: string;
  createdAt: number;        // Unix ms
  updatedAt: number;
}

export interface RagChunk {
  id: string;               // UUID
  documentId: string;
  userId: string;
  text: string;             // raw chunk text (≤ 512 tokens)
  embedding: number[];      // dense vector from LM Studio
  chunkIndex: number;       // position within document
  createdAt: number;
}

/** A retrieved chunk with its similarity score */
export interface RagResult {
  chunk: RagChunk;
  score: number;            // cosine similarity 0–1
  documentName: string;
}

export const RAG_CHUNK_TOKENS = 512;
export const RAG_CHUNK_OVERLAP_TOKENS = 64;
export const RAG_TOP_K = 4;
export const RAG_CONTEXT_BUDGET_TOKENS = 2000; // reserved from MAX_CONTEXT_TOKENS
