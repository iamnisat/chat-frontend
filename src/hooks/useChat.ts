import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMessages } from "../api";
import { useSocketContext } from "../context/SocketContext";
import type { LoginType, MessageResponse, SendMessagePayload } from "../types";
import type { MessageStreamPayload } from "../context/SocketContext";

function normalizeHistoricalMessage(
  raw: Record<string, unknown>,
  currentUserId: string,
  currentUserType: LoginType,
): MessageResponse {
  const senderType = (
    (raw.sender_type as string) ??
    (raw.senderType as string) ??
    (raw.role as string) ??
    (raw.from as string) ??
    ""
  ).toLowerCase();

  const senderId =
    raw.sender_id ??
    raw.senderId ??
    raw.user_id ??
    raw.userId ??
    raw.farmer_id ??
    raw.farmerId ??
    null;

  const rawFarmerId =
    raw.farmer_id ??
    raw.farmerId ??
    (senderType === "farmer" ? senderId : null);
  const rawUserId =
    raw.user_id ?? raw.userId ?? (senderType === "user" ? senderId : null);

  const farmerId = rawFarmerId != null ? String(rawFarmerId) : null;
  const userId = rawUserId != null ? Number(rawUserId) : null;

  const senderName =
    (raw.sender_name as string) ??
    (raw.senderName as string) ??
    (raw.name as string) ??
    "";

  const isAiMessage =
    senderType === "ai_agent" ||
    senderType === "ai" ||
    senderType === "assistant" ||
    senderType === "agent" ||
    senderName.toLowerCase().includes("aunkur ai") ||
    senderName.toLowerCase().includes("ai");

  let resolvedSenderType: "farmer" | "user" | "ai_agent";
  if (isAiMessage) {
    resolvedSenderType = "ai_agent";
  } else if (senderType === "farmer" || senderType === "user") {
    resolvedSenderType = senderType as "farmer" | "user";
  } else if (currentUserType === "farmer" && farmerId === currentUserId) {
    resolvedSenderType = "farmer";
  } else if (
    currentUserType === "user" &&
    userId != null &&
    String(userId) === currentUserId
  ) {
    resolvedSenderType = "user";
  } else {
    resolvedSenderType = "ai_agent";
  }

  const isOwn =
    !isAiMessage &&
    ((currentUserType === "farmer" && farmerId === currentUserId) ||
      (currentUserType === "user" &&
        userId != null &&
        String(userId) === currentUserId));

  const normalizedFarmerId =
    isOwn && currentUserType === "farmer" ? currentUserId : farmerId;
  const normalizedUserId =
    isOwn && currentUserType === "user"
      ? currentUserId != null
        ? Number(currentUserId)
        : null
      : userId;

  const resolvedSenderName =
    senderName ||
    (resolvedSenderType === "ai_agent"
      ? "Aunkur AI"
      : resolvedSenderType === "farmer"
        ? (normalizedFarmerId?.split("_")[0] ?? "Farmer")
        : `User ${normalizedUserId ?? "unknown"}`);

  const message: MessageResponse = {
    id: String(
      raw.id ?? `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ),
    thread_module_id: (raw.thread_module_id as number) ?? 0,
    message: ((raw.message as string) ??
      (raw.text as string) ??
      (raw.content as string) ??
      "") as string,
    user_id: normalizedUserId,
    farmer_id: normalizedFarmerId,
    sender_type: resolvedSenderType,
    sender_name: resolvedSenderName,
    created_at: ((raw.created_at as string) ??
      (raw.createdAt as string) ??
      new Date().toISOString()) as string,
  };

  return message;
}

export function useChat(
  threadModuleId: number | null,
  currentUserId?: string,
  currentUserType?: LoginType,
  token?: string,
) {
  const { socket, isConnected, subscribeMessageStream } = useSocketContext();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const [hasMorePages, setHasMorePages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  const typingSafetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMore = useCallback(() => {
    if (!token || !threadModuleId || isLoadingMoreRef.current || !hasMorePages)
      return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    const container = document.querySelector(".chat-scroll-container");
    const prevScrollHeight = container?.scrollHeight ?? 0;

    fetchMessages(token, threadModuleId, nextPage).then((json) => {
      if (json.success && json.data) {
        const normalized: MessageResponse[] = json.data?.messages?.map(
          (msg: Record<string, unknown>) => {
            const senderType = msg.user ? "ai_agent" : "farmer";
            const senderUser = msg.user as {
              id: number;
              name: string;
              images?: string;
            } | null;
            const senderFarmer = msg.farmer as {
              id: number;
              name: string;
              base_image?: string;
            } | null;

            return {
              id: String(
                msg.id ??
                  `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              ),
              thread_module_id: threadModuleId,
              message: (msg.message as string) ?? "",
              user_id: senderUser?.id ?? null,
              farmer_id: senderFarmer ? String(senderFarmer.id) : null,
              sender_type: senderType as "ai_agent" | "farmer",
              sender_name: senderUser?.name ?? senderFarmer?.name ?? "Unknown",
              created_at: msg.createdAt
                ? new Date(msg.createdAt as number).toISOString()
                : new Date().toISOString(),
              images: (msg.images as string[]) ?? [],
              user: senderUser,
              farmer: senderFarmer,
            };
          },
        );

        pageRef.current = nextPage;
        setHasMorePages(json.paginatorInfo?.hasMorePages ?? false);
        setMessages((prev) => [...normalized, ...prev]);

        requestAnimationFrame(() => {
          const newScrollHeight = container?.scrollHeight ?? 0;
          if (container) {
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    });
  }, [token, threadModuleId, hasMorePages]);

  useEffect(() => {
    if (!threadModuleId) {
      setMessages([]);
      setIsLoadingInitial(false);
      return;
    }

    let ignore = false;
    setMessages([]);
    setIsLoadingInitial(true);

    if (token) {
      fetchMessages(token, threadModuleId).then((json) => {
        if (ignore) return;
        if (json.success && json.data) {
          const normalized: MessageResponse[] = json.data?.messages?.map(
            (msg: Record<string, unknown>) => {
              const senderType = msg.user ? "ai_agent" : "farmer";
              const senderUser = msg.user as {
                id: number;
                name: string;
                images?: string;
              } | null;
              const senderFarmer = msg.farmer as {
                id: number;
                name: string;
                base_image?: string;
              } | null;

              return {
                id: String(
                  msg.id ??
                    `hist_${Date.now()}_${Math.random()
                      .toString(36)
                      .slice(2, 8)}`,
                ),
                thread_module_id: threadModuleId,
                message: (msg.message as string) ?? "",
                user_id: senderUser?.id ?? null,
                farmer_id: senderFarmer ? String(senderFarmer.id) : null,
                sender_type: senderType as "ai_agent" | "farmer",
                sender_name:
                  senderUser?.name ?? senderFarmer?.name ?? "Unknown",
                created_at: msg.createdAt
                  ? new Date(msg.createdAt as number).toISOString()
                  : new Date().toISOString(),
                images: (msg.images as string[]) ?? [],
                user: senderUser,
                farmer: senderFarmer,
              };
            },
          );
          pageRef.current = 1;
          setHasMorePages(json.paginatorInfo?.hasMorePages ?? false);
          setMessages(normalized);
          setTimeout(scrollToBottom, 50);
        }
        setIsLoadingInitial(false);
      });
    } else if (socket) {
      socket.emit(
        "message:history",
        { thread_module_id: threadModuleId },
        (response: {
          success: boolean;
          data?: MessageResponse[];
          message?: string;
        }) => {
          if (ignore) return;
          if (response.success && response.data) {
            const normalized =
              currentUserId != null && currentUserType != null
                ? response.data.map((msg) =>
                    normalizeHistoricalMessage(
                      msg as unknown as Record<string, unknown>,
                      currentUserId,
                      currentUserType,
                    ),
                  )
                : response.data;
            setMessages(normalized);
            setTimeout(scrollToBottom, 50);
          }
          setIsLoadingInitial(false);
        },
      );
    } else {
      setIsLoadingInitial(false);
    }

    if (!socket)
      return () => {
        ignore = true;
      };

    let unsubscribeStream: (() => void) | null = null;
    if (subscribeMessageStream) {
      const handleStream = (data: MessageStreamPayload) => {
        if (data.thread_module_id !== threadModuleId) return;

        const messageId = String(
          data.stream_data?.message_id ??
            data.stream_data?.messageId ??
            data.stream_data?.id ??
            data.stream_data?.client_id ??
            `stream_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        );

        setMessages((prev) => {
          const stream = data.stream_data;
          const eventType = (stream?.type ?? data.type ?? "") as string;
          const streamStatus = stream?.status ?? data.status ?? null;

          // Helper to detect 'done' statuses
          const isDone =
            streamStatus === "done" ||
            streamStatus === "complete" ||
            streamStatus === "finished" ||
            eventType === "done" ||
            data.type === "done";
          let incoming =
            (stream?.content as string) ?? (data.content as string) ?? "";
          if (eventType === "token" && incoming.startsWith(" ")) {
            const SHORT_LEADING_SPACE_THRESHOLD = 3;
            if (incoming.length <= SHORT_LEADING_SPACE_THRESHOLD) {
              incoming = incoming.trimStart();
            }
          }
          if (eventType === "thinking") {
            const thinkingId = `${messageId}_thinking`;
            const idxThinking = prev.findIndex((m) => m.id === thinkingId);
            const thinkingMsg: MessageResponse = {
              id: thinkingId,
              thread_module_id: threadModuleId!,
              message: incoming,
              user_id:
                data.user_id != null ? Number(data.user_id as any) : null,
              farmer_id: data.farmer_id != null ? String(data.farmer_id) : null,
              sender_type: (data.sender_type as any) ?? "ai_agent",
              sender_name: data.sender_name ?? "Aunkur AI",
              created_at: new Date().toISOString(),
              streaming: false,
            };

            if (idxThinking === -1) {
              // Remove any previous thinking messages (keep only one)
              const withoutThinking = prev.filter(
                (m) => !String(m.id).endsWith("_thinking"),
              );
              return [...withoutThinking, thinkingMsg];
            }

            const copy = prev.slice();
            copy[idxThinking] = thinkingMsg;
            return copy;
          }

          if (isDone) {
            const finalHtml = (data as any).answer ?? incoming ?? "";
            const hasContent =
              String(finalHtml)
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .trim().length > 0;

            if (!hasContent) {
              return prev.filter(
                (m) => !m.streaming && !String(m.id).endsWith("_thinking"),
              );
            }

            const finalizedMsg: MessageResponse = {
              id: messageId,
              thread_module_id: threadModuleId!,
              message: finalHtml,
              user_id:
                data.user_id != null ? Number(data.user_id as any) : null,
              farmer_id: data.farmer_id != null ? String(data.farmer_id) : null,
              sender_type: (data.sender_type as any) ?? "ai_agent",
              sender_name: data.sender_name ?? "Aunkur AI",
              created_at: new Date().toISOString(),
              streaming: false,
            };
            const filtered = prev.filter(
              (m) => !m.streaming && !String(m.id).endsWith("_thinking"),
            );
            return [...filtered, finalizedMsg];
          }

          if (
            eventType === "token" ||
            eventType === "content" ||
            eventType === "status"
          ) {
            const withoutThinking = prev.filter(
              (m) => !String(m.id).endsWith("_thinking"),
            );

            const streamingIndex = withoutThinking.findIndex(
              (m) => m.streaming && m.thread_module_id === threadModuleId,
            );

            if (streamingIndex === -1) {
              const newMsg: MessageResponse = {
                id: messageId,
                thread_module_id: threadModuleId!,
                message: incoming,
                user_id:
                  data.user_id != null ? Number(data.user_id as any) : null,
                farmer_id:
                  data.farmer_id != null ? String(data.farmer_id) : null,
                sender_type: (data.sender_type as any) ?? "ai_agent",
                sender_name: data.sender_name ?? "Aunkur AI",
                created_at: new Date().toISOString(),
                streaming: true,
              };
              const filtered = withoutThinking.filter((m) => !m.streaming);
              return [...filtered, newMsg];
            }
            const copy = withoutThinking.slice();
            const existing = copy[streamingIndex];
            copy[streamingIndex] = {
              ...existing,
              message: existing.message + incoming,
              streaming: true,
            };
            return copy;
          }

          return prev;
        });

        if (
          data.status === "done" ||
          data.status === "complete" ||
          data.status === "finished" ||
          data.type === "done" ||
          data.stream_data?.type === "done"
        ) {
          if (typingSafetyTimeoutRef.current) {
            clearTimeout(typingSafetyTimeoutRef.current);
            typingSafetyTimeoutRef.current = null;
          }
          setIsTyping(false);
          setTypingUser("");
        } else {
          setIsTyping(true);
          setTypingUser(data.sender_name ?? "AI");
        }
      };

      unsubscribeStream = subscribeMessageStream(handleStream);
    }

    const handleNewMessage = (message: MessageResponse) => {
      if (message.thread_module_id === threadModuleId) {
        const messageText = String(message.message ?? "");
        const hasContent =
          messageText
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim().length > 0;

        if (!hasContent) {
          return;
        }

        setMessages((prev) => {
          const messageId = String(message.id);
          if (prev.some((m) => m.id === messageId)) {
            return prev;
          }

          const raw = message as unknown as Record<string, unknown>;
          const senderType = (
            (raw.sender_type as string) ??
            (raw.senderType as string) ??
            (raw.role as string) ??
            ""
          ).toLowerCase();

          const isAiMessage =
            senderType === "ai_agent" ||
            senderType === "ai" ||
            senderType === "assistant" ||
            senderType === "agent";

          let resolvedSenderType: "farmer" | "user" | "ai_agent";
          if (isAiMessage) {
            resolvedSenderType = "ai_agent";
          } else if (senderType === "farmer" || senderType === "user") {
            resolvedSenderType = senderType as "farmer" | "user";
          } else if (currentUserType === "farmer") {
            resolvedSenderType = "farmer";
          } else {
            resolvedSenderType = "user";
          }

          const rawFarmerId =
            raw.farmer_id ??
            raw.farmerId ??
            (resolvedSenderType === "farmer"
              ? (raw.sender_id ?? raw.senderId)
              : null);
          const rawUserId =
            raw.user_id ??
            raw.userId ??
            (resolvedSenderType === "user"
              ? (raw.sender_id ?? raw.senderId)
              : null);

          const normalizedFarmerId =
            resolvedSenderType === "farmer" &&
            currentUserType === "farmer" &&
            currentUserId
              ? currentUserId
              : rawFarmerId != null
                ? String(rawFarmerId)
                : null;
          const normalizedUserId =
            resolvedSenderType === "user" &&
            currentUserType === "user" &&
            currentUserId
              ? Number(currentUserId)
              : rawUserId != null
                ? Number(rawUserId)
                : null;

          const senderName =
            (raw.sender_name as string) ??
            (raw.senderName as string) ??
            (raw.name as string) ??
            (resolvedSenderType === "ai_agent" ? "Aunkur AI" : "Farmer");

          const rawCreatedAt = raw.created_at ?? raw.createdAt;
          const createdAt =
            typeof rawCreatedAt === "number"
              ? new Date(rawCreatedAt).toISOString()
              : typeof rawCreatedAt === "string"
                ? rawCreatedAt
                : new Date().toISOString();

          const finalizedMsg: MessageResponse = {
            ...message,
            id: messageId,
            sender_type: resolvedSenderType,
            sender_name: senderName,
            farmer_id: normalizedFarmerId,
            user_id: normalizedUserId,
            created_at: createdAt,
          };

          const streamingIndex = prev.findIndex(
            (m) => m.streaming && m.thread_module_id === threadModuleId,
          );

          if (streamingIndex !== -1) {
            const copy = prev.slice();
            copy[streamingIndex] = finalizedMsg;
            return copy;
          }

          return [...prev, finalizedMsg];
        });

        const raw = message as unknown as Record<string, unknown>;
        const senderType = (
          (raw.sender_type as string) ??
          (raw.senderType as string) ??
          (raw.role as string) ??
          ""
        ).toLowerCase();
        if (
          senderType === "ai_agent" ||
          senderType === "ai" ||
          senderType === "assistant" ||
          senderType === "agent"
        ) {
          if (typingSafetyTimeoutRef.current) {
            clearTimeout(typingSafetyTimeoutRef.current);
            typingSafetyTimeoutRef.current = null;
          }
          setIsTyping(false);
          setTypingUser("");
        }
      }
    };

    const handleTypingStart = (data: {
      thread_module_id: number;
      sender_type?: string;
      sender_name?: string;
    }) => {
      if (
        data.thread_module_id === threadModuleId &&
        data.sender_type === "ai_agent"
      ) {
        if (typingSafetyTimeoutRef.current) {
          clearTimeout(typingSafetyTimeoutRef.current);
          typingSafetyTimeoutRef.current = null;
        }
        setIsTyping(true);
        setTypingUser(data.sender_name || "AI");
      }
    };

    const handleTypingStop = (data: { thread_module_id: number }) => {
      if (data.thread_module_id !== threadModuleId) return;
      if (typingSafetyTimeoutRef.current) {
        clearTimeout(typingSafetyTimeoutRef.current);
      }
      typingSafetyTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        setTypingUser("");
        typingSafetyTimeoutRef.current = null;
      }, 15000);
    };

    const handleMessageSeen = (data: { thread_module_id: number }) => {
      if (data.thread_module_id === threadModuleId) {
        console.log("Messages seen in thread:", data.thread_module_id);
      }
    };

    const handleMessageUpdated = (data: {
      thread_module_id: number;
      message_id: string;
      message: string;
    }) => {
      if (data.thread_module_id === threadModuleId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.message_id
              ? { ...msg, message: data.message }
              : msg,
          ),
        );
      }
    };

    const handleMessageDeleted = (data: {
      thread_module_id: number;
      message_id: string;
    }) => {
      if (data.thread_module_id === threadModuleId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    socket.on("message:seen", handleMessageSeen);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);

    return () => {
      if (unsubscribeStream) unsubscribeStream();
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:seen", handleMessageSeen);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      if (typingSafetyTimeoutRef.current) {
        clearTimeout(typingSafetyTimeoutRef.current);
        typingSafetyTimeoutRef.current = null;
      }
      ignore = true;
    };
  }, [
    socket,
    threadModuleId,
    currentUserId,
    currentUserType,
    token,
    subscribeMessageStream,
  ]);

  const sendMessage = useCallback(
    (
      payload: Omit<SendMessagePayload, "thread_module_id"> & {
        thread_module_id?: number;
      },
    ) => {
      if (!socket || !isConnected || !threadModuleId) return;

      const fullPayload: SendMessagePayload = {
        ...payload,
        thread_module_id: payload.thread_module_id ?? threadModuleId,
      };

      setIsSending(true);
      socket.emit(
        "message:send",
        fullPayload,
        (response: {
          success: boolean;
          message?: string;
          data?: MessageResponse;
        }) => {
          setIsSending(false);
          if (!response.success) {
            console.error("Failed to send message:", response.message);
          }
        },
      );
    },
    [socket, isConnected, threadModuleId],
  );

  const markSeen = useCallback(() => {
    if (!socket || !isConnected || !threadModuleId) return;
    socket.emit("message:seen", { thread_module_id: threadModuleId });
  }, [socket, isConnected, threadModuleId]);

  const emitTypingStart = useCallback(
    (senderName: string, userId?: number, farmerId?: string) => {
      if (!socket || !isConnected || !threadModuleId) return;
      socket.emit("typing:start", {
        thread_module_id: threadModuleId,
        sender_name: senderName,
        user_id: userId,
        farmer_id: farmerId,
      });
    },
    [socket, isConnected, threadModuleId],
  );

  const emitTypingStop = useCallback(
    (userId?: number, farmerId?: string) => {
      if (!socket || !isConnected || !threadModuleId) return;
      socket.emit("typing:stop", {
        thread_module_id: threadModuleId,
        user_id: userId,
        farmer_id: farmerId,
      });
    },
    [socket, isConnected, threadModuleId],
  );

  return {
    messages,
    isTyping,
    typingUser,
    hasMorePages,
    isLoadingMore,
    isLoadingInitial,
    isSending,
    sendMessage,
    markSeen,
    emitTypingStart,
    emitTypingStop,
    loadMore,
    messagesEndRef,
  };
}
