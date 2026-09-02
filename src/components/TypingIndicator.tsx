import { useEffect, useRef, useState } from "react";

interface TypingIndicatorProps {
  userName: string;
  thinkingText?: string;
}

// How many characters to reveal per tick, and how often — tuned to read as
// a smooth, deliberate Claude-style typewriter rather than a jarring
// instant swap or a too-fast blur of text.
const CHARS_PER_TICK = 1;
const TICK_MS = 35;

export function TypingIndicator({
  userName,
  thinkingText,
}: TypingIndicatorProps) {
  // Strip a trailing "..."/"…" from the raw text — the animated dots next
  // to it already signal "still going," so a literal ellipsis is redundant.
  const target = (thinkingText?.trim() ?? "").replace(/(\.{2,}|…)\s*$/, "");
  const [displayedText, setDisplayedText] = useState("");
  const displayedRef = useRef("");
  const targetRef = useRef("");

  // Track the latest target text. If the new text isn't a continuation of
  // what's already shown (a fresh turn, or replaced rather than extended
  // content) restart the reveal instead of diffing mid-word.
  useEffect(() => {
    targetRef.current = target;
    if (!target) {
      displayedRef.current = "";
      setDisplayedText("");
    } else if (!target.startsWith(displayedRef.current)) {
      displayedRef.current = "";
    }
  }, [target]);

  // A single persistent ticker that gradually catches the displayed text
  // up to the target, character by character — this is what produces the
  // typewriter feel regardless of how choppy the underlying updates are.
  useEffect(() => {
    const id = setInterval(() => {
      const full = targetRef.current;
      const current = displayedRef.current;
      if (current.length < full.length) {
        const next = full.slice(0, current.length + CHARS_PER_TICK);
        displayedRef.current = next;
        setDisplayedText(next);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const isRevealing = displayedText.length < target.length;

  return (
    <div className="flex justify-start mb-3 animate-fade-in-up">
      <div
        className="rounded-2xl rounded-bl-md px-3.5 py-2.5 border border-purple-100 max-w-[85%]"
        style={{ background: "var(--ai-gradient)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="relative flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 animate-thinking-glow"
            style={{ background: "var(--own-gradient)" }}
          >
            <svg
              className="w-3.5 h-3.5 text-white animate-thinking-spin"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4L12 2z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {target ? (
              <span className="text-xs font-medium thinking-shimmer-text whitespace-pre-wrap break-words">
                {displayedText}
                {isRevealing && (
                  <span className="stream-cursor" aria-hidden="true" />
                )}
              </span>
            ) : (
              <span className="text-xs font-semibold thinking-shimmer-text">
                {userName ? `${userName} is thinking` : "Thinking"}
              </span>
            )}
            <div className="flex items-end gap-1 flex-shrink-0">
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-thinking-dot"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-thinking-dot"
                style={{ animationDelay: "160ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-thinking-dot"
                style={{ animationDelay: "320ms" }}
              />
            </div>
          </div>
        </div>

        {!target && (
          <div className="mt-2.5 space-y-1.5 pl-8">
            <div
              className="h-2 w-full thinking-shimmer-bar"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="h-2 w-4/5 thinking-shimmer-bar"
              style={{ animationDelay: "120ms" }}
            />
            <div
              className="h-2 w-3/5 thinking-shimmer-bar"
              style={{ animationDelay: "240ms" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
