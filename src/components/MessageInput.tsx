import { useState, useCallback, useRef, useEffect } from "react";

interface MessageInputProps {
  onSendMessage: (message: string, cropName?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  isSending?: boolean;
  cropName?: string;
}

const MAX_CHARS = 5000;

export function MessageInput({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled,
  isSending = false,
  cropName,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop();
    }, 2000);
  }, [isTyping, onTypingStart, onTypingStop]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setMessage(value);
      handleTyping();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isSending) return;

    const trimmed = message.trim();
    if (trimmed && trimmed.length <= MAX_CHARS) {
      onSendMessage(trimmed, cropName?.trim() || undefined);
      setMessage("");
      if (isTyping) {
        setIsTyping(false);
        onTypingStop();
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const charCount = message.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasText = message.trim().length > 0;

  return (
    <div className="border-t border-purple-100 bg-white px-4 py-3 flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Type a message..."
            disabled={disabled}
            className="flex-1 resize-none bg-transparent px-4 py-3 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            rows={1}
            maxLength={MAX_CHARS + 100}
          />
          <button
            onClick={handleSend}
            disabled={disabled || isSending || !hasText || isOverLimit}
            className={`m-1.5 p-2.5 rounded-xl transition-all duration-200 ${
              hasText && !isOverLimit && !isSending
                ? "text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            style={
              hasText && !isOverLimit && !isSending
                ? { background: "var(--own-gradient)" }
                : undefined
            }
            aria-label={isSending ? "Sending message" : "Send message"}
          >
            {isSending ? (
              <svg
                className="w-5 h-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.95 7.05-2.12-2.12M9.17 9.17 6.05 6.05m11.9 0-2.12 2.12M9.17 14.83l-3.12 3.12"
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
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-1.5 flex justify-end px-1">
          <span
            className={`text-[10px] font-medium transition-colors ${
              isOverLimit
                ? "text-rose-500"
                : charCount > MAX_CHARS * 0.9
                  ? "text-amber-500"
                  : "text-gray-300"
            }`}
          >
            {charCount > 0 ? `${charCount}/${MAX_CHARS}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
