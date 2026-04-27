"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserPreferences {
  /** The LM Studio base URL entered by the user, e.g. http://127.0.0.1:1234 */
  llmBaseUrl: string;
  /** Whether the user has completed the initial setup */
  setupComplete: boolean;
}

interface UserState extends UserPreferences {
  setLlmBaseUrl: (url: string) => void;
  completeSetup: (url: string) => void;
  resetSetup: () => void;
}

const DEFAULT_URL = "http://127.0.0.1:1234";

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      llmBaseUrl: DEFAULT_URL,
      setupComplete: false,

      setLlmBaseUrl: (url) => set({ llmBaseUrl: url }),

      completeSetup: (url) =>
        set({ llmBaseUrl: url.trim() || DEFAULT_URL, setupComplete: true }),

      resetSetup: () =>
        set({ llmBaseUrl: DEFAULT_URL, setupComplete: false }),
    }),
    {
      name: "local-ai-chat-user-prefs",
    }
  )
);
