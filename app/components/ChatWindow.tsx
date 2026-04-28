"use client";

import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/app/store/chatStore";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import ModelSettings from "./ModelSettings";
import { TrashIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Message } from "@/app/lib/types";

interface Props {
  streamingId: string | null;
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export default function ChatWindow({ streamingId, isStreaming, onSend, onStop }: Props) {
  const { activeConversation, deleteMessage } = useChatStore();
  const conv = activeConversation();
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessageContent = conv?.messages[conv.messages.length - 1]?.content;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages.length, lastMessageContent]);

  const handleDelete = useCallback(
    (messageId: string) => {
      if (conv) deleteMessage(conv.id, messageId);
    },
    [conv, deleteMessage]
  );

  function handleExport() {
    if (!conv) return;
    const data = JSON.stringify(conv, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearChat() {
    if (!conv) return;
    if (confirm("Clear all messages in this chat?")) {
      // Reset to just system message by renaming and clearing
      useChatStore.setState((s) => ({
        conversations: s.conversations.map((c) =>
          c.id !== conv.id
            ? c
            : {
                ...c,
                messages: c.messages.filter((m) => m.role === "system"),
                title: "New Chat",
                updatedAt: Date.now(),
              }
        ),
      }));
    }
  }

  if (!conv) {
    return (
      <div className="flex flex-col bg-gray-950 min-w-0 overflow-hidden h-full">
        {/* Header placeholder — keeps hamburger clear on mobile */}
        <header className="pl-14 pr-4 md:px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0 h-[52px]" />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
          <div className="text-center space-y-3">
            <div className="text-5xl">💬</div>
            <p className="text-lg font-medium text-gray-400">No conversation selected</p>
            <p className="text-sm">Create a new chat from the sidebar to get started.</p>
          </div>
        </div>
      </div>
    );
  }

  const visibleMessages = conv.messages.filter((m: Message) => m.role !== "system");

  return (
    <div className="flex flex-col bg-gray-950 min-w-0 overflow-hidden h-full">
      {/* Header — left-pad on mobile to clear the hamburger button */}
      <header className="flex items-center justify-between pl-14 pr-4 md:px-6 py-3 border-b border-gray-800 bg-gray-900 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-white font-medium truncate">{conv.title}</h1>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full shrink-0 hidden sm:inline">
            {conv.model}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleExport}
            title="Export chat as JSON"
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleClearChat}
            title="Clear chat"
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
          <ModelSettings conversation={conv} />
        </div>
      </header>

      {/* Messages — this is the only scrollable region */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {visibleMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
            <p className="text-4xl">🤖</p>
            <p className="text-base text-gray-500">How can I help you today?</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4">
            {visibleMessages.map((msg: Message) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onDelete={handleDelete}
                isStreaming={isStreaming && msg.id === streamingId}
              />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input — pinned to bottom, never scrolls away */}
      <ChatInput
        onSend={onSend}
        disabled={isStreaming}
        isStreaming={isStreaming}
        onStop={onStop}
      />
    </div>
  );
}
