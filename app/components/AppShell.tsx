"use client";

import { useRef, useState, useCallback, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import ServerSetup from "./ServerSetup";
import { useChatStore } from "@/app/store/chatStore";
import { useUserStore } from "@/app/store/userStore";
import { Message } from "@/app/lib/types";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function AppShell() {
  const { data: session } = useSession();

  const { activeConversation, addMessage, updateLastAssistantMessage, createConversation } =
    useChatStore();
  const { llmBaseUrl, setupComplete } = useUserStore();

  // Prevent hydration mismatch: Zustand persist reads localStorage only on the
  // client. useSyncExternalStore returns the server snapshot ("") on the server
  // and the client snapshot ("client") after hydration — no setState in effect needed.
  const isClient = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    () => true,
    () => false
  );

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const abortRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(
    async (text: string) => {
      let conv = activeConversation();

      // Auto-create conversation if none active
      if (!conv) {
        const id = createConversation();
        conv = useChatStore.getState().conversations.find((c) => c.id === id) ?? null;
      }
      if (!conv) return;

      setError(null);

      // Add user message
      addMessage(conv.id, { role: "user", content: text });

      // Add empty assistant placeholder
      const assistantMsg = addMessage(conv.id, { role: "assistant", content: "" });
      setStreamingMsgId(assistantMsg.id);
      setIsStreaming(true);

      // Re-read latest conversation state (after addMessage updates)
      const latestConv = useChatStore.getState().conversations.find((c) => c.id === conv!.id)!;
      const messages: Pick<Message, "role" | "content">[] = latestConv.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            model: latestConv.model,
            temperature: latestConv.temperature,
            max_tokens: latestConv.maxTokens,
            // Pass the user-configured LM Studio URL
            llmBaseUrl,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                accumulated += parsed.content;
                updateLastAssistantMessage(conv!.id, accumulated);
              }
            } catch (parseErr) {
              if (
                parseErr instanceof Error &&
                parseErr.message !== "Unexpected end of JSON input"
              ) {
                throw parseErr;
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped — keep partial response
        } else {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(msg);
          updateLastAssistantMessage(conv.id, `⚠️ Error: ${msg}`);
        }
      } finally {
        setIsStreaming(false);
        setStreamingMsgId(null);
        abortRef.current = null;
      }
    },
    [activeConversation, addMessage, updateLastAssistantMessage, createConversation, llmBaseUrl]
  );

  function handleStop() {
    abortRef.current?.abort();
  }

  // Wait for client hydration before rendering anything store-dependent
  if (!isClient) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Show server setup screen if user hasn't configured the LM Studio URL yet
  if (!setupComplete) {
    return <ServerSetup />;
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 md:hidden"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed md:relative md:translate-x-0 z-40 h-full transition-transform duration-200`}
      >
        <Sidebar
          userImage={session?.user?.image}
          userName={session?.user?.name}
          userEmail={session?.user?.email}
        />
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-4 py-2 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="ml-4 hover:text-white">
              ✕
            </button>
          </div>
        )}
        <ChatWindow
          streamingId={streamingMsgId}
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={handleStop}
        />
      </div>
    </div>
  );
}
