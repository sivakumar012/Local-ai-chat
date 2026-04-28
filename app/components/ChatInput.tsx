"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid";
import { PaperClipIcon } from "@heroicons/react/24/outline";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  ragPanelOpen?: boolean;
  onToggleRagPanel?: () => void;
  ragEnabled?: boolean;
}

export default function ChatInput({ onSend, disabled, isStreaming, onStop, ragPanelOpen, onToggleRagPanel, ragEnabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  return (
    <div className="border-t border-gray-700 bg-gray-900 px-3 sm:px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shrink-0">
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-gray-800 rounded-2xl px-3 py-3 border border-gray-600 focus-within:border-indigo-500 transition-colors">
        {/* RAG toggle — paperclip */}
        <button
          type="button"
          onClick={onToggleRagPanel}
          title={ragPanelOpen ? "Close documents" : "Attach documents"}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
            ragPanelOpen
              ? "text-indigo-400 bg-indigo-900/40"
              : ragEnabled
              ? "text-indigo-400 hover:bg-gray-700"
              : "text-gray-500 hover:text-gray-300 hover:bg-gray-700"
          }`}
        >
          <PaperClipIcon className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={ragEnabled ? "Message… (RAG active)" : "Message… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          disabled={disabled && !isStreaming}
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 resize-none outline-none text-sm leading-relaxed max-h-[200px] overflow-y-auto disabled:opacity-50"
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            title="Stop generation"
            className="shrink-0 p-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            <StopIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!value.trim() || disabled}
            title="Send"
            className="shrink-0 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        )}
      </div>
      {ragEnabled && (
        <p className="text-center text-xs text-indigo-500 mt-1.5">
          📎 RAG active — responses will use your uploaded documents
        </p>
      )}
      <p className="text-center text-xs text-gray-600 mt-1 hidden sm:block">
        AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
