import type { MessageResponse } from "../types";

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "";

function makePlaceholder(letter: string, color: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='${encodeURIComponent(color)}'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='13' font-weight='bold' font-family='system-ui'%3E${encodeURIComponent(letter)}%3C/text%3E%3C/svg%3E`;
}

const AI_PLACEHOLDER = makePlaceholder("A", "#a78bfa");
const FARMER_PLACEHOLDER = makePlaceholder("F", "#10b981");

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

function getSenderImage(message: MessageResponse): string | null {
  if (message.user?.images) {
    return `${IMAGE_BASE_URL}/${message.user.images}`;
  }
  if (message.farmer?.base_image) {
    return `${IMAGE_BASE_URL}/${message.farmer.base_image}`;
  }
  return null;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isAI = message.sender_type === "ai_agent";
  const senderImage = getSenderImage(message);

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 animate-fade-in-up`}>
      {!isOwn && (
        <div className="flex-shrink-0 mr-2 mt-1">
          {senderImage ? (
            <img
              src={senderImage}
              alt={message.sender_name}
              className="w-8 h-8 rounded-lg object-cover"
              onError={(e) => { e.currentTarget.src = isAI ? AI_PLACEHOLDER : FARMER_PLACEHOLDER; }}
            />
          ) : (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                 style={{ background: isAI ? "var(--own-gradient)" : "linear-gradient(135deg, #34d399 0%, #10b981 100%)" }}>
              {message.sender_name?.charAt(0).toUpperCase() || "U"}
            </div>
          )}
        </div>
      )}
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
        <div
          className="text-sm ai-message-content"
          dangerouslySetInnerHTML={{ __html: message.message }}
        />
        <div className={`text-[10px] mt-1.5 ${isOwn ? "text-white/70" : "text-gray-400"}`}>
          {formatTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
