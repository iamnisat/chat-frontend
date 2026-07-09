import { useState, useEffect, useCallback, useRef } from "react";
import { useSocketContext } from "../context/SocketContext";
import { fetchMessages } from "../api";
import type { MessageResponse, SendMessagePayload, LoginType } from "../types";

function normalizeHistoricalMessage(
  raw: Record<string, unknown>,
  currentUserId: string,
  currentUserType: LoginType
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
    raw.user_id ??
    raw.userId ??
    (senderType === "user" ? senderId : null);

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
  } else if (currentUserType === "user" && userId != null && String(userId) === currentUserId) {
    resolvedSenderType = "user";
  } else {
    resolvedSenderType = "ai_agent";
  }

  const isOwn =
    !isAiMessage &&
    ((currentUserType === "farmer" && farmerId === currentUserId) ||
      (currentUserType === "user" && userId != null && String(userId) === currentUserId));

  const normalizedFarmerId = isOwn && currentUserType === "farmer" ? currentUserId : farmerId;
  const normalizedUserId = isOwn && currentUserType === "user" ? (currentUserId != null ? Number(currentUserId) : null) : userId;

  const resolvedSenderName =
    senderName ||
    (resolvedSenderType === "ai_agent"
      ? "Aunkur AI"
      : resolvedSenderType === "farmer"
      ? (normalizedFarmerId?.split("_")[0] ?? "Farmer")
      : `User ${normalizedUserId ?? "unknown"}`);

  const message: MessageResponse = {
    id: (raw.id as string) ?? `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    thread_module_id: (raw.thread_module_id as number) ?? 0,
    message: ((raw.message as string) ?? (raw.text as string) ?? (raw.content as string) ?? "") as string,
    user_id: normalizedUserId,
    farmer_id: normalizedFarmerId,
    sender_type: resolvedSenderType,
    sender_name: resolvedSenderName,
    created_at: ((raw.created_at as string) ?? (raw.createdAt as string) ?? new Date().toISOString()) as string,
  };

  console.log(
    "[History] Normalized message =>",
    `id: ${message.id}`,
    `senderType: ${message.sender_type}`,
    `farmerId: ${message.farmer_id}`,
    `userId: ${message.user_id}`,
    `senderName: ${message.sender_name}`,
    `isOwn: ${isOwn}`,
    `text: ${message.message.substring(0, 50)}`
  );

  return message;
}

export function useChat(threadModuleId: number | null, currentUserId?: string, currentUserType?: LoginType, token?: string) {
  const { socket, isConnected } = useSocketContext();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const [hasMorePages, setHasMorePages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadMore = useCallback(() => {
    if (!token || !threadModuleId || isLoadingMoreRef.current || !hasMorePages) return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    const container = document.querySelector(".chat-scroll-container");
    const prevScrollHeight = container?.scrollHeight ?? 0;

    fetchMessages(token, threadModuleId, nextPage).then((json) => {
      if (json.success && json.data) {
        const normalized: MessageResponse[] = json.data.map((msg: Record<string, unknown>) => {
          const senderType = msg.user ? "ai_agent" : "farmer";
          const senderUser = msg.user as { id: number; name: string; images?: string } | null;
          const senderFarmer = msg.farmer as { id: number; name: string; base_image?: string } | null;

          return {
            id: String(msg.id ?? `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
            thread_module_id: threadModuleId,
            message: (msg.message as string) ?? "",
            user_id: senderUser?.id ?? null,
            farmer_id: senderFarmer ? String(senderFarmer.id) : null,
            sender_type: senderType as "ai_agent" | "farmer",
            sender_name: senderUser?.name ?? senderFarmer?.name ?? "Unknown",
            created_at: msg.createdAt ? new Date(msg.createdAt as number).toISOString() : new Date().toISOString(),
            images: (msg.images as string[]) ?? [],
            user: senderUser,
            farmer: senderFarmer,
          };
        });

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
      return;
    }

    setMessages([]);

    if (token) {
      fetchMessages(token, threadModuleId).then((json) => {
        if (json.success && json.data) {
          const normalized: MessageResponse[] = json.data.map((msg: Record<string, unknown>) => {
            const senderType = msg.user ? "ai_agent" : "farmer";
            const senderUser = msg.user as { id: number; name: string; images?: string } | null;
            const senderFarmer = msg.farmer as { id: number; name: string; base_image?: string } | null;

            return {
              id: String(msg.id ?? `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
              thread_module_id: threadModuleId,
              message: (msg.message as string) ?? "",
              user_id: senderUser?.id ?? null,
              farmer_id: senderFarmer ? String(senderFarmer.id) : null,
              sender_type: senderType as "ai_agent" | "farmer",
              sender_name: senderUser?.name ?? senderFarmer?.name ?? "Unknown",
              created_at: msg.createdAt ? new Date(msg.createdAt as number).toISOString() : new Date().toISOString(),
              images: (msg.images as string[]) ?? [],
              user: senderUser,
              farmer: senderFarmer,
            };
          });
          pageRef.current = 1;
          setHasMorePages(json.paginatorInfo?.hasMorePages ?? false);
          setMessages(normalized);
          setTimeout(scrollToBottom, 50);
        }
      });
    } else if (socket) {
      socket.emit("message:history", { thread_module_id: threadModuleId }, (response: { success: boolean; data?: MessageResponse[]; message?: string }) => {
        if (response.success && response.data) {
          const normalized = currentUserId != null && currentUserType != null
            ? response.data.map((msg) =>
                normalizeHistoricalMessage(msg as unknown as Record<string, unknown>, currentUserId, currentUserType)
              )
            : response.data;
          setMessages(normalized);
          setTimeout(scrollToBottom, 50);
        }
      });
    }

    if (!socket) return () => {};

    const handleNewMessage = (message: MessageResponse) => {
      if (message.thread_module_id === threadModuleId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) {
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
            (resolvedSenderType === "farmer" ? (raw.sender_id ?? raw.senderId) : null);
          const rawUserId =
            raw.user_id ??
            raw.userId ??
            (resolvedSenderType === "user" ? (raw.sender_id ?? raw.senderId) : null);

          const normalizedFarmerId = resolvedSenderType === "farmer" && currentUserType === "farmer" && currentUserId
            ? currentUserId
            : rawFarmerId != null ? String(rawFarmerId) : null;
          const normalizedUserId = resolvedSenderType === "user" && currentUserType === "user" && currentUserId
            ? Number(currentUserId)
            : rawUserId != null ? Number(rawUserId) : null;

          const senderName =
            (raw.sender_name as string) ??
            (raw.senderName as string) ??
            (raw.name as string) ??
            (resolvedSenderType === "ai_agent" ? "Aunkur AI" : "Farmer");

          const rawCreatedAt = raw.created_at ?? raw.createdAt;
          const createdAt = typeof rawCreatedAt === "number"
            ? new Date(rawCreatedAt).toISOString()
            : typeof rawCreatedAt === "string"
            ? rawCreatedAt
            : new Date().toISOString();

          return [...prev, {
            ...message,
            sender_type: resolvedSenderType,
            sender_name: senderName,
            farmer_id: normalizedFarmerId,
            user_id: normalizedUserId,
            created_at: createdAt,
          }];
        });
      }
    };

    const handleTypingStart = (data: { thread_module_id: number; sender_type?: string; sender_name?: string }) => {
      if (data.thread_module_id === threadModuleId && data.sender_type === "ai_agent") {
        setIsTyping(true);
        setTypingUser(data.sender_name || "AI");
      }
    };

    const handleTypingStop = (data: { thread_module_id: number }) => {
      if (data.thread_module_id === threadModuleId) {
        setIsTyping(false);
        setTypingUser("");
      }
    };

    const handleMessageSeen = (data: { thread_module_id: number }) => {
      if (data.thread_module_id === threadModuleId) {
        console.log("Messages seen in thread:", data.thread_module_id);
      }
    };

    const handleMessageUpdated = (data: { thread_module_id: number; message_id: string; message: string }) => {
      if (data.thread_module_id === threadModuleId) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === data.message_id ? { ...msg, message: data.message } : msg))
        );
      }
    };

    const handleMessageDeleted = (data: { thread_module_id: number; message_id: string }) => {
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
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      socket.off("message:seen", handleMessageSeen);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
    };
  }, [socket, threadModuleId, currentUserId, currentUserType, token]);

  const sendMessage = useCallback(
    (payload: Omit<SendMessagePayload, "thread_module_id"> & { thread_module_id?: number }) => {
      if (!socket || !isConnected || !threadModuleId) return;

      const fullPayload: SendMessagePayload = {
        ...payload,
        thread_module_id: payload.thread_module_id ?? threadModuleId,
      };

      socket.emit("message:send", fullPayload, (response: { success: boolean; message?: string; data?: MessageResponse }) => {
        if (!response.success) {
          console.error("Failed to send message:", response.message);
        }
      });
    },
    [socket, isConnected, threadModuleId]
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
    [socket, isConnected, threadModuleId]
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
    [socket, isConnected, threadModuleId]
  );

  return {
    messages,
    isTyping,
    typingUser,
    hasMorePages,
    isLoadingMore,
    sendMessage,
    markSeen,
    emitTypingStart,
    emitTypingStop,
    loadMore,
    messagesEndRef,
  };
}
