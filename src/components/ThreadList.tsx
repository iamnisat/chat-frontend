import { useState, useRef, useEffect } from "react";
import type { ThreadModule } from "../types";

interface ThreadListProps {
  threads: ThreadModule[];
  selectedThread: number | null;
  onSelectThread: (threadId: number) => void;
  onCreateThread?: (name: string) => void;
  className?: string;
}

const THREAD_ICONS: Record<number, string> = {
  100: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-2.25h7.5m-7.5 0H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H18.75m-7.5-3H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M18.75 12h-7.5m0 0H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H18.75m-7.5 0v-1.5c0-.621.504-1.125 1.125-1.125H18.75",
  200: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  300: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
};

const DEFAULT_ICON = "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z";

export function ThreadList({ threads, selectedThread, onSelectThread, onCreateThread, className = "" }: ThreadListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newThreadName, setNewThreadName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreating) {
      inputRef.current?.focus();
    }
  }, [isCreating]);

  const handleSubmit = () => {
    const trimmed = newThreadName.trim();
    if (trimmed && onCreateThread) {
      onCreateThread(trimmed);
      setNewThreadName("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setNewThreadName("");
      setIsCreating(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Conversations</h2>
            <p className="text-xs text-gray-400 mt-0.5">{threads.length} threads available</p>
          </div>
          {onCreateThread && (
            <button
              onClick={() => setIsCreating(true)}
              className="p-2 rounded-xl hover:bg-purple-50 transition-colors text-purple-500 hover:text-purple-600"
              title="New thread"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 p-2 bg-white rounded-xl shadow-sm border border-purple-100">
            <input
              ref={inputRef}
              type="text"
              value={newThreadName}
              onChange={(e) => setNewThreadName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Thread name..."
              maxLength={100}
              className="flex-1 text-sm px-2 py-1 outline-none text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={handleSubmit}
              disabled={!newThreadName.trim()}
              className="p-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity"
              style={{ background: "var(--own-gradient)" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
            <button
              onClick={() => { setNewThreadName(""); setIsCreating(false); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {threads.map((thread, index) => {
          const isSelected = selectedThread === thread.id;
          const icon = THREAD_ICONS[thread.id] || DEFAULT_ICON;

          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 group ${
                isSelected
                  ? "bg-white shadow-md shadow-purple-100 scale-[1.02]"
                  : "hover:bg-white/60 hover:shadow-sm"
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    isSelected ? "shadow-sm" : ""
                  }`}
                  style={{
                    background: isSelected
                      ? "var(--own-gradient)"
                      : "linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)",
                  }}
                >
                  <svg
                    className={`w-5 h-5 ${isSelected ? "text-white" : "text-purple-400"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${isSelected ? "text-purple-700" : "text-gray-700"}`}>
                    {thread.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">Thread #{thread.id}</div>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ background: "var(--own-gradient)" }} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
