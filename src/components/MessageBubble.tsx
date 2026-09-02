import { useEffect, useRef, useState } from "react";
import type { MessageResponse } from "../types";

const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

function stripToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || div.innerText || "").trim();
}

// Picks a BCP-47 locale for the browser's speech synthesizer by sniffing
// which script the message is mostly written in — the app itself doesn't
// track which language a given AI reply came back in.
function detectSpeechLocale(text: string): string {
  if (/[ঀ-৿]/.test(text)) return "bn-BD";
  if (/[؀-ۿ]/.test(text)) return "ar-SA";
  return "en-US";
}

// Setting utterance.lang alone doesn't guarantee a matching voice — many
// browsers just fall back to whatever their default voice is regardless.
// Explicitly picking a real installed voice for the language gets a much
// more native-sounding read instead of a generic/robotic fallback.
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoiceCache() {
  if (speechSupported) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

if (speechSupported) {
  refreshVoiceCache();
  // Voice lists load asynchronously in most browsers — they can be empty
  // on the very first call, so re-cache once the real list is ready.
  window.speechSynthesis.onvoiceschanged = refreshVoiceCache;
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  if (cachedVoices.length === 0) refreshVoiceCache();
  const prefix = locale.split("-")[0].toLowerCase();

  const exact = cachedVoices.find(
    (v) => v.lang.toLowerCase() === locale.toLowerCase()
  );
  if (exact) return exact;

  const sameLanguage = cachedVoices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );
  if (sameLanguage.length === 0) return undefined;

  // Prefer an on-device voice — usually higher quality and lower latency
  // than a remote/network voice.
  return sameLanguage.find((v) => v.localService) ?? sameLanguage[0];
}

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

function hasVisibleContent(messageText: string): boolean {
  return (
    String(messageText ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0
  );
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  if (!hasVisibleContent(message.message)) {
    return null;
  }

  const isAI = message.sender_type === "ai_agent";
  const senderImage = getSenderImage(message);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<HTMLSpanElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeak = () => {
    if (!speechSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Stop whatever else (another bubble) is currently reading — the
    // synthesizer is a single global queue, not per-element.
    window.speechSynthesis.cancel();

    const text = stripToPlainText(message.message || "");
    if (!text) return;

    const locale = detectSpeechLocale(text);
    const voice = pickVoice(locale);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voice?.lang ?? locale;
    if (voice) utterance.voice = voice;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const next = message.message || "";

    if (message.streaming) {
      // Drop the trailing caret before diffing so it isn't counted as
      // rendered text, then re-append it after the new chunk.
      if (cursorRef.current && cursorRef.current.parentNode === el) {
        el.removeChild(cursorRef.current);
      }

      const prev = el.textContent || "";
      if (next !== prev) {
        if (next.startsWith(prev)) {
          const suffix = next.slice(prev.length);
          if (suffix) {
            // Wrap just the newly-arrived chunk so it fades/lifts into
            // place, Claude-style, instead of popping in instantly.
            const span = document.createElement("span");
            span.className = "token-fade-in";
            span.textContent = suffix;
            el.appendChild(span);
          }
        } else {
          el.textContent = next;
        }
      }

      const cursor = document.createElement("span");
      cursor.className = "stream-cursor";
      cursor.setAttribute("aria-hidden", "true");
      el.appendChild(cursor);
      cursorRef.current = cursor;
      return;
    }

    cursorRef.current = null;
    if (/<[^>]+>/.test(next)) {
      el.innerHTML = next;
    } else {
      el.textContent = next;
    }
  }, [message.id, message.message, message.streaming]);

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3 animate-fade-in-up`}
    >
      {!isOwn && (
        <div className="flex-shrink-0 mr-2 mt-1">
          {senderImage ? (
            <img
              src={senderImage}
              alt={message.sender_name}
              className="w-8 h-8 rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.src = isAI
                  ? AI_PLACEHOLDER
                  : FARMER_PLACEHOLDER;
              }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{
                background: isAI
                  ? "var(--own-gradient)"
                  : "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
              }}
            >
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
          <div
            className={`text-xs font-semibold mb-1 ${isAI ? "text-purple-600" : "text-emerald-600"}`}
          >
            {message.sender_name}
          </div>
        )}
        <div className="text-sm ai-message-content">
          <div ref={contentRef} />
        </div>
        <div
          className={`flex items-center gap-1.5 mt-1.5 ${isOwn ? "text-white/70" : "text-gray-400"}`}
        >
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          {speechSupported && !message.streaming && (
            <button
              type="button"
              onClick={toggleSpeak}
              className={`p-0.5 rounded transition-colors ${
                isOwn
                  ? "hover:bg-white/20"
                  : isSpeaking
                    ? "text-purple-500"
                    : "hover:text-purple-500 hover:bg-purple-50"
              }`}
              aria-pressed={isSpeaking}
              aria-label={isSpeaking ? "Stop reading aloud" : "Read aloud"}
              title={isSpeaking ? "Stop reading aloud" : "Read aloud"}
            >
              {isSpeaking ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
