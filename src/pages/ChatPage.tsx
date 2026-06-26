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
    });
  }, [navigate]);

  const handleSelectThread = useCallback(
    (threadId: number) => {
      if (selectedThread !== null) {
        leaveThread(selectedThread);
      }
      setSelectedThread(threadId);
      joinThread(threadId);
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
    chat.emitTypingStart(userData.login_type === "user" ? "User" : "Farmer", userData.user_id, userData.farmer_id);
  }, [chat, userData]);

  const handleTypingStop = useCallback(() => {
    if (!userData) return;
    chat.emitTypingStop(userData.user_id, userData.farmer_id);
  }, [chat, userData]);

  if (!userData) return null;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Chat App</h1>
        </div>
        <ConnectionStatus />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:block">
          <ThreadList threads={MOCK_THREADS} selectedThread={selectedThread} onSelectThread={handleSelectThread} />
        </div>

        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 md:hidden">
                <select
                  value={selectedThread}
                  onChange={(e) => handleSelectThread(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  {MOCK_THREADS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

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
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <div className="text-lg font-medium">Select a thread</div>
                <div className="text-sm">Choose a thread from the sidebar to start chatting</div>
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
