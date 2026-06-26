import { useState, useEffect, useCallback, useRef } from "react";
import { useSocketContext } from "../context/SocketContext";
import type { MessageResponse, SendMessagePayload } from "../types";

export function useChat(threadModuleId: number | null) {
  const { socket, isConnected } = useSocketContext();
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!socket || !threadModuleId) return;

    const handleNewMessage = (message: MessageResponse) => {
      if (message.thread_module_id === threadModuleId) {
        setMessages((prev) => [...prev, message]);
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
  }, [socket, threadModuleId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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
    (senderName: string, userId?: number, farmerId?: number) => {
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
    (userId?: number, farmerId?: number) => {
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
    sendMessage,
    markSeen,
    emitTypingStart,
    emitTypingStop,
    messagesEndRef,
  };
}
