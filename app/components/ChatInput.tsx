"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { PaperAirplaneIcon, StopIcon } from "@heroicons/react/24/solid";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
}

export default function ChatInput({ onSend, disabled, isStreaming, onStop }: Props) {
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
    <div className="border-t border-gray-700 bg-gray-900 px-4 py-4">
      <div className="max-w-3xl mx-auto flex items-end gap-3 bg-gray-800 rounded-2xl px-4 py-3 border border-gray-600 focus-within:border-indigo-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Message… (Enter to send, Shift+Enter for newline)"
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
      <p className="text-center text-xs text-gray-600 mt-2">
        AI can make mistakes. Verify important information.
      </p>
    </div>
  );
}
