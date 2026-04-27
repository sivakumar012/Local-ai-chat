"use client";

import { useState } from "react";
import { Cog6ToothIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useChatStore } from "@/app/store/chatStore";
import { Conversation } from "@/app/lib/types";

interface Props {
  conversation: Conversation;
}

export default function ModelSettings({ conversation }: Props) {
  const { updateSettings } = useChatStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Model settings"
        className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-lg">Model Settings</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Model name */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Model name</label>
                <input
                  type="text"
                  value={conversation.model}
                  onChange={(e) =>
                    updateSettings(conversation.id, { model: e.target.value })
                  }
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-600 focus:border-indigo-500 transition-colors"
                  placeholder="e.g. gemma-4-e4b"
                />
              </div>

              {/* Temperature */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-sm text-gray-400">Temperature</label>
                  <span className="text-sm text-indigo-400 font-mono">
                    {conversation.temperature.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={conversation.temperature}
                  onChange={(e) =>
                    updateSettings(conversation.id, {
                      temperature: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              {/* Max tokens */}
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Max tokens</label>
                <input
                  type="number"
                  min={64}
                  max={32000}
                  step={64}
                  value={conversation.maxTokens}
                  onChange={(e) =>
                    updateSettings(conversation.id, {
                      maxTokens: parseInt(e.target.value, 10) || 1000,
                    })
                  }
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none border border-gray-600 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-2 text-sm font-medium transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
