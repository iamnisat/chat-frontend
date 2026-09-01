interface TypingIndicatorProps {
  userName: string;
  thinkingText?: string;
}

export function TypingIndicator({
  userName,
  thinkingText,
}: TypingIndicatorProps) {
  const trimmedThinking = thinkingText?.trim();
  console.log("trimmedThinking: ", trimmedThinking);

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
            {trimmedThinking ? (
              <span className="text-xs font-medium thinking-shimmer-text whitespace-pre-wrap break-words">
                {trimmedThinking}
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

        {!trimmedThinking && (
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
