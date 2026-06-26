export function TypingIndicator({ userName }: { userName: string }) {
  return (
    <div className="flex justify-start mb-3 animate-fade-in-up">
      <div
        className="rounded-2xl rounded-bl-md px-4 py-2.5 border border-purple-100"
        style={{ background: "var(--ai-gradient)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-purple-500">{userName}</span>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
