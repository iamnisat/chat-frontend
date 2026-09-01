import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { createAdvisory, fetchConversations, fetchCrops } from "../api";
import { ChatWindow } from "../components/ChatWindow";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { MessageInput } from "../components/MessageInput";
import { ThreadList } from "../components/ThreadList";
import { SocketProvider, useSocketContext } from "../context/SocketContext";
import { useChat } from "../hooks/useChat.ts";
import type { LanguageType, ThreadModule, UserPayload } from "../types";

const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || "";
const GENERAL_THREAD_NAME = "General";
const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%23a78bfa'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='16' font-weight='bold' font-family='system-ui'%3EU%3C/text%3E%3C/svg%3E";

function ChatContent() {
  const navigate = useNavigate();
  const [selectedThread, setSelectedThread] = useState<number | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadModule[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [showThreadTypeSelector, setShowThreadTypeSelector] = useState(false);
  const [showCropSelector, setShowCropSelector] = useState(false);
  const [cropOptions, setCropOptions] = useState<
    Array<{
      id: number;
      name: string;
      crop_bangla_name?: string;
      bangla_name?: string;
      cropBanglaName?: string;
      banglaName?: string;
      crop_name_bn?: string;
    }>
  >([]);
  const [selectedCropId, setSelectedCropId] = useState<number | null>(null);
  const [selectedCropName, setSelectedCropName] = useState<string>("");
  const [isLoadingCrops, setIsLoadingCrops] = useState(false);
  const { joinThread, leaveThread, socket, deleteThread } = useSocketContext();
  const [userData, setUserData] = useState<UserPayload | null>(null);
  const chat = useChat(
    selectedThread,
    userData?.login_type === "farmer"
      ? userData?.farmer_id
      : userData?.user_id != null
      ? String(userData.user_id)
      : undefined,
    userData?.login_type,
    userData?.token
  );

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
      token: parsed.token,
      base_image: parsed.baseImage,
    });
  }, [navigate]);

  useEffect(() => {
    if (!userData?.token) return;

    setIsLoadingThreads(true);
    fetchConversations(userData.token)
      .then((json) => {
        if (json.success && json.data) {
          const mapped: ThreadModule[] = json.data.map(
            (c: {
              id: number;
              conv_name: string;
              last_message?: string;
              last_date_time?: number;
              is_seen?: boolean;
            }) => ({
              id: c.id,
              name: c.conv_name,
              last_message: c.last_message,
              last_date_time: c.last_date_time,
              is_seen: c.is_seen,
            })
          );
          setThreads(mapped);
        }
      })
      .finally(() => setIsLoadingThreads(false));

    if (!socket) return;

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
  }, [socket, joinThread, leaveThread, selectedThread, userData]);

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
      const thread = threads.find((item) => item.id === threadId);
      setSelectedCropName(thread?.name ?? "");
      setSelectedThread(threadId);
      joinThread(threadId);
      setSidebarOpen(false);
    },
    [selectedThread, joinThread, leaveThread, threads]
  );

  const refreshThreads = useCallback(async () => {
    if (!userData?.token) return;
    const json = await fetchConversations(userData.token);
    if (json.success && json.data) {
      const mapped: ThreadModule[] = json.data.map(
        (c: {
          id: number;
          conv_name: string;
          last_message?: string;
          last_date_time?: number;
          is_seen?: boolean;
        }) => ({
          id: c.id,
          name: c.conv_name,
          last_message: c.last_message,
          last_date_time: c.last_date_time,
          is_seen: c.is_seen,
        })
      );
      setThreads(mapped);
    }
  }, [userData?.token]);

  const loadCrops = useCallback(async () => {
    if (!userData?.token || !userData?.farmer_id) return;

    setIsLoadingCrops(true);
    try {
      const json = await fetchCrops(userData.token, 1, 100);
      const rawCrops = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.items)
        ? json.data.items
        : Array.isArray(json?.data?.crops)
        ? json.data.crops
        : [];

      const normalized = rawCrops
        .map((crop: Record<string, unknown>) => {
          const banglaName = [
            crop.crop_bangla_name,
            crop.bangla_name,
            crop.cropBanglaName,
            crop.banglaName,
            crop.crop_name_bn,
          ].find(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0
          );

          return {
            id: Number(crop.id ?? crop.crop_id ?? crop.cropId),
            name: String(
              crop.name ?? crop.crop_name ?? crop.cropName ?? "Crop"
            ),
            crop_bangla_name: banglaName,
          };
        })
        .filter((crop: { id: number; name: string }) =>
          Number.isFinite(crop.id)
        );

      setCropOptions(normalized);
      const firstCropId = normalized[0]?.id ?? null;
      setSelectedCropId((prev) => prev ?? firstCropId);
    } finally {
      setIsLoadingCrops(false);
    }
  }, [userData?.token, userData?.farmer_id]);

  const openCreateThreadDialog = useCallback(() => {
    setShowThreadTypeSelector(true);
  }, []);

  const openCropSelector = useCallback(() => {
    setShowThreadTypeSelector(false);
    setSelectedCropId(null);
    setSelectedCropName("");
    setShowCropSelector(true);
    void loadCrops();
  }, [loadCrops]);

  const handleCreateGeneralThread = useCallback(async () => {
    if (!userData?.token || !userData?.farmer_id || isCreatingThread) return;

    setShowThreadTypeSelector(false);

    const existingThread = threads.find(
      (thread) =>
        thread.name?.trim().toLowerCase() === GENERAL_THREAD_NAME.toLowerCase()
    );

    if (existingThread) {
      if (selectedThread !== existingThread.id) {
        setSelectedThread(existingThread.id);
        joinThread(existingThread.id);
      }
      setSelectedCropName(GENERAL_THREAD_NAME);
      setSidebarOpen(false);
      return;
    }

    setIsCreatingThread(true);
    try {
      const json = await createAdvisory(
        null,
        userData.token,
        Number(userData.farmer_id),
        "general"
      );

      if (json.success && json.data?.id) {
        await refreshThreads();
        const targetThreadId = Number(json.data.id);
        setSelectedThread(targetThreadId);
        setSelectedCropName(GENERAL_THREAD_NAME);
        joinThread(targetThreadId);
        setSidebarOpen(false);
        return;
      }

      await Swal.fire({
        title: "Conversation not created",
        text: "Something went wrong while creating the conversation.",
        icon: "error",
        confirmButtonColor: "#7c3aed",
      });
    } catch (error) {
      await Swal.fire({
        title: "Conversation not created",
        text: error instanceof Error ? error.message : "Please try again.",
        icon: "error",
        confirmButtonColor: "#7c3aed",
      });
    } finally {
      setIsCreatingThread(false);
    }
  }, [
    userData,
    isCreatingThread,
    threads,
    selectedThread,
    refreshThreads,
    joinThread,
  ]);

  const handleCreateThread = useCallback(async () => {
    if (!userData?.token || !userData?.farmer_id || isCreatingThread) return;
    if (!selectedCropId) return;

    const existingThread = threads.find((thread) => {
      const threadName = thread.name?.trim().toLowerCase();
      const cropName = selectedCropName.trim().toLowerCase();
      return !!threadName && !!cropName && threadName === cropName;
    });

    if (existingThread) {
      if (selectedThread !== existingThread.id) {
        setSelectedThread(existingThread.id);
        joinThread(existingThread.id);
      }
      setShowCropSelector(false);
      setSidebarOpen(false);
      await Swal.fire({
        title: "Conversation already exists",
        text: `Opening the existing conversation for ${selectedCropName}.`,
        icon: "info",
        confirmButtonColor: "#7c3aed",
      });
      return;
    }

    setIsCreatingThread(true);
    try {
      const json = await createAdvisory(
        Number(selectedCropId),
        userData.token,
        Number(userData.farmer_id)
      );

      if (json.success && json.data?.id) {
        await refreshThreads();
        const targetThreadId = Number(json.data.id);
        setSelectedThread(targetThreadId);
        joinThread(targetThreadId);
        setSidebarOpen(false);
        // await Swal.fire({
        //   title: "Conversation created",
        //   text: `${json.message}`,
        //   icon: "success",
        //   confirmButtonColor: "#7c3aed",
        // });
        return;
      }

      // await Swal.fire({
      //   title: "Conversation not created",
      //   text: "Something went wrong while creating the conversation.",
      //   icon: "error",
      //   confirmButtonColor: "#7c3aed",
      // });
    } catch (error) {
      // await Swal.fire({
      //   title: "Conversation not created",
      //   text: error instanceof Error ? error.message : "Please try again.",
      //   icon: "error",
      //   confirmButtonColor: "#7c3aed",
      // });
    } finally {
      setIsCreatingThread(false);
      setShowCropSelector(false);
    }
  }, [
    userData,
    isCreatingThread,
    selectedCropId,
    selectedCropName,
    threads,
    selectedThread,
    refreshThreads,
    joinThread,
  ]);

  const handleDeleteThread = useCallback(
    async (threadId: number) => {
      await deleteThread(threadId);
    },
    [deleteThread]
  );

  const selectedThreadName =
    threads.find((t) => t.id === selectedThread)?.name || "";
  const removeEnglishCropName = (cropName: string = ""): string => {
    const cleanedCropName = cropName.replace(/\s*\([^)]*\)\s*$/, "").trim();

    const hasBangla = /[\u0980-\u09FF]/.test(cleanedCropName);

    return hasBangla ? cleanedCropName : "";
  };
  const handleSendMessage = useCallback(
    (message: string, cropName?: string, language: LanguageType = "bn") => {
      if (!userData) return;

      const resolvedCropName =
        cropName?.trim() ||
        selectedCropName.trim() ||
        selectedThreadName.trim() ||
        undefined;
      const cropNameWithoutEnglish = removeEnglishCropName(
        resolvedCropName || ""
      );

      chat.sendMessage({
        message,
        user_id: userData.user_id,
        farmer_id: userData.farmer_id,
        sender_type: userData.login_type,
        crop_name: cropNameWithoutEnglish,
        language_type: language,
      });
    },
    [chat, userData, selectedCropName, selectedThreadName]
  );

  const handleTypingStart = useCallback(() => {
    if (!userData) return;
    chat.emitTypingStart(
      userData.name || "Farmer",
      userData.user_id,
      userData.farmer_id
    );
  }, [chat, userData]);

  const handleTypingStop = useCallback(() => {
    if (!userData) return;
    chat.emitTypingStop(userData.user_id, userData.farmer_id);
  }, [chat, userData]);

  if (!userData) return null;

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
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>
            <div className="relative flex-shrink-0">
              {userData.base_image ? (
                <img
                  src={`${IMAGE_BASE_URL}/${userData.base_image}`}
                  alt={userData.name || "User"}
                  className="w-10 h-10 rounded-xl object-cover shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = PLACEHOLDER_IMG;
                  }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-md"
                  style={{ background: "var(--own-gradient)" }}
                >
                  {userData.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
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
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Thread name bar (when thread selected) */}
        {selectedThread && (
          <div className="px-4 py-2 bg-purple-50/50 border-t border-purple-100/50 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
            <span className="text-xs font-semibold text-purple-700 truncate">
              {selectedThreadName}
            </span>
          </div>
        )}
      </header>

      {/* Mobile sidebar overlay */}
      <div
        className={`thread-overlay md:hidden ${sidebarOpen ? "active" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar */}
      <div
        className={`thread-sidebar md:hidden ${sidebarOpen ? "open" : ""}`}
        style={{ background: "var(--surface)" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-purple-100">
          <span className="font-bold text-gray-800">Threads</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-purple-50 transition-colors text-gray-500"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <ThreadList
          threads={threads}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          onCreateThread={openCreateThreadDialog}
          onDeleteThread={handleDeleteThread}
          isCreatingThread={isCreatingThread}
          isLoadingThreads={isLoadingThreads}
        />
      </div>

      {showThreadTypeSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                New Conversation
              </h3>
              <button
                onClick={() => setShowThreadTypeSelector(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openCropSelector}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 px-3 py-4 hover:border-purple-300 hover:bg-purple-50/50 transition text-gray-700"
              >
                <span className="text-2xl">🌾</span>
                <span className="text-sm font-semibold">Crop</span>
              </button>
              <button
                type="button"
                onClick={handleCreateGeneralThread}
                disabled={isCreatingThread}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 px-3 py-4 hover:border-purple-300 hover:bg-purple-50/50 transition text-gray-700 disabled:opacity-60"
              >
                <span className="text-2xl">💬</span>
                <span className="text-sm font-semibold">
                  {isCreatingThread ? "Creating..." : "General"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showCropSelector && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Select Crop</h3>
              <button
                onClick={() => setShowCropSelector(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close crop selector"
              >
                ×
              </button>
            </div>

            {isLoadingCrops ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-sm text-gray-500">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-200 border-t-purple-600" />
                <span>Loading crops...</span>
              </div>
            ) : cropOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-gray-500">
                No crops found for this farmer.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {cropOptions.map((crop) => (
                  <button
                    key={crop.id}
                    type="button"
                    onClick={() => {
                      setSelectedCropId(crop.id);
                      setSelectedCropName(
                        crop.crop_bangla_name ?? crop.name ?? ""
                      );
                    }}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition ${
                      selectedCropId === crop.id
                        ? "border-purple-300 bg-purple-50 text-purple-700"
                        : "border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 text-gray-700"
                    }`}
                  >
                    {crop.name}
                  </button>
                ))}
              </div>
            )}

            {!isLoadingCrops && cropOptions.length > 0 && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCropSelector(false)}
                  className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedCropId) return;
                    await handleCreateThread();
                  }}
                  disabled={!selectedCropId || isCreatingThread}
                  className="px-3 py-2 text-sm text-white rounded-lg shadow-sm disabled:opacity-60"
                  style={{ background: "var(--own-gradient)" }}
                >
                  {isCreatingThread ? "Creating..." : "Create conversation"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop sidebar */}
        <div className="hidden md:block w-72 border-r border-purple-100 bg-white flex-shrink-0">
          <ThreadList
            threads={threads}
            selectedThread={selectedThread}
            onSelectThread={handleSelectThread}
            onCreateThread={openCreateThreadDialog}
            onDeleteThread={handleDeleteThread}
            isCreatingThread={isCreatingThread}
            isLoadingThreads={isLoadingThreads}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {selectedThread ? (
            <>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatWindow
                  messages={chat.messages}
                  currentUserId={
                    userData.login_type === "farmer"
                      ? userData.farmer_id ?? ""
                      : String(userData.user_id ?? "")
                  }
                  currentUserType={userData.login_type ?? "user"}
                  isTyping={chat.isTyping}
                  typingUser={chat.typingUser}
                  thinkingText={chat.thinkingText}
                  messagesEndRef={chat.messagesEndRef}
                  hasMorePages={chat.hasMorePages}
                  isLoadingMore={chat.isLoadingMore}
                  isLoadingInitial={chat.isLoadingInitial}
                  onLoadMore={chat.loadMore}
                />
              </div>
              <MessageInput
                onSendMessage={handleSendMessage}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                disabled={chat.isSending}
                isSending={chat.isSending}
                cropName={selectedCropName}
              />
            </>
          ) : (
            <div
              className="flex-1 flex items-center justify-center"
              style={{ background: "var(--surface)" }}
            >
              <div className="text-center animate-float">
                <div
                  className="w-24 h-24 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100"
                  style={{ background: "var(--own-gradient)" }}
                >
                  <svg
                    className="w-12 h-12 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 20.105V4.875A1.875 1.875 0 0 1 5.625 3h12.75A1.875 1.875 0 0 1 20.25 4.875v10.5A1.875 1.875 0 0 1 18.375 17.25H7.5l-3.75 2.855Z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">
                  Welcome to Chat
                </h2>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  Select a conversation from the sidebar to start chatting
                </p>
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
      token: parsed.token,
      base_image: parsed.baseImage,
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
