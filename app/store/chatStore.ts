"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import {
  Conversation,
  Message,
  ChatSettings,
  DEFAULT_SETTINGS,
  SYSTEM_PROMPT,
} from "@/app/lib/types";

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;

  // Derived helpers
  activeConversation: () => Conversation | null;

  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  clearConversations: () => void;

  addMessage: (conversationId: string, message: Omit<Message, "id" | "createdAt">) => Message;
  updateLastAssistantMessage: (conversationId: string, content: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;

  updateSettings: (conversationId: string, settings: Partial<ChatSettings>) => void;
}

function makeSystemMessage(): Message {
  return {
    id: uuidv4(),
    role: "system",
    content: SYSTEM_PROMPT,
    createdAt: Date.now(),
  };
}

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  const now = Date.now();
  return {
    id: uuidv4(),
    title: "New Chat",
    messages: [makeSystemMessage()],
    createdAt: now,
    updatedAt: now,
    ...DEFAULT_SETTINGS,
    ...overrides,
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,

      activeConversation: () => {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId) ?? null;
      },

      createConversation: () => {
        const conv = makeConversation();
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: conv.id,
        }));
        return conv.id;
      },

      deleteConversation: (id) => {
        set((s) => {
          const remaining = s.conversations.filter((c) => c.id !== id);
          const newActive =
            s.activeId === id
              ? (remaining[0]?.id ?? null)
              : s.activeId;
          return { conversations: remaining, activeId: newActive };
        });
      },

      selectConversation: (id) => set({ activeId: id }),

      renameConversation: (id, title) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }));
      },

      clearConversations: () => set({ conversations: [], activeId: null }),

      addMessage: (conversationId, msg) => {
        const message: Message = {
          id: uuidv4(),
          createdAt: Date.now(),
          ...msg,
        };
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            // Auto-title from first user message
            const isFirstUser =
              msg.role === "user" &&
              c.messages.filter((m) => m.role === "user").length === 0;
            return {
              ...c,
              title: isFirstUser
                ? msg.content.slice(0, 40) + (msg.content.length > 40 ? "…" : "")
                : c.title,
              messages: [...c.messages, message],
              updatedAt: Date.now(),
            };
          }),
        }));
        return message;
      },

      updateLastAssistantMessage: (conversationId, content) => {
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const msgs = [...c.messages];
            // Find last assistant message
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === "assistant") {
                msgs[i] = { ...msgs[i], content };
                break;
              }
            }
            return { ...c, messages: msgs, updatedAt: Date.now() };
          }),
        }));
      },

      deleteMessage: (conversationId, messageId) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId
              ? c
              : {
                  ...c,
                  messages: c.messages.filter((m) => m.id !== messageId),
                  updatedAt: Date.now(),
                }
          ),
        }));
      },

      updateSettings: (conversationId, settings) => {
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id !== conversationId ? c : { ...c, ...settings }
          ),
        }));
      },
    }),
    {
      name: "local-ai-chat-store",
    }
  )
);
