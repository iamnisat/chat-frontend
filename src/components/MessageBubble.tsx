import type { MessageResponse } from "../types";

interface MessageBubbleProps {
  message: MessageResponse;
  isOwn: boolean;
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isAI = message.sender_type === "ai_agent";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 animate-fade-in-up`}>
      <div
        className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "text-white rounded-br-md"
            : isAI
            ? "text-gray-800 rounded-bl-md border border-purple-100"
            : "text-gray-800 rounded-bl-md border border-green-100"
        }`}
        style={{
          background: isOwn
            ? "var(--own-gradient)"
            : isAI
            ? "var(--ai-gradient)"
            : "var(--farmer-gradient)",
        }}
      >
        {!isOwn && (
          <div className={`text-xs font-semibold mb-1 ${isAI ? "text-purple-600" : "text-emerald-600"}`}>
            {message.sender_name}
          </div>
        )}
        {isAI ? (
          <div
            className="text-sm ai-message-content"
            dangerouslySetInnerHTML={{ __html: message.message }}
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.message}</div>
        )}
        <div className={`text-[10px] mt-1.5 ${isOwn ? "text-white/70" : "text-gray-400"}`}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
