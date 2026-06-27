import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { SocketProvider } from "../context/SocketContext";
import { ThreadList } from "../components/ThreadList";
import { ChatWindow } from "../components/ChatWindow";
import { MessageInput } from "../components/MessageInput";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { useChat } from "../hooks/useChat";
import { useSocketContext } from "../context/SocketContext";
import type { ThreadModule, UserPayload } from "../types";

function ChatContent() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadModule[]>([]);
  const { joinThread, leaveThread, socket, createThread, deleteThread, listThreads } = useSocketContext();
  const [userData, setUserData] = useState<UserPayload | null>(null);
  const chat = useChat(selectedThread, userData?.login_type === "farmer" ? userData?.farmer_id : userData?.user_id != null ? String(userData.user_id) : undefined, userData?.login_type);

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (!stored) {
      navigate("/");
      return;
    }
    const parsed = JSON.parse(stored);
    setUserData({
      user_id: parsed.userId,
      farmer_id: parsed.farmerId,
      login_type: parsed.loginType,
      parent_id: parsed.parentId,
      name: parsed.name,
    });
  }, [navigate]);

  useEffect(() => {
    if (!socket) return;

    listThreads().then((response) => {
      if (response.success && response.data) {
        setThreads(response.data);
      }
    });

    const handleThreadCreated = (thread: ThreadModule) => {
      setThreads((prev) => {
        if (prev.some((t) => t.id === thread.id)) return prev;
        return [...prev, thread];
      });
      setSelectedThread(thread.id);
      joinThread(thread.id);
      setSidebarOpen(false);
    };

    const handleThreadDeleted = (data: { thread_module_id: number }) => {
      setThreads((prev) => prev.filter((t) => t.id !== data.thread_module_id));
      if (selectedThread === data.thread_module_id) {
        setSelectedThread(null);
        leaveThread(data.thread_module_id);
      }
    };

    socket.on("thread:created", handleThreadCreated);
    socket.on("thread:deleted", handleThreadDeleted);
    return () => {
      socket.off("thread:created", handleThreadCreated);
      socket.off("thread:deleted", handleThreadDeleted);
    };
  }, [socket, listThreads, joinThread, leaveThread, selectedThread]);

  const handleLogout = useCallback(() => {
    socket?.disconnect();
    localStorage.removeItem("chatUser");
    navigate("/");
  }, [socket, navigate]);

  const handleSelectThread = useCallback(
    (threadId: number) => {
      if (selectedThread !== null) {
        leaveThread(selectedThread);
      }
      setSelectedThread(threadId);
      joinThread(threadId);
      setSidebarOpen(false);
    },
    [selectedThread, joinThread, leaveThread]
  );

  const handleCreateThread = useCallback(
    async (name: string) => {
      await createThread(name);
    },
    [createThread]
  );

  const handleDeleteThread = useCallback(
    async (threadId: number) => {
      await deleteThread(threadId);
    },
    [deleteThread]
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!userData) return;
      chat.sendMessage({
        message,
        user_id: userData.user_id,
        farmer_id: userData.farmer_id,
        sender_type: userData.login_type,
      });
    },
    [chat, userData]
  );

  const handleTypingStart = useCallback(() => {
    if (!userData) return;
    chat.emitTypingStart(userData.name || "Farmer", userData.user_id, userData.farmer_id);
  }, [chat, userData]);

  const handleTypingStop = useCallback(() => {
    if (!userData) return;
    chat.emitTypingStop(userData.user_id, userData.farmer_id);
  }, [chat, userData]);

  if (!userData) return null;

  const selectedThreadName = threads.find((t) => t.id === selectedThread)?.name || "";

  return (
    <div className="h-dvh flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 flex-shrink-0 z-30">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Left: User info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-purple-50 transition-colors text-gray-500 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md"
                   style={{ background: "var(--own-gradient)" }}>
                {userData.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[120px] sm:max-w-[200px]">
                {userData.name || "User"}
              </h1>
              <ConnectionStatus />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-rose-50 transition-colors text-gray-400 hover:text-rose-500"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Thread name bar (when thread selected) */}
        {selectedThread && (
          <div className="px-4 py-2 bg-purple-50/50 border-t border-purple-100/50 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            <span className="text-xs font-semibold text-purple-700 truncate">{selectedThreadName}</span>
          </div>
        )}
      </header>

      {/* Mobile sidebar overlay */}
      <div
        className={`thread-overlay md:hidden ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div className={`thread-sidebar md:hidden ${sidebarOpen ? "open" : ""}`} style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between p-4 border-b border-purple-100">
          <span className="font-bold text-gray-800">Threads</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-purple-50 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ThreadList
          threads={threads}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          onCreateThread={handleCreateThread}
          onDeleteThread={handleDeleteThread}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-72 border-r border-purple-100 bg-white flex-shrink-0">
          <ThreadList
            threads={threads}
            selectedThread={selectedThread}
            onSelectThread={handleSelectThread}
            onCreateThread={handleCreateThread}
            onDeleteThread={handleDeleteThread}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedThread ? (
            <>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatWindow
                  messages={chat.messages}
                  currentUserId={userData.login_type === "farmer" ? (userData.farmer_id ?? "") : String(userData.user_id ?? "")}
                  currentUserType={userData.login_type ?? "user"}
                  isTyping={chat.isTyping}
                  typingUser={chat.typingUser}
                  messagesEndRef={chat.messagesEndRef}
                />
              </div>
              <MessageInput
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center" style={{ background: "var(--surface)" }}>
              <div className="text-center animate-float">
                <div className="w-24 h-24 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100" style={{ background: "var(--own-gradient)" }}>
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A1.875 1.875 0 0 1 5.625 3h12.75A1.875 1.875 0 0 1 20.25 4.875v10.5A1.875 1.875 0 0 1 18.375 17.25H7.5l-3.75 2.855Z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">Welcome to Chat</h2>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">Select a conversation from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatPage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserPayload | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("chatUser");
    if (!stored) {
      navigate("/");
      return;
    }
    const parsed = JSON.parse(stored);
    setUserData({
      user_id: parsed.userId,
      farmer_id: parsed.farmerId,
      login_type: parsed.loginType,
      parent_id: parsed.parentId,
      name: parsed.name,
    });
  }, [navigate]);

  const userPayload = useMemo(() => userData ?? undefined, [userData]);

  if (!userData) return null;

  return (
    <SocketProvider userPayload={userPayload}>
      <ChatContent />
    </SocketProvider>
  );
}
