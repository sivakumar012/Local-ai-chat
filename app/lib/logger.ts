/**
 * Structured logger for local-ai-chat.
 *
 * - In development: pretty-prints to the console with colour-coded levels.
 * - In production:  emits JSON lines to stdout (compatible with CloudWatch,
 *   Datadog, GCP Logging, etc.).
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info("chat.send", { conversationId, model });
 *   logger.error("firestore.write", { error, conversationId });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

// ANSI colour codes — only used in dev
const COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function emit(level: LogLevel, event: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (IS_PROD) {
    // Structured JSON — one line per event, easy to ingest
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    const colour = COLOURS[level];
    const prefix = `${colour}[${level.toUpperCase()}]${RESET}`;
    const metaStr = Object.keys(meta).length
      ? " " + JSON.stringify(meta, null, 0)
      : "";
    console.log(`${prefix} ${entry.timestamp} ${event}${metaStr}`);
  }
}

export const logger = {
  debug: (event: string, meta?: Record<string, unknown>) => emit("debug", event, meta),
  info:  (event: string, meta?: Record<string, unknown>) => emit("info",  event, meta),
  warn:  (event: string, meta?: Record<string, unknown>) => emit("warn",  event, meta),
  error: (event: string, meta?: Record<string, unknown>) => emit("error", event, meta),
};
