import { Message } from "./types";

/**
 * Rough token estimator: ~4 chars per token (GPT-style heuristic).
 * Good enough for context trimming without a full tokenizer.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateMessagesTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content) + 4, 0);
}

/**
 * Trims the oldest non-system messages until the total estimated token count
 * is below `maxTokens`. Always preserves the system message.
 */
export function trimMessagesToLimit(
  messages: Message[],
  maxTokens: number
): Message[] {
  const system = messages.filter((m) => m.role === "system");
  let rest = messages.filter((m) => m.role !== "system");

  while (
    estimateMessagesTokens([...system, ...rest]) > maxTokens &&
    rest.length > 1
  ) {
    rest = rest.slice(1); // drop oldest non-system message
  }

  return [...system, ...rest];
}
