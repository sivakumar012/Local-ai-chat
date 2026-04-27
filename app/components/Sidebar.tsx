"use client";

import { useState } from "react";
import { useChatStore } from "@/app/store/chatStore";
import { useUserStore } from "@/app/store/userStore";
import { Conversation } from "@/app/lib/types";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ChatBubbleLeftIcon,
  ServerIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { signOut } from "next-auth/react";
import Image from "next/image";

interface Props {
  userImage?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}

export default function Sidebar({ userImage, userName, userEmail }: Props) {
  const {
    conversations,
    activeId,
    createConversation,
    deleteConversation,
    selectConversation,
    renameConversation,
    clearConversations,
  } = useChatStore();

  const { llmBaseUrl, setLlmBaseUrl } = useUserStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(llmBaseUrl);

  function startEdit(conv: Conversation) {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }

  function commitEdit(id: string) {
    if (editTitle.trim()) renameConversation(id, editTitle.trim());
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function commitUrl() {
    if (urlDraft.trim()) setLlmBaseUrl(urlDraft.trim());
    setEditingUrl(false);
  }

  return (
    <aside className="flex flex-col w-64 min-w-[16rem] h-full bg-gray-900 text-gray-100 border-r border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <span className="font-semibold text-lg tracking-tight">Local AI Chat</span>
        <button
          onClick={() => createConversation()}
          title="New chat"
          className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {conversations.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-8 px-4">
            No conversations yet. Start a new chat!
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => selectConversation(conv.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              activeId === conv.id
                ? "bg-gray-700 text-white"
                : "hover:bg-gray-800 text-gray-300"
            }`}
          >
            <ChatBubbleLeftIcon className="w-4 h-4 shrink-0 text-gray-400" />

            {editingId === conv.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit(conv.id);
                  if (e.key === "Escape") cancelEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 bg-gray-600 text-white text-sm rounded px-1 outline-none min-w-0"
              />
            ) : (
              <span className="flex-1 text-sm truncate">{conv.title}</span>
            )}

            {editingId === conv.id ? (
              <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => commitEdit(conv.id)} className="hover:text-green-400">
                  <CheckIcon className="w-3.5 h-3.5" />
                </button>
                <button onClick={cancelEdit} className="hover:text-red-400">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className="hidden group-hover:flex gap-1 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => startEdit(conv)}
                  title="Rename"
                  className="hover:text-blue-400 transition-colors"
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteConversation(conv.id)}
                  title="Delete"
                  className="hover:text-red-400 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-4 py-3 space-y-3">
        {/* LM Studio URL */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <ServerIcon className="w-3.5 h-3.5" />
              <span>LM Studio URL</span>
            </div>
            {!editingUrl && (
              <button
                onClick={() => {
                  setUrlDraft(llmBaseUrl);
                  setEditingUrl(true);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {editingUrl ? (
            <div className="flex gap-1">
              <input
                autoFocus
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitUrl();
                  if (e.key === "Escape") setEditingUrl(false);
                }}
                className="flex-1 bg-gray-800 text-white text-xs rounded px-2 py-1 border border-gray-600 focus:border-indigo-500 outline-none min-w-0"
              />
              <button onClick={commitUrl} className="text-green-400 hover:text-green-300">
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditingUrl(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400 truncate font-mono">{llmBaseUrl}</p>
          )}
        </div>

        {/* Clear all chats */}
        {conversations.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Delete all conversations?")) clearConversations();
            }}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            Clear all chats
          </button>
        )}

        {/* User profile + sign out */}
        {(userName || userEmail) && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-800">
            {userImage ? (
              <Image
                src={userImage}
                alt={userName ?? "User"}
                width={28}
                height={28}
                className="rounded-full shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                {(userName ?? userEmail ?? "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {userName && (
                <p className="text-xs text-gray-300 truncate font-medium">{userName}</p>
              )}
              {userEmail && (
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              )}
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
              className="shrink-0 text-gray-500 hover:text-red-400 transition-colors"
            >
              <ArrowRightStartOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
