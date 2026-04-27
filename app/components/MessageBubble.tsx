"use client";

import { useState } from "react";
import { Message } from "@/app/lib/types";
import { ClipboardIcon, ClipboardDocumentCheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  message: Message;
  onDelete?: (id: string) => void;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, onDelete, isStreaming }: Props) {
  const [copied, setCopied] = useState(false);

  if (message.role === "system") return null;

  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`group flex gap-3 px-4 py-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          AI
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-br-sm"
              : "bg-gray-800 text-gray-100 rounded-bl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg !mt-2 !mb-2 text-xs"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-gray-700 px-1 py-0.5 rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            title="Copy"
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            {copied ? (
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-400" />
            ) : (
              <ClipboardIcon className="w-4 h-4" />
            )}
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              title="Delete message"
              className="text-gray-500 hover:text-red-400 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold mt-0.5">
          You
        </div>
      )}
    </div>
  );
}
