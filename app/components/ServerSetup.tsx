"use client";

import { useState } from "react";
import { useUserStore } from "@/app/store/userStore";
import { ServerIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";

export default function ServerSetup() {
  const { llmBaseUrl, completeSetup } = useUserStore();
  const [url, setUrl] = useState(llmBaseUrl || "http://127.0.0.1:1234");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "error" | null>(null);
  const [testError, setTestError] = useState("");

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setTestError("");
    try {
      // Hit /v1/models — a lightweight endpoint that doesn't require a loaded model
      const res = await fetch("/api/probe-server", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult("ok");
      } else {
        setTestResult("error");
        setTestError(data.error ?? "Server did not respond correctly.");
      }
    } catch {
      setTestResult("error");
      setTestError("Could not reach the server. Check the URL and try again.");
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    completeSetup(url.trim());
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <ServerIcon className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Connect to LM Studio</h1>
          <p className="text-gray-400 text-sm mt-2">
            Enter the URL of your running LM Studio local server.
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 shadow-2xl space-y-5">
          {/* URL input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LM Studio Server URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://127.0.0.1:1234"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-600 focus:border-indigo-500 outline-none transition-colors placeholder-gray-500"
            />
          </div>

          {/* Instructions */}
          <div className="bg-gray-800/60 rounded-xl p-4 text-xs text-gray-400 space-y-1.5">
            <p className="font-medium text-gray-300">How to start LM Studio server:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open LM Studio</li>
              <li>Go to the <span className="text-indigo-400">Local Server</span> tab (⇄ icon)</li>
              <li>Load a model and click <span className="text-indigo-400">Start Server</span></li>
              <li>Copy the URL shown (default: <code className="bg-gray-700 px-1 rounded">http://127.0.0.1:1234</code>)</li>
            </ol>
          </div>

          {/* Test result feedback */}
          {testResult === "ok" && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-xl px-4 py-3">
              <CheckCircleIcon className="w-5 h-5 shrink-0" />
              <span>Server is reachable and responding.</span>
            </div>
          )}
          {testResult === "error" && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
              <ExclamationCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{testError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleTest}
              disabled={testing || !url.trim()}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {testing ? "Testing…" : "Test Connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={!url.trim()}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Save & Continue
            </button>
          </div>

          <p className="text-xs text-gray-600 text-center">
            You can change this later from the sidebar settings.
          </p>
        </div>
      </div>
    </div>
  );
}
