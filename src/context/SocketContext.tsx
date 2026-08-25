// import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from "react";
// import { io, type Socket } from "socket.io-client";
// import type { UserPayload, ThreadModule } from "../types";

// interface SocketContextType {
//   socket: Socket | null;
//   isConnected: boolean;
//   isReconnecting: boolean;
//   socketId: string | null;
//   joinUser: (payload: UserPayload) => Promise<boolean>;
//   joinThread: (threadModuleId: number) => Promise<boolean>;
//   leaveThread: (threadModuleId: number) => Promise<boolean>;
//   createThread: (name: string) => Promise<{ success: boolean; data?: ThreadModule; message?: string }>;
//   deleteThread: (threadModuleId: number) => Promise<{ success: boolean; message?: string }>;
//   listThreads: () => Promise<{ success: boolean; data?: ThreadModule[]; message?: string }>;
// }

// const SocketContext = createContext<SocketContextType | undefined>(undefined);

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

// export function SocketProvider({ children, userPayload }: { children: ReactNode; userPayload?: UserPayload }) {
//   const [socket, setSocket] = useState<Socket | null>(null);
//   const [isConnected, setIsConnected] = useState(false);
//   const [isReconnecting, setIsReconnecting] = useState(false);
//   const [socketId, setSocketId] = useState<string | null>(null);
//   const socketRef = useRef<Socket | null>(null);
//   const userPayloadRef = useRef(userPayload);
//   userPayloadRef.current = userPayload;

//   useEffect(() => {
//     console.log("[Socket] Connecting to:", SOCKET_URL);

//     const IS_DEV = import.meta.env.VITE_APP_ENV !== "production";
//     console.log("[Socket] Connecting to:", SOCKET_URL, "| transport:", IS_DEV ? "polling" : "websocket+polling");

//     const newSocket = io(SOCKET_URL, {
//       path: "/socket.io",
//       transports: ["polling"],
//       reconnection: true,
//       reconnectionAttempts: 10,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 10000,
//     });

//     socketRef.current = newSocket;
//     setSocket(newSocket);

//     newSocket.on("connect", () => {
//       console.log("[Socket] Connected, id:", newSocket.id);
//       setIsConnected(true);
//       setIsReconnecting(false);
//       setSocketId(newSocket.id || null);

//       const payload = userPayloadRef.current;
//       if (payload) {
//         newSocket.emit("user:join", payload, (response: { success: boolean; message?: string }) => {
//           console.log("[Socket] user:join response:", response);
//         });
//       }
//     });

//     newSocket.on("disconnect", (reason) => {
//       console.log("[Socket] Disconnected:", reason);
//       setIsConnected(false);
//       setSocketId(null);
//     });

//     newSocket.on("reconnect_attempt", (attempt) => {
//       console.log("[Socket] Reconnect attempt:", attempt);
//       setIsReconnecting(true);
//       setIsConnected(false);
//     });

//     newSocket.on("reconnect", (attempt) => {
//       console.log("[Socket] Reconnected after", attempt, "attempts");
//       setIsConnected(true);
//       setIsReconnecting(false);
//       setSocketId(newSocket.id || null);

//       const payload = userPayloadRef.current;
//       if (payload) {
//         newSocket.emit("user:join", payload);
//       }
//     });

//     newSocket.on("reconnect_failed", () => {
//       console.log("[Socket] Reconnect failed");
//       setIsReconnecting(false);
//       setIsConnected(false);
//     });

//     newSocket.on("connect_error", (err) => {
//       console.error("[Socket] Connection error:", err.message);
//     });

//     return () => {
//       console.log("[Socket] Cleaning up");
//       newSocket.disconnect();
//       socketRef.current = null;
//     };
//   }, []);

//   const joinUser = (payload: UserPayload): Promise<boolean> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve(false);
//         return;
//       }
//       socketRef.current.emit("user:join", payload, (response: { success: boolean; message?: string }) => {
//         resolve(response.success);
//       });
//     });
//   };

//   const joinThread = (threadModuleId: number): Promise<boolean> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve(false);
//         return;
//       }
//       socketRef.current.emit("thread:join", { thread_module_id: threadModuleId }, (response: { success: boolean; message?: string }) => {
//         resolve(response.success);
//       });
//     });
//   };

//   const leaveThread = (threadModuleId: number): Promise<boolean> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve(false);
//         return;
//       }
//       socketRef.current.emit("thread:leave", { thread_module_id: threadModuleId }, (response: { success: boolean; message?: string }) => {
//         resolve(response.success);
//       });
//     });
//   };

//   const createThread = (name: string): Promise<{ success: boolean; data?: ThreadModule; message?: string }> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve({ success: false, message: "Not connected" });
//         return;
//       }
//       socketRef.current.emit("thread:create", { name }, (response: { success: boolean; message?: string; data?: ThreadModule }) => {
//         resolve(response);
//       });
//     });
//   };

//   const deleteThread = useCallback((threadModuleId: number): Promise<{ success: boolean; message?: string }> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve({ success: false, message: "Not connected" });
//         return;
//       }
//       socketRef.current.emit("thread:delete", { thread_module_id: threadModuleId }, (response: { success: boolean; message?: string }) => {
//         resolve(response);
//       });
//     });
//   }, []);

//   const listThreads = useCallback((): Promise<{ success: boolean; data?: ThreadModule[]; message?: string }> => {
//     return new Promise((resolve) => {
//       if (!socketRef.current) {
//         resolve({ success: false, message: "Not connected" });
//         return;
//       }
//       socketRef.current.emit("thread:list", (response: { success: boolean; data?: ThreadModule[]; message?: string }) => {
//         resolve(response);
//       });
//     });
//   }, []);

//   return (
//     <SocketContext.Provider value={{ socket, isConnected, isReconnecting, socketId, joinUser, joinThread, leaveThread, createThread, deleteThread, listThreads }}>
//       {children}
//     </SocketContext.Provider>
//   );
// }

// export function useSocketContext() {
//   const context = useContext(SocketContext);
//   if (!context) {
//     throw new Error("useSocketContext must be used within a SocketProvider");
//   }
//   return context;
// }
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { io, type Socket } from "socket.io-client";

import type { UserPayload, ThreadModule } from "../types";
export interface RagStreamEvent {
  type?: string | null;
  status?: string | null;
  content?: string;
  [key: string]: any;
}

export interface MessageStreamPayload {
  thread_module_id: number;

  sender_type: string;
  sender_name?: string;

  user_id?: number | string | null;
  farmer_id?: number | string | null;

  type?: string | null;
  status?: string | null;
  content?: string;

  stream_data?: RagStreamEvent;
}

export interface NewMessagePayload {
  id?: number;

  thread_module_id: number;

  message?: string;

  sender_type?: string;
  sender_name?: string;

  user_id?: number | string | null;
  farmer_id?: number | string | null;

  mode?: "ai" | "human" | string;

  handoff?: any;

  suggestions?: any[];

  images?: any[];

  created_at?: string;
  updated_at?: string;

  [key: string]: any;
}

export interface ConversationNewMessagePayload extends NewMessagePayload {}

interface SocketResponse {
  success: boolean;
  message?: string;
}

interface ThreadCreateResponse extends SocketResponse {
  data?: ThreadModule;
}

interface ThreadListResponse extends SocketResponse {
  data?: ThreadModule[];
}

interface SocketContextType {
  socket: Socket | null;

  isConnected: boolean;
  isReconnecting: boolean;

  socketId: string | null;

  joinUser: (payload: UserPayload) => Promise<boolean>;

  joinThread: (threadModuleId: number) => Promise<boolean>;

  leaveThread: (threadModuleId: number) => Promise<boolean>;

  createThread: (name: string) => Promise<ThreadCreateResponse>;

  deleteThread: (threadModuleId: number) => Promise<SocketResponse>;

  listThreads: () => Promise<ThreadListResponse>;

  subscribeMessageStream: (
    callback: (data: MessageStreamPayload) => void,
  ) => () => void;

  subscribeNewMessage: (
    callback: (data: NewMessagePayload) => void,
  ) => () => void;

  subscribeConversationNewMessage: (
    callback: (data: ConversationNewMessagePayload) => void,
  ) => () => void;
}
const SocketContext = createContext<SocketContextType | undefined>(undefined);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
export function SocketProvider({
  children,
  userPayload,
}: {
  children: ReactNode;
  userPayload?: UserPayload;
}) {
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const [isReconnecting, setIsReconnecting] = useState(false);

  const [socketId, setSocketId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const userPayloadRef = useRef<UserPayload | undefined>(userPayload);
  const joinedThreadsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    userPayloadRef.current = userPayload;
  }, [userPayload]);
  useEffect(() => {
    console.log("[Socket] Connecting to:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],

      reconnection: true,

      reconnectionAttempts: 10,

      reconnectionDelay: 1000,

      reconnectionDelayMax: 10000,

      timeout: 20000,
      autoConnect: true,
    });

    socketRef.current = newSocket;

    setSocket(newSocket);
    // Expose socket globally in development for easier testing of stream events
    if (import.meta.env.DEV) {
      try {
        (window as any).__socket = newSocket;
      } catch (e) {
        // ignore
      }
    }
    const rejoinUser = () => {
      const payload = userPayloadRef.current;

      if (!payload) {
        return;
      }

      console.log("[Socket] Rejoining user...");

      newSocket.emit("user:join", payload, (response: SocketResponse) => {
        console.log("[Socket] user:join response:", response);
      });
    };

    const rejoinThreads = () => {
      const threadIds = Array.from(joinedThreadsRef.current);

      if (!threadIds.length) {
        return;
      }
      threadIds.forEach((threadModuleId) => {
        newSocket.emit(
          "thread:join",
          {
            thread_module_id: threadModuleId,
          },
          (response: SocketResponse) => {
            console.log(`[Socket] Rejoin thread ${threadModuleId}:`, response);
          },
        );
      });
    };

    newSocket.on("connect", () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setSocketId(newSocket.id ?? null);
      rejoinUser();
      rejoinThreads();
    });

    newSocket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);

      setIsConnected(false);

      setSocketId(null);
      if (reason !== "io client disconnect") {
        setIsReconnecting(true);
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error.message);

      setIsConnected(false);
    });

    newSocket.io.on("reconnect_attempt", (attempt) => {
      console.log("[Socket] Reconnect attempt:", attempt);

      setIsReconnecting(true);

      setIsConnected(false);
    });

    newSocket.io.on("reconnect", (attempt) => {
      console.log("[Socket] Reconnected after", attempt, "attempt(s)");

      setIsConnected(true);

      setIsReconnecting(false);

      setSocketId(newSocket.id ?? null);
    });

    newSocket.io.on("reconnect_error", (error) => {
      console.error("[Socket] Reconnect error:", error.message);
    });

    newSocket.io.on("reconnect_failed", () => {
      console.error("[Socket] Reconnect failed");

      setIsReconnecting(false);

      setIsConnected(false);
    });

    return () => {
      console.log("[Socket] Cleaning up");

      newSocket.removeAllListeners();

      newSocket.io.removeAllListeners();

      newSocket.disconnect();

      socketRef.current = null;

      setSocket(null);

      setIsConnected(false);

      setIsReconnecting(false);

      setSocketId(null);
    };
  }, []);

  const joinUser = useCallback((payload: UserPayload): Promise<boolean> => {
    return new Promise((resolve) => {
      const currentSocket = socketRef.current;

      if (!currentSocket || !currentSocket.connected) {
        console.warn("[Socket] Cannot join user. Socket not connected.");

        resolve(false);

        return;
      }
      userPayloadRef.current = payload;

      currentSocket.emit("user:join", payload, (response: SocketResponse) => {
        console.log("[Socket] user:join:", response);

        resolve(response?.success ?? false);
      });
    });
  }, []);
  const joinThread = useCallback((threadModuleId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const currentSocket = socketRef.current;

      if (!currentSocket || !currentSocket.connected) {
        console.warn("[Socket] Cannot join thread. Socket not connected.");

        resolve(false);

        return;
      }

      console.log("[Socket] Joining thread:", threadModuleId);

      currentSocket.emit(
        "thread:join",
        {
          thread_module_id: threadModuleId,
        },
        (response: SocketResponse) => {
          console.log(`[Socket] thread:join ${threadModuleId}:`, response);

          if (response?.success) {
            joinedThreadsRef.current.add(threadModuleId);
          }

          resolve(response?.success ?? false);
        },
      );
    });
  }, []);

  const leaveThread = useCallback(
    (threadModuleId: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const currentSocket = socketRef.current;

        joinedThreadsRef.current.delete(threadModuleId);

        if (!currentSocket || !currentSocket.connected) {
          console.warn("[Socket] Socket disconnected while leaving thread.");
          resolve(true);

          return;
        }

        console.log("[Socket] Leaving thread:", threadModuleId);

        currentSocket.emit(
          "thread:leave",
          {
            thread_module_id: threadModuleId,
          },
          (response: SocketResponse) => {
            console.log(`[Socket] thread:leave ${threadModuleId}:`, response);

            resolve(response?.success ?? false);
          },
        );
      });
    },
    [],
  );

  const createThread = useCallback(
    (name: string): Promise<ThreadCreateResponse> => {
      return new Promise((resolve) => {
        const currentSocket = socketRef.current;

        if (!currentSocket || !currentSocket.connected) {
          resolve({
            success: false,
            message: "Socket not connected",
          });

          return;
        }

        currentSocket.emit(
          "thread:create",
          {
            name,
          },
          (response: ThreadCreateResponse) => {
            resolve(response);
          },
        );
      });
    },
    [],
  );

  const deleteThread = useCallback(
    (threadModuleId: number): Promise<SocketResponse> => {
      return new Promise((resolve) => {
        const currentSocket = socketRef.current;

        if (!currentSocket || !currentSocket.connected) {
          resolve({
            success: false,
            message: "Socket not connected",
          });

          return;
        }

        joinedThreadsRef.current.delete(threadModuleId);

        currentSocket.emit(
          "thread:delete",
          {
            thread_module_id: threadModuleId,
          },
          (response: SocketResponse) => {
            resolve(response);
          },
        );
      });
    },
    [],
  );

  const listThreads = useCallback((): Promise<ThreadListResponse> => {
    return new Promise((resolve) => {
      const currentSocket = socketRef.current;

      if (!currentSocket || !currentSocket.connected) {
        resolve({
          success: false,
          message: "Socket not connected",
        });

        return;
      }

      currentSocket.emit("thread:list", (response: ThreadListResponse) => {
        resolve(response);
      });
    });
  }, []);

  const subscribeMessageStream = useCallback(
    (callback: (data: MessageStreamPayload) => void) => {
      const currentSocket = socketRef.current;

      if (!currentSocket) {
        console.warn(
          "[Socket] Cannot subscribe message:stream. Socket unavailable.",
        );

        return () => {};
      }

      console.log("[Socket] Subscribe: message:stream");

      currentSocket.on("message:stream", callback);

      return () => {
        console.log("[Socket] Unsubscribe: message:stream");

        currentSocket.off("message:stream", callback);
      };
    },
    [],
  );
  const subscribeNewMessage = useCallback(
    (callback: (data: NewMessagePayload) => void) => {
      const currentSocket = socketRef.current;

      if (!currentSocket) {
        console.warn(
          "[Socket] Cannot subscribe message:new. Socket unavailable.",
        );

        return () => {};
      }

      console.log("[Socket] Subscribe: message:new");

      currentSocket.on("message:new", callback);

      return () => {
        console.log("[Socket] Unsubscribe: message:new");

        currentSocket.off("message:new", callback);
      };
    },
    [],
  );

  const subscribeConversationNewMessage = useCallback(
    (callback: (data: ConversationNewMessagePayload) => void) => {
      const currentSocket = socketRef.current;

      if (!currentSocket) {
        return () => {};
      }

      currentSocket.on("conversation:new-message", callback);

      return () => {
        currentSocket.off("conversation:new-message", callback);
      };
    },
    [],
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        isReconnecting,
        socketId,
        joinUser,
        joinThread,
        leaveThread,
        createThread,
        deleteThread,
        listThreads,
        subscribeMessageStream,
        subscribeNewMessage,
        subscribeConversationNewMessage,
      }}
    >
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
