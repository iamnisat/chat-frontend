import { useCallback, useEffect, useRef } from "react";
import type { MessageResponse } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  messages: MessageResponse[];
  currentUserId: string;
  currentUserType: "farmer" | "user";
  isTyping: boolean;
  typingUser: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  hasMorePages: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export function ChatWindow({
  messages,
  currentUserId,
  currentUserType,
  isTyping,
  typingUser,
  messagesEndRef,
  hasMorePages,
  isLoadingMore,
  onLoadMore,
}: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitiallyLoaded = useRef(false);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingMore || !hasMorePages) return;

    if (container.scrollTop < 80) {
      onLoadMore();
    }
  }, [isLoadingMore, hasMorePages, onLoadMore]);

  useEffect(() => {
    if (messages.length === 0) {
      hasInitiallyLoaded.current = false;
      return;
    }
    if (!hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      });
    }
  }, [messages, messagesEndRef]);

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto px-4 py-6 chat-scroll-container"
      style={{ background: "var(--surface)" }}
    >
      {messages.length === 0 && !isLoadingMore ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center animate-float">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #f3e8ff 0%, #fce7f3 100%)",
              }}
            >
              <svg
                className="w-10 h-10 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A1.875 1.875 0 0 1 5.625 3h12.75A1.875 1.875 0 0 1 20.25 4.875v10.5A1.875 1.875 0 0 1 18.375 17.25H7.5l-3.75 2.855Z"
                />
              </svg>
            </div>
            <div className="text-lg font-semibold text-gray-700 mb-1">
              No messages yet
            </div>
            <div className="text-sm text-gray-400">
              Send a message to start the conversation
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-1 max-w-3xl mx-auto">
          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <svg
                  className="w-4 h-4 animate-spin"
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
                Loading earlier messages...
              </div>
            </div>
          )}
          {!isLoadingMore && hasMorePages && (
            <div className="text-center py-2">
              <span className="text-xs text-gray-300">Scroll up for more</span>
            </div>
          )}
          {messages
            .sort((a, b) => a.id - b.id)
            .map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={
                  msg.sender_type === currentUserType &&
                  msg[`${currentUserType}_id`] === currentUserId
                }
              />
            ))}
          {isTyping && <TypingIndicator userName={typingUser} />}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
