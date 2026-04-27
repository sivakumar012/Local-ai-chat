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
  model: "gemma-4-e4b",
  temperature: 0.7,
  maxTokens: 1000,
};

export const SYSTEM_PROMPT =
  "You are a helpful, harmless, and honest AI assistant.";

export const MAX_CONTEXT_TOKENS = 8000;
