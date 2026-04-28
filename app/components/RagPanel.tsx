"use client";

/**
 * RagPanel — slide-in panel for uploading and managing RAG documents.
 * Shown when the user clicks the paperclip icon in ChatInput.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import type { RagDocument } from "@/app/lib/types";
import { SUPPORTED_EXTENSIONS, MAX_FILE_SIZE_BYTES, isFileSupported } from "@/app/lib/ragUtils";
import { logger } from "@/app/lib/logger";

interface Props {
  userId: string;
  llmBaseUrl: string;
  onClose: () => void;
  /** Called when the set of ready documents changes */
  onDocumentsChange?: (hasDocuments: boolean) => void;
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; fileName: string; progress: number }
  | { status: "error"; message: string };

export default function RagPanel({ userId, llmBaseUrl, onClose, onDocumentsChange }: Props) {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ─── Load documents ─────────────────────────────────────────────────────────

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/documents");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { documents: RagDocument[] };
      setDocuments(data.documents);
      onDocumentsChange?.(data.documents.some((d) => d.status === "ready"));
    } catch (err) {
      logger.error("rag.panel.load.failed", { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [onDocumentsChange]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Poll for processing documents
  useEffect(() => {
    const processing = documents.some((d) => d.status === "processing");
    if (!processing) return;
    const timer = setInterval(loadDocuments, 3000);
    return () => clearInterval(timer);
  }, [documents, loadDocuments]);

  // ─── Upload ─────────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    if (!isFileSupported(file)) {
      setUploadState({
        status: "error",
        message: `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadState({
        status: "error",
        message: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB`,
      });
      return;
    }

    setUploadState({ status: "uploading", fileName: file.name, progress: 0 });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("llmBaseUrl", llmBaseUrl);

    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json() as { documentId?: string; chunkCount?: number; error?: string };

      if (!res.ok) {
        setUploadState({ status: "error", message: data.error ?? `Upload failed (${res.status})` });
        return;
      }

      setUploadState({ status: "idle" });
      logger.info("rag.panel.upload.done", { documentId: data.documentId, chunkCount: data.chunkCount });
      await loadDocuments();
    } catch (err) {
      setUploadState({
        status: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  }

  // ─── Drag and drop ──────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.add("border-indigo-500", "bg-indigo-950/20");
  }

  function handleDragLeave() {
    dropRef.current?.classList.remove("border-indigo-500", "bg-indigo-950/20");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dropRef.current?.classList.remove("border-indigo-500", "bg-indigo-950/20");
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    try {
      const res = await fetch(`/api/rag/documents/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadDocuments();
    } catch (err) {
      logger.error("rag.panel.delete.failed", { docId, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function StatusIcon({ status }: { status: RagDocument["status"] }) {
    if (status === "ready")
      return <CheckCircleIcon className="w-4 h-4 text-green-400 shrink-0" />;
    if (status === "error")
      return <ExclamationCircleIcon className="w-4 h-4 text-red-400 shrink-0" />;
    return <ArrowPathIcon className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />;
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-72 bg-gray-900 border-l border-gray-700 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-indigo-400" />
          <span className="font-medium text-sm text-white">Documents</span>
          {documents.filter((d) => d.status === "ready").length > 0 && (
            <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">
              {documents.filter((d) => d.status === "ready").length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Close documents panel"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Drop zone */}
      <div className="px-3 pt-3 shrink-0">
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => uploadState.status !== "uploading" && fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center cursor-pointer transition-colors hover:border-indigo-500 hover:bg-indigo-950/10"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadState.status === "uploading" ? (
            <div className="space-y-2">
              <ArrowPathIcon className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-gray-400 truncate">{uploadState.fileName}</p>
              <p className="text-xs text-indigo-400">Processing…</p>
            </div>
          ) : (
            <div className="space-y-1">
              <DocumentArrowUpIcon className="w-6 h-6 text-gray-500 mx-auto" />
              <p className="text-xs text-gray-400">
                Drop a file or <span className="text-indigo-400">browse</span>
              </p>
              <p className="text-xs text-gray-600">
                {SUPPORTED_EXTENSIONS.join(", ")} · max {MAX_FILE_SIZE_BYTES / 1024 / 1024} MB
              </p>
            </div>
          )}
        </div>

        {/* Upload error */}
        {uploadState.status === "error" && (
          <div className="mt-2 flex items-start gap-2 text-xs text-red-400 bg-red-900/20 rounded-lg px-3 py-2">
            <ExclamationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{uploadState.message}</span>
          </div>
        )}
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center pt-6">
            <ArrowPathIcon className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-xs text-gray-600 text-center pt-6">
            No documents yet. Upload one to enable RAG.
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start gap-2 bg-gray-800 rounded-lg px-3 py-2.5 group"
            >
              <StatusIcon status={doc.status} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate font-medium">{doc.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {doc.status === "ready"
                    ? `${doc.chunkCount} chunks · ${formatBytes(doc.sizeBytes)}`
                    : doc.status === "error"
                    ? doc.errorMessage ?? "Error"
                    : "Processing…"}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="shrink-0 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all disabled:opacity-50"
                title="Delete document"
              >
                {deletingId === doc.id ? (
                  <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <TrashIcon className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-3 border-t border-gray-700 shrink-0">
        <p className="text-xs text-gray-600 leading-relaxed">
          {documents.some((d) => d.status === "ready")
            ? "✓ RAG active — relevant excerpts will be injected into your next message."
            : "Upload a document to give the AI access to its content."}
        </p>
      </div>
    </div>
  );
}
