import { NextRequest } from "next/server";
import { trimMessagesToLimit } from "@/app/lib/tokenUtils";
import { MAX_CONTEXT_TOKENS, Message } from "@/app/lib/types";
import { logger } from "@/app/lib/logger";

export const runtime = "nodejs";

const DEFAULT_BASE_URL = process.env.LLM_BASE_URL ?? "http://127.0.0.1:1234";
const API_PATH = process.env.LLM_API_PATH ?? "/v1/chat/completions";

export async function POST(req: NextRequest) {
  const requestStart = Date.now();

  try {
    const body = await req.json();
    const {
      messages,
      model = "google/gemma-4-e4b",
      temperature = 0.7,
      max_tokens = 1000,
      // Client can pass their configured LM Studio URL; falls back to env
      llmBaseUrl,
    } = body as {
      messages: Message[];
      model: string;
      temperature: number;
      max_tokens: number;
      llmBaseUrl?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.warn("api.chat.badRequest", { reason: "messages array is required" });
      return Response.json({ error: "messages array is required" }, { status: 400 });
    }

    const baseUrl = (llmBaseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
    const endpoint = `${baseUrl}${API_PATH}`;

    // Trim context to stay within token limit
    const trimmed = trimMessagesToLimit(messages, MAX_CONTEXT_TOKENS);

    logger.info("api.chat.request", {
      model,
      messageCount: trimmed.length,
      temperature,
      maxTokens: max_tokens,
    });

    // Forward to local LLM with streaming
    let llmResponse: Response;
    try {
      llmResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: trimmed.map(({ role, content }) => ({ role, content })),
          temperature,
          max_tokens,
          stream: true,
        }),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isRefused =
        message.includes("ECONNREFUSED") || message.includes("fetch failed");
      logger.error("api.chat.llm.unreachable", { error: message });
      return Response.json(
        {
          error: isRefused
            ? `Cannot connect to LLM server at ${baseUrl}. Make sure LM Studio is running and the server is started.`
            : message,
        },
        { status: 503 }
      );
    }

    if (!llmResponse.ok) {
      const text = await llmResponse.text();
      logger.error("api.chat.llm.error", { status: llmResponse.status });
      return Response.json(
        { error: `LLM server error ${llmResponse.status}: ${text}` },
        { status: 503 }
      );
    }

    // Pipe the LLM SSE stream through a TransformStream, extracting delta content
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = llmResponse.body!.getReader();
      const decoder = new TextDecoder();
      let tokenCount = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              await writer.write(encoder.encode("data: [DONE]\n\n"));
              logger.info("api.chat.stream.done", {
                model,
                tokenCount,
                durationMs: Date.now() - requestStart,
              });
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (delta !== undefined && delta !== null) {
                tokenCount++;
                await writer.write(
                  encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                );
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Stream error";
        logger.error("api.chat.stream.error", { error: msg });
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    logger.error("api.chat.unhandled", { error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
