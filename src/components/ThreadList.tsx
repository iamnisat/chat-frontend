import { type RefObject } from "react";
import type { ThreadModule } from "../types";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

interface ThreadListProps {
  threads: ThreadModule[];
  selectedThread: number | null;
  onSelectThread: (threadId: number) => void;
  onCreateThread?: () => void;
  className?: string;
  isCreatingThread?: boolean;
  isLoadingThreads?: boolean;
  createButtonRef?: RefObject<HTMLButtonElement | null>;
}

const THREAD_ICONS: Record<number, string> = {
  100: "M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H18.75m-7.5-2.25h7.5m-7.5 0H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H18.75m-7.5-3H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M18.75 12h-7.5m0 0H6.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H18.75m-7.5 0v-1.5c0-.621.504-1.125 1.125-1.125H18.75",
  200: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  300: "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
};

const DEFAULT_ICON = "M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z";

// The upstream API doesn't document what values the conversation `mode`
// field takes, so match on a normalized form and fall back to showing
// whatever came back rather than hiding a value we don't recognize — an
// unfamiliar label is more useful than a silently missing one.
function formatThreadMode(mode?: string): string | null {
  const raw = mode?.trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (["ai", "ai_agent", "agent", "bot", "auto"].includes(normalized)) {
    return "AI";
  }
  if (["human", "manual", "user", "expert", "admin"].includes(normalized)) {
    return "Human";
  }
  return raw;
}

export function ThreadList({
  threads,
  selectedThread,
  onSelectThread,
  onCreateThread,
  className = "",
  isCreatingThread,
  isLoadingThreads,
  createButtonRef,
}: ThreadListProps) {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-800">Conversations</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isLoadingThreads
                ? "Loading..."
                : `${threads.length} threads available`}
            </p>
          </div>
          {onCreateThread && (
            <button
              ref={createButtonRef}
              onClick={onCreateThread}
              disabled={isCreatingThread}
              className="p-2 rounded-xl hover:bg-purple-50 transition-colors text-purple-500 hover:text-purple-600 disabled:opacity-50"
              title="New conversation"
            >
              {isCreatingThread ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
        {isLoadingThreads ? (
          <div className="space-y-1.5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl animate-pulse"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3 w-2/3 rounded bg-purple-100" />
                  <div className="h-2.5 w-4/5 rounded bg-purple-50" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          threads.map((thread, index) => {
            const isSelected = selectedThread === thread.id;
            const threadMode = formatThreadMode(thread.mode);
            const icon = THREAD_ICONS[thread.id] || DEFAULT_ICON;

            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full text-left px-3.5 py-3 rounded-xl transition-all duration-200 ${
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
                      className={`w-5 h-5 ${
                        isSelected ? "text-white" : "text-purple-400"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={icon}
                      />
                    </svg>
                  </div>
                  {/* Thread titles and previews are user/AI text, so they
                      can be Arabic while the surrounding chrome is English —
                      dir="auto" lets each resolve its own direction, which
                      also puts the truncation ellipsis on the correct end. */}
                  <div className="flex-1 min-w-0">
                    {/* The mode sits in its own non-shrinking element rather
                        than being concatenated into the name: the name
                        truncates, and appending to it would let a long crop
                        name push the mode out of sight — which is the part
                        that distinguishes two otherwise identically-named
                        threads. */}
                    <div className="flex items-baseline gap-1">
                      <span
                        dir="auto"
                        className={`text-sm font-semibold truncate ${
                          isSelected ? "text-purple-700" : "text-gray-700"
                        }`}
                      >
                        {thread.name}
                      </span>
                      {threadMode && (
                        <span
                          className={`text-[11px] font-medium flex-shrink-0 ${
                            isSelected ? "text-purple-400" : "text-gray-400"
                          }`}
                        >
                          ({threadMode})
                        </span>
                      )}
                    </div>
                    {thread.last_message && (
                      <div
                        dir="auto"
                        className="text-xs text-gray-400 mt-0.5 truncate"
                      >
                        {stripHtml(thread.last_message)}
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <div
                      className="w-1.5 h-8 rounded-full flex-shrink-0"
                      style={{ background: "var(--own-gradient)" }}
                    />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
