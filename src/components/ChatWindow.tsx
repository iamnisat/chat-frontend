import { useEffect } from "react";
import type { MessageResponse } from "../types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

interface ChatWindowProps {
  messages: MessageResponse[];
  currentUserId: number;
  currentUserType: "farmer" | "user";
  isTyping: boolean;
  typingUser: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export function ChatWindow({ messages, currentUserId, currentUserType, isTyping, typingUser, messagesEndRef }: ChatWindowProps) {
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, messagesEndRef]);

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-white">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-lg font-medium">No messages yet</div>
            <div className="text-sm">Start the conversation by sending a message</div>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_type === currentUserType && msg[`${currentUserType}_id`] === currentUserId}
            />
          ))}
          {isTyping && <TypingIndicator userName={typingUser} />}
          <div ref={messagesEndRef} />
        </div>
      )}
    </div>
  );
}
