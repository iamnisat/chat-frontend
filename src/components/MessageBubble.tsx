import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import type { MessageResponse } from "../types";

const speechSupported =
  typeof window !== "undefined" && "speechSynthesis" in window;

/* =========================================================
   TEXT HELPERS
========================================================= */

function normalizeMarkdown(content: string = ""): string {
  return (
    content
      // Escaped newlines coming from API/socket
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\n")

      // Normal line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

      // Prevent too many blank lines
      .replace(/\n{3,}/g, "\n\n")
  );
}

function stripToPlainText(content: string): string {
  if (!content) return "";

  const normalized = normalizeMarkdown(content);

  const p = document.createElement("p");
  p.innerHTML = normalized;

  return (p.textContent || p.innerText || "")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .trim();
}

function detectLanguage(text: string): "bn" | "ar" | "en" {
  if (/[ঀ-৿]/.test(text)) return "bn";
  if (/[؀-ۿ]/.test(text)) return "ar";
  return "en";
}

const SPEECH_LOCALES: Record<"bn" | "ar" | "en", string> = {
  bn: "bn-BD",
  ar: "ar-SA",
  en: "en-US",
};

function detectSpeechLocale(text: string): string {
  return SPEECH_LOCALES[detectLanguage(text)];
}

/* =========================================================
   SPEECH VOICE
========================================================= */

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoiceCache() {
  if (speechSupported) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

if (speechSupported) {
  refreshVoiceCache();
  window.speechSynthesis.onvoiceschanged = refreshVoiceCache;
}

function pickVoice(locale: string): SpeechSynthesisVoice | undefined {
  if (cachedVoices.length === 0) {
    refreshVoiceCache();
  }

  const prefix = locale.split("-")[0].toLowerCase();

  const exact = cachedVoices.find(
    (voice) => voice.lang.toLowerCase() === locale.toLowerCase(),
  );

  if (exact) return exact;

  const sameLanguage = cachedVoices.filter((voice) =>
    voice.lang.toLowerCase().startsWith(prefix),
  );

  if (sameLanguage.length === 0) {
    return undefined;
  }

  return sameLanguage.find((voice) => voice.localService) ?? sameLanguage[0];
}

/* =========================================================
   SPEECH HIGHLIGHT
========================================================= */

function highlightSpeechRange(root: HTMLElement, start: number, end: number) {
  clearSpeechHighlight(root);

  if (end <= start) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let offset = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const text = node as Text;

    const nodeStart = offset;
    const nodeEnd = offset + text.data.length;

    offset = nodeEnd;

    if (nodeEnd <= start || nodeStart >= end) {
      continue;
    }

    const localStart = Math.max(0, start - nodeStart);

    const localEnd = Math.min(text.data.length, end - nodeStart);

    if (localStart >= localEnd) continue;

    try {
      const range = document.createRange();

      range.setStart(text, localStart);
      range.setEnd(text, localEnd);

      const mark = document.createElement("mark");

      mark.className = "speech-highlight";

      range.surroundContents(mark);
    } catch {
      // Ignore highlight error
    }
  }
}

function clearSpeechHighlight(root: HTMLElement) {
  const marks = root.querySelectorAll("mark.speech-highlight");

  marks.forEach((mark) => {
    const parent = mark.parentNode;

    if (!parent) return;

    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }

    parent.removeChild(mark);
  });
}

/* =========================================================
   IMAGE
========================================================= */

// const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "https://storage.googleapis.com/aunkur/farmer-profile";
const IMAGE_BASE_URL = "https://storage.googleapis.com/aunkur/farmer-profile";

function makePlaceholder(letter: string, color: string): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='${encodeURIComponent(
    color,
  )}'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='13' font-weight='bold' font-family='system-ui'%3E${encodeURIComponent(
    letter,
  )}%3C/text%3E%3C/svg%3E`;
}

const AI_PLACEHOLDER = makePlaceholder("A", "#475569");

const FARMER_PLACEHOLDER = makePlaceholder("F", "#94a3b8");

/* =========================================================
   TYPES
========================================================= */

interface MessageBubbleProps {
  message: MessageResponse;
  isOwn: boolean;
}

/* =========================================================
   TIME
========================================================= */

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const diffMs = now.getTime() - date.getTime();

  const diffMins = Math.floor(diffMs / 60000);

  const diffHours = Math.floor(diffMs / 3600000);

  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   SENDER IMAGE
========================================================= */

function getSenderImage(message: MessageResponse): string | null {
  if (message.user?.images) {
    return `${IMAGE_BASE_URL}/${message.user.images}`;
  }

  if (message.farmer?.base_image) {
    return `${IMAGE_BASE_URL}/${message.farmer.base_image}`;
  }

  return null;
}

/* =========================================================
   CONTENT VALIDATION
========================================================= */

function hasVisibleContent(messageText: string): boolean {
  return (
    String(messageText ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/[#*_>`~\-|]/g, "")
      .trim().length > 0
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  if (!hasVisibleContent(message.message)) {
    return null;
  }

  const isAI = message.sender_type === "ai_agent";

  const senderImage = getSenderImage(message);

  const contentRef = useRef<HTMLDivElement | null>(null);

  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);

  const [copied, setCopied] = useState(false);

  /* =========================================================
     MARKDOWN CONTENT
  ========================================================= */

  const markdownContent = useMemo(
    () => normalizeMarkdown(message.message || ""),
    [message.message],
  );

  const contentLanguage = useMemo(
    () => detectLanguage(stripToPlainText(markdownContent)),
    [markdownContent],
  );

  /* =========================================================
     COPY
  ========================================================= */

  const handleCopy = async () => {
    const text = stripToPlainText(markdownContent);

    if (!text) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const helper = document.createElement("textarea");

        helper.value = text;

        helper.setAttribute("readonly", "");

        helper.style.position = "fixed";

        helper.style.top = "-9999px";

        document.body.appendChild(helper);

        helper.select();

        document.execCommand("copy");

        document.body.removeChild(helper);
      }

      setCopied(true);

      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }

      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  /* =========================================================
     SPEECH
  ========================================================= */

  const toggleSpeak = () => {
    if (!speechSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();

      setIsSpeaking(false);

      if (contentRef.current) {
        clearSpeechHighlight(contentRef.current);
      }

      return;
    }

    window.speechSynthesis.cancel();

    const text = stripToPlainText(markdownContent);

    if (!text) return;

    const locale = detectSpeechLocale(text);

    const voice = pickVoice(locale);

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = voice?.lang ?? locale;

    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);

      if (contentRef.current) {
        clearSpeechHighlight(contentRef.current);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);

      if (contentRef.current) {
        clearSpeechHighlight(contentRef.current);
      }
    };

    utterance.onboundary = (event) => {
      if (event.name && event.name !== "word") {
        return;
      }

      const el = contentRef.current;

      if (!el) return;

      const start = event.charIndex;

      const end =
        typeof event.charLength === "number" && event.charLength > 0
          ? start + event.charLength
          : (() => {
              const rest = text.slice(start);

              const match = rest.match(/\s|$/);

              return start + (match ? match.index! : rest.length);
            })();

      highlightSpeechRange(el, start, end);
    };

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();

        if (contentRef.current) {
          clearSpeechHighlight(contentRef.current);
        }
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     AVATAR
  ========================================================= */

  const avatar = senderImage ? (
    <img
      src={senderImage}
      alt={message.sender_name}
      className="w-8 h-8 rounded-lg object-cover"
      onError={(e) => {
        e.currentTarget.src = isAI ? AI_PLACEHOLDER : FARMER_PLACEHOLDER;
      }}
    />
  ) : (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
      style={{
        background: isAI
          ? "var(--own-gradient)"
          : "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
      }}
    >
      {message.sender_name?.charAt(0).toUpperCase() || "U"}
    </div>
  );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div
      className={`flex ${
        isOwn ? "justify-end" : "justify-start"
      } mb-3 animate-fade-in-up`}
    >
      {!isOwn && (
        <div className="hidden sm:block flex-shrink-0 mr-2 mt-1">{avatar}</div>
      )}

      <div
        className={`max-w-[92%] sm:max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isOwn
            ? "text-white rounded-br-md"
            : isAI
              ? "text-gray-800 rounded-bl-md border border-slate-200"
              : "text-gray-800 rounded-bl-md border border-slate-200"
        }`}
        style={{
          background: isOwn
            ? "var(--bubble-send)"
            : isAI
              ? "var(--bubble-reply)"
              : "var(--bubble-reply)",
        }}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="sm:hidden flex-shrink-0">{avatar}</span>

            <span
              dir="auto"
              className={`text-xs font-semibold ${
                isAI ? "text-slate-600" : "text-slate-600"
              }`}
            >
              {message.sender_name}
            </span>
          </div>
        )}

        {/* =====================================================
            MESSAGE CONTENT
            Markdown renders during streaming + after streaming
        ===================================================== */}

        <div
          ref={contentRef}
          className="text-sm ai-message-content"
          dir="auto"
          lang={contentLanguage}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeSanitize]}
            components={{
              p: ({ children }) => (
                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
              ),

              strong: ({ children }) => (
                <strong className="font-bold">{children}</strong>
              ),

              em: ({ children }) => <em className="italic">{children}</em>,

              h1: ({ children }) => (
                <h1 className="text-xl font-bold mt-3 mb-2">{children}</h1>
              ),

              h2: ({ children }) => (
                <h2 className="text-lg font-bold mt-3 mb-2">{children}</h2>
              ),

              h3: ({ children }) => (
                <h3 className="text-base font-semibold mt-2 mb-1">
                  {children}
                </h3>
              ),

              h4: ({ children }) => (
                <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>
              ),

              ul: ({ children }) => (
                <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
              ),

              ol: ({ children }) => (
                <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
              ),

              li: ({ children }) => (
                <li className="leading-relaxed">{children}</li>
              ),

              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-slate-300 pl-3 my-2 italic text-gray-600">
                  {children}
                </blockquote>
              ),

              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-600 underline break-words"
                >
                  {children}
                </a>
              ),

              code: ({ children, className, ...props }) => {
                const isBlock = Boolean(className);

                if (!isBlock) {
                  return (
                    <code
                      className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[13px]"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }

                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },

              pre: ({ children }) => (
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 overflow-x-auto text-xs whitespace-pre-wrap break-words">
                  {children}
                </pre>
              ),

              table: ({ children }) => (
                <div className="overflow-x-auto my-3">
                  <table className="min-w-full border-collapse border border-gray-300 text-sm">
                    {children}
                  </table>
                </div>
              ),

              thead: ({ children }) => (
                <thead className="bg-gray-100">{children}</thead>
              ),

              tbody: ({ children }) => <tbody>{children}</tbody>,

              tr: ({ children }) => <tr>{children}</tr>,

              th: ({ children }) => (
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold">
                  {children}
                </th>
              ),

              td: ({ children }) => (
                <td className="border border-gray-300 px-3 py-2 align-top">
                  {children}
                </td>
              ),

              hr: () => <hr className="my-3 border-gray-200" />,
            }}
          >
            {markdownContent}
          </ReactMarkdown>

          {/* Streaming cursor only */}
          {message.streaming && (
            <span className="stream-cursor" aria-hidden="true" />
          )}
        </div>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <div
          className={`flex items-center gap-1.5 mt-1.5 ${
            isOwn ? "text-white/70" : "text-gray-400"
          }`}
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
                    ? "text-slate-500"
                    : "hover:text-slate-500 hover:bg-slate-50"
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

          {!message.streaming && (
            <button
              type="button"
              onClick={handleCopy}
              className={`p-0.5 rounded transition-colors ${
                isOwn
                  ? "hover:bg-white/20"
                  : copied
                    ? "text-slate-500"
                    : "hover:text-slate-500 hover:bg-slate-50"
              }`}
              aria-label={copied ? "Copied" : "Copy message"}
              title={copied ? "Copied" : "Copy message"}
            >
              {copied ? (
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
                    d="M4.5 12.75l6 6 9-13.5"
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
                    d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
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
