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

// How tall the message box is allowed to grow before it starts scrolling
// internally instead of pushing more content out — generous enough that a
// long message keeps visibly expanding rather than clamping early.
const MAX_TEXTAREA_HEIGHT = 320;

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
  // Everything already confirmed in the box — kept up to date immediately
  // on every manual edit AND every newly-recognized final word, so it's
  // always the single source of truth for "what's actually in the box
  // right now, discounting only the live interim preview".
  const baseMessageRef = useRef("");
  // The current engine session's finalized transcript as of the last
  // onresult call — display-only until the session actually ends, at
  // which point it's committed into baseMessageRef exactly once. Mobile
  // engines can report inconsistent/non-monotonic growth between
  // intermediate results (retranscribing, shifting word boundaries), so
  // diffing across those events turned out to be unreliably fragile;
  // trusting only the session's final state avoids that entirely.
  const currentSessionFinalRef = useRef("");
  // True only while the user actually wants dictation running — set on
  // tapping the mic, cleared only by tapping it again, hitting send, or
  // unmounting. The underlying engine session ends on its own far more
  // often than that (after basically every pause, even in continuous
  // mode on many mobile browsers) — onend checks this flag to decide
  // whether to silently restart a fresh session (because the user never
  // asked to stop) or to actually stop.
  const shouldKeepListeningRef = useRef(false);
  const startSessionRef = useRef<(preserveBase: boolean) => void>(() => {});
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechSupported = getSpeechRecognitionCtor() != null;

  const stopListening = useCallback(() => {
    // Only path that actually stops dictation for good — tapping the mic
    // again, sending the message, or (below) a stretch of real silence.
    shouldKeepListeningRef.current = false;
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
    recognitionRef.current?.stop();
  }, []);

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
      // No new speech/typing for 2s — also turn the mic off (rather than
      // keep restarting sessions waiting for more) so the button's state
      // reflects that dictation has effectively stopped.
      if (shouldKeepListeningRef.current) {
        stopListening();
      }
    }, 100000);
  }, [isTyping, onTypingStart, onTypingStop, stopListening]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Reassigned on every render so the closure always sees the latest
  // language/message/disabled — recognition.onend calls through this ref
  // (rather than a useCallback-produced function directly) so a restart
  // triggered later by an async event always uses fresh values instead of
  // whatever was captured when that particular session started.
  startSessionRef.current = (preserveBase: boolean) => {
    if (disabled) return;
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LOCALE[language];
    // Deliberately NOT continuous — mobile engines (Android Chrome
    // especially) are known to internally re-segment/re-recognize
    // overlapping audio as separate results in continuous mode, in ways
    // that happen inside the engine before anything reaches onresult, so
    // no amount of JS-side result handling can fix it. Single-utterance
    // mode plus our own restart-on-end below gives the same "keeps
    // listening until the user stops it" behavior, but driven by us
    // instead of the engine's less reliable internal continuous handling.
    recognition.continuous = false;
    recognition.interimResults = true;

    // Dictation appends onto whatever was already typed, so keep it as
    // the fixed prefix and only replace the part after it as speech comes
    // in — unless this is an auto-restart of an already-running session,
    // in which case the base already reflects everything said so far.
    if (!preserveBase) {
      baseMessageRef.current = message.trim() ? `${message.trim()} ` : "";
    }
    // A brand new engine session starts its own result list back at
    // empty, regardless of what the previous session (if any) reported.
    currentSessionFinalRef.current = "";

    recognition.onresult = (event) => {
      let sessionFinal = "";
      let interimTranscript = "";
      // Read the full result list from index 0 every time — this is
      // always "everything finalized in this session so far", used only
      // to update the live preview below. It's deliberately never diffed
      // against a previous snapshot or incrementally appended anywhere —
      // mobile engines can report inconsistent/non-monotonic growth
      // between events (retranscribing, shifting word boundaries), and
      // diffing that turned out to just move a duplication bug around
      // instead of fixing it. This value only gets committed once, in
      // onend below, when the session's transcript is actually settled.
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          sessionFinal += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      currentSessionFinalRef.current = sessionFinal;

      const combined = `${baseMessageRef.current}${sessionFinal}${
        sessionFinal && interimTranscript ? " " : ""
      }${interimTranscript}`.trimStart();
      if (combined.length <= MAX_CHARS) {
        setMessage(combined);
        handleTyping();
      }
    };

    recognition.onerror = (event) => {
      // A pause in speech (or a benign abort from restarting/editing)
      // isn't a real error — it shouldn't stop dictation.
      if (event.error === "no-speech" || event.error === "aborted") return;
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      // Commit this session's finalized transcript into the base exactly
      // once, now that the session has actually ended — the one point
      // where the engine's transcript is trusted as settled, rather than
      // trying to reconcile it against intermediate events.
      if (currentSessionFinalRef.current) {
        baseMessageRef.current = `${baseMessageRef.current}${currentSessionFinalRef.current} `;
        currentSessionFinalRef.current = "";
      }

      if (shouldKeepListeningRef.current) {
        // The user hasn't tapped the mic to stop, so the engine ending
        // the session (which happens after basically every pause) isn't
        // a real stop — restart a fresh one on top of the now-committed
        // base. Deliberately NOT synchronous: calling start() again in
        // the same tick as onend is a well-known race that throws
        // "InvalidStateError" on many browsers, since the engine hasn't
        // fully released the previous session yet — a short delay avoids it.
        restartTimeoutRef.current = setTimeout(() => {
          if (shouldKeepListeningRef.current) {
            startSessionRef.current(true);
          }
        }, 250);
        return;
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      // start() can throw synchronously (e.g. that same restart race, or
      // the mic already being in use) — fail safe instead of leaving
      // isListening stuck true with no engine actually running.
      shouldKeepListeningRef.current = false;
      setIsListening(false);
    }
  };

  const startListening = useCallback(() => {
    if (disabled || isListening) return;
    shouldKeepListeningRef.current = true;
    startSessionRef.current(false);
  }, [disabled, isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      // Prevent onend's auto-restart from firing during/after unmount.
      shouldKeepListeningRef.current = false;
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
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

      if (isListening) {
        // The active session's pending transcript (not yet committed —
        // see onend) reflects the pre-edit text. Discard it so it can't
        // get appended on top of the edit later, and force a clean
        // restart so the engine starts fresh from what's actually in the
        // box now instead of continuing to build on stale context.
        currentSessionFinalRef.current = "";
        recognitionRef.current?.abort();
      }
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
    }
  };

  // Auto-grow the textarea whenever the message text itself changes —
  // keyed on state rather than the textarea's DOM `input` event, since
  // dictation (speech-to-text) sets the text via setMessage/React state
  // and never fires a real `input` event, which used to leave the box
  // stuck at one line no matter how much you dictated.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [message]);

  const charCount = message.length;
  const isOverLimit = charCount > MAX_CHARS;
  const hasText = message.trim().length > 0;

  return (
    <div className="border-t border-purple-100 bg-white px-3 sm:px-4 py-3 flex-shrink-0 safe-bottom">
      <div className="max-w-3xl mx-auto flex items-end gap-1.5 sm:gap-2">
        {/* Language: standalone circular button, badge shows the current code */}
        <div className="relative flex-shrink-0">
          <div
            className="pointer-events-none flex items-center justify-center w-11 h-11 rounded-full text-white shadow-sm"
            style={{ background: "var(--own-gradient)" }}
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
          </div>
          <span className="pointer-events-none absolute -top-1 -right-1 text-[9px] font-bold text-purple-600 bg-white border border-purple-200 rounded-full px-1 py-px leading-tight shadow-sm">
            {language.toUpperCase()}
          </span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageType)}
            disabled={disabled}
            aria-label="Reply language"
            title="Reply language"
            className="absolute inset-0 w-11 h-11 rounded-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Voice input: standalone circular button */}
        {speechSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full text-white shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
              isListening ? "animate-thinking-glow" : "hover:opacity-90"
            }`}
            style={{ background: "var(--own-gradient)" }}
            aria-pressed={isListening}
            aria-label={
              isListening
                ? "Stop voice input"
                : `Speak in ${
                    LANGUAGE_OPTIONS.find((o) => o.value === language)?.label ??
                    "selected language"
                  }`
            }
            title={isListening ? "Stop voice input" : "Voice input"}
          >
            {isListening ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
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

        {/* Text box: its own standalone pill, no longer sharing a border with the buttons */}
        <div className="min-w-0 flex-1 flex items-center bg-gray-50 rounded-3xl border border-gray-200 focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            disabled={disabled}
            className="w-full resize-none overflow-y-auto bg-transparent px-4 py-2.5 text-base sm:text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400"
            rows={1}
            maxLength={MAX_CHARS + 100}
          />
        </div>

        {/* Send: standalone circular button */}
        <button
          onClick={handleSend}
          disabled={disabled || isSending || !hasText || isOverLimit}
          className={`flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
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
      <div className="max-w-3xl mx-auto mt-1.5 flex justify-end px-1">
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
  );
}
