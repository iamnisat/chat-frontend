import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import type { UserPayload } from "../types";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  isReconnecting: boolean;
  socketId: string | null;
  joinUser: (payload: UserPayload) => Promise<boolean>;
  joinThread: (threadModuleId: number) => Promise<boolean>;
  leaveThread: (threadModuleId: number) => Promise<boolean>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

export function SocketProvider({ children, userPayload }: { children: ReactNode; userPayload?: UserPayload }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userPayloadRef = useRef(userPayload);
  userPayloadRef.current = userPayload;

  useEffect(() => {
    console.log("[Socket] Connecting to:", SOCKET_URL + "/chat");

    const IS_DEV = import.meta.env.VITE_APP_ENV !== "production";
    console.log("[Socket] Connecting to:", SOCKET_URL + "/chat", "| transport:", IS_DEV ? "polling" : "websocket+polling");

    const newSocket = io(SOCKET_URL + "/chat", {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("[Socket] Connected, id:", newSocket.id);
      setIsConnected(true);
      setIsReconnecting(false);
      setSocketId(newSocket.id || null);

      const payload = userPayloadRef.current;
      if (payload) {
        newSocket.emit("user:join", payload, (response: { success: boolean; message?: string }) => {
          console.log("[Socket] user:join response:", response);
        });
      }
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
      setSocketId(null);
    });

    newSocket.on("reconnect_attempt", (attempt) => {
      console.log("[Socket] Reconnect attempt:", attempt);
      setIsReconnecting(true);
      setIsConnected(false);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected after", attempt, "attempts");
      setIsConnected(true);
      setIsReconnecting(false);
      setSocketId(newSocket.id || null);

      const payload = userPayloadRef.current;
      if (payload) {
        newSocket.emit("user:join", payload);
      }
    });

    newSocket.on("reconnect_failed", () => {
      console.log("[Socket] Reconnect failed");
      setIsReconnecting(false);
      setIsConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("[Socket] Connection error:", err.message);
    });

    return () => {
      console.log("[Socket] Cleaning up");
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinUser = (payload: UserPayload): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false);
        return;
      }
      socketRef.current.emit("user:join", payload, (response: { success: boolean; message?: string }) => {
        resolve(response.success);
      });
    });
  };

  const joinThread = (threadModuleId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false);
        return;
      }
      socketRef.current.emit("thread:join", { thread_module_id: threadModuleId }, (response: { success: boolean; message?: string }) => {
        resolve(response.success);
      });
    });
  };

  const leaveThread = (threadModuleId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve(false);
        return;
      }
      socketRef.current.emit("thread:leave", { thread_module_id: threadModuleId }, (response: { success: boolean; message?: string }) => {
        resolve(response.success);
      });
    });
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting, socketId, joinUser, joinThread, leaveThread }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocketContext must be used within a SocketProvider");
  }
  return context;
}
