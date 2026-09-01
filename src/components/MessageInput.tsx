import { useCallback, useEffect, useRef, useState } from "react";
import type { LanguageType } from "../types";

interface MessageInputProps {
  onSendMessage: (
    message: string,
    cropName?: string,
    language?: LanguageType
  ) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  isSending?: boolean;
  cropName?: string;
}

const MAX_CHARS = 5000;

const LANGUAGE_OPTIONS: { value: LanguageType; label: string }[] = [
  { value: "bn", label: "বাংলা" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

// BCP-47 locale tags the Web Speech API expects, one per supported
// language, so dictation is recognized in the same language as replies.
const SPEECH_LOCALE: Record<LanguageType, string> = {
  bn: "bn-BD",
  en: "en-US",
  ar: "ar-SA",
};

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

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
  const [language, setLanguage] = useState<LanguageType>("bn");
  const [isListening, setIsListening] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Text already in the box when dictation started — final transcripts are
  // appended after this instead of overwriting it.
  const baseMessageRef = useRef("");
  const speechSupported = getSpeechRecognitionCtor() != null;

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

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    if (disabled || isListening) return;
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LOCALE[language];
    recognition.continuous = true;
    recognition.interimResults = true;

    // Dictation appends onto whatever was already typed, so keep it as
    // the fixed prefix and only replace the part after it as speech comes in.
    baseMessageRef.current = message.trim() ? `${message.trim()} ` : "";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        baseMessageRef.current = `${baseMessageRef.current}${finalTranscript} `;
      }

      const combined =
        `${baseMessageRef.current}${interimTranscript}`.trimStart();
      if (combined.length <= MAX_CHARS) {
        setMessage(combined);
        handleTyping();
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [disabled, isListening, language, message, handleTyping]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setMessage(value);
      // This only fires on a real user edit (setMessage from dictation
      // doesn't trigger the textarea's onChange). Keep the dictation base
      // in sync so that if the user corrects the text by hand — e.g.
      // deleting a misheard word — while still listening, the next thing
      // they say is appended onto what's actually in the box now, not
      // onto the stale text from when dictation started.
      baseMessageRef.current = value;
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

    if (isListening) {
      stopListening();
    }

    const trimmed = message.trim();
    if (trimmed && trimmed.length <= MAX_CHARS) {
      onSendMessage(trimmed, cropName?.trim() || undefined, language);
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

  // How tall the box is allowed to grow before it starts scrolling
  // internally instead of pushing more content out — generous enough that
  // a long message keeps visibly expanding rather than clamping early.
  const MAX_TEXTAREA_HEIGHT = 320;

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        MAX_TEXTAREA_HEIGHT
      )}px`;
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
            className="flex-1 resize-none overflow-y-auto bg-transparent px-4 py-3 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            rows={1}
            maxLength={MAX_CHARS + 100}
          />
          <div className="relative m-1.5 flex-shrink-0">
            <div
              className="pointer-events-none flex items-center gap-1 px-2.5 py-2.5 rounded-xl text-gray-400"
              aria-hidden="true"
            >
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
                  d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418"
                />
              </svg>
              <span className="text-xs font-bold text-purple-500">
                {language.toUpperCase()}
              </span>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageType)}
              disabled={disabled}
              aria-label="Reply language"
              title="Reply language"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListening}
              disabled={disabled}
              className={`m-1.5 p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening
                  ? "text-white shadow-md animate-thinking-glow"
                  : "text-gray-400 hover:text-purple-500 hover:bg-purple-50"
              }`}
              style={
                isListening ? { background: "var(--own-gradient)" } : undefined
              }
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? "Stop voice input"
                  : `Speak in ${
                      LANGUAGE_OPTIONS.find((o) => o.value === language)
                        ?.label ?? "selected language"
                    }`
              }
              title={isListening ? "Stop voice input" : "Voice input"}
            >
              {isListening ? (
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <rect x="6" y="6" width="12" height="12" rx="2" />
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
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </button>
          )}
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
