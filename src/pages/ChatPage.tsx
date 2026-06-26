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

const MOCK_THREADS: ThreadModule[] = [
  { id: 100, name: "General Support" },
  { id: 200, name: "Technical Help" },
  { id: 300, name: "Feedback" },
];

function ChatContent() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { joinThread, leaveThread } = useSocketContext();
  const chat = useChat(selectedThread);
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

  const selectedThreadName = MOCK_THREADS.find((t) => t.id === selectedThread)?.name || "";

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-purple-100 px-4 py-3 flex items-center justify-between flex-shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-purple-50 transition-colors text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--own-gradient)" }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A1.875 1.875 0 0 1 5.625 3h12.75A1.875 1.875 0 0 1 20.25 4.875v10.5A1.875 1.875 0 0 1 18.375 17.25H7.5l-3.75 2.855Z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800 leading-tight">Chat App</h1>
            {selectedThread && (
              <p className="text-xs text-purple-400 font-medium">{selectedThreadName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
               style={{ background: "linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)" }}>
            {userData.name?.charAt(0).toUpperCase() || "F"}
          </div>
        </div>
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
          threads={MOCK_THREADS}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-72 border-r border-purple-100 bg-white flex-shrink-0">
          <ThreadList
            threads={MOCK_THREADS}
            selectedThread={selectedThread}
            onSelectThread={handleSelectThread}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedThread ? (
            <>
              <ChatWindow
                messages={chat.messages}
                currentUserId={userData.user_id ?? userData.farmer_id ?? 0}
                currentUserType={userData.login_type ?? "user"}
                isTyping={chat.isTyping}
                typingUser={chat.typingUser}
                messagesEndRef={chat.messagesEndRef}
              />
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
