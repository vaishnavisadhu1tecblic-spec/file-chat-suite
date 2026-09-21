import { useCallback, useEffect, useState } from "react";
import {
  FiUploadCloud,
  FiMessageSquare,
  FiHardDrive,
  FiShare2,
  FiFileText,
  FiImage,
  FiPlay,
  FiHeadphones,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import api from "../../api/interceptors";

function Dashboard() {
  const navigate = useNavigate();

  const [filesUploaded, setFilesUploaded] = useState(0);
  const [messages, setMessages] = useState(0);
  const [storageUsed, setStorageUsed] = useState("0 KB");
  const [sharedFiles, setSharedFiles] = useState(0);
  const [recentUploads, setRecentUploads] = useState([]);
  const [recentChats, setRecentChats] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const response = await api.get("/dashboard");

      const dashboard = response.data?.dashboard || {};

      setFilesUploaded(dashboard.filesUploaded || 0);
      setMessages(dashboard.messages || 0);
      setStorageUsed(dashboard.storageUsed || "0 KB");
      setSharedFiles(dashboard.sharedFiles || 0);
      setRecentUploads(dashboard.recentUploads || []);
      setRecentChats(dashboard.recentChats || []);
    } catch (error) {
      console.error("Dashboard data error:", error);
      console.error(
        "GET /api/dashboard failed:",
        error?.response?.data || error?.message || error,
      );
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getFileIcon = (file) => {
    const type = file.type || "document";

    if (type === "image") {
      return <FiImage size={18} className="text-gray-500" />;
    }

    if (type === "video") {
      return <FiPlay size={18} className="text-gray-500" />;
    }

    if (type === "audio") {
      return <FiHeadphones size={18} className="text-gray-500" />;
    }

    return <FiFileText size={18} className="text-gray-500" />;
  };

  const getChatAvatar = (chat) => {
    if (chat.avatar) {
      return chat.avatar;
    }

    const name = chat.name || "User";

    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  const formatChatTime = (date) => {
    if (!date) {
      return "";
    }

    const messageDate = new Date(date);

    if (Number.isNaN(messageDate.getTime())) {
      return "";
    }

    const now = new Date();

    const isToday = messageDate.toDateString() === now.toDateString();

    if (isToday) {
      return messageDate.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);

    yesterday.setDate(now.getDate() - 1);

    if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return messageDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px] md:text-[34px]">
                Dashboard
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Here's what's moving in your workspace today.
              </p>
            </div>
          </div>

          {/* =====================================================
              STATS
          ===================================================== */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mb-8 md:grid-cols-2 md:gap-6 xl:grid-cols-4 xl:gap-8">
            <Card
              title="Files Uploaded"
              value={filesUploaded.toLocaleString()}
              subtitle="Files in your workspace"
              icon={<FiUploadCloud />}
            />

            <Card
              title="Messages"
              value={messages.toLocaleString()}
              subtitle="Total messages"
              icon={<FiMessageSquare />}
            />

            <Card
              title="Storage Used"
              value={storageUsed}
              subtitle="Based on uploaded files"
              icon={<FiHardDrive />}
            />

            <Card
              title="Shared Files"
              value={sharedFiles.toLocaleString()}
              subtitle="Files shared with you"
              icon={<FiShare2 />}
            />
          </div>

          {/* =====================================================
              RECENT SECTIONS
          ===================================================== */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
            {/* ===================================================
                RECENT UPLOADS
            =================================================== */}

            <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                <h2 className="font-semibold text-lg">Recent Uploads</h2>

                <button
                  className="shrink-0 text-sm text-gray-700"
                  onClick={() => navigate("/files")}
                >
                  View all ↗
                </button>
              </div>

              {recentUploads.length === 0 ? (
                <div className="px-4 py-10 text-center sm:px-6">
                  <div className="mb-3 flex justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <FiFileText size={18} className="text-gray-400" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-700">
                    No uploads yet
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Uploaded files will appear here.
                  </p>
                </div>
              ) : (
                recentUploads.map((file, index) => (
                  <div
                    key={file._id || index}
                    className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 last:border-none sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        {getFileIcon(file)}
                      </div>

                      <div className="min-w-0">
                        <h3
                          className="max-w-[180px] truncate text-[15px] font-medium sm:max-w-[300px]"
                          title={
                            file.originalName || file.name || "Unnamed file"
                          }
                        >
                          {file.originalName || file.name || "Unnamed file"}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {file.sizeLabel || ""}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-right text-xs text-gray-400 sm:text-sm">
                      {file.createdDate || ""}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* ===================================================
                RECENT CHATS
            =================================================== */}

            <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6 sm:py-5">
                <h2 className="font-semibold text-lg">Recent Chats</h2>

                <button
                  className="shrink-0 text-sm text-gray-700"
                  onClick={() => navigate("/chat")}
                >
                  Open ↗
                </button>
              </div>

              {recentChats.length === 0 ? (
                <div className="px-4 py-10 text-center sm:px-6">
                  <div className="mb-3 flex justify-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <FiMessageSquare size={18} className="text-gray-400" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-700">
                    No chats yet
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    Your recent conversations will appear here.
                  </p>
                </div>
              ) : (
                recentChats.map((chat) => (
                  <button
                    key={chat.conversationId}
                    type="button"
                    onClick={() => navigate("/chat")}
                    className="flex w-full min-w-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 last:border-none sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                          {getChatAvatar(chat)}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-medium">
                          {chat.name || "Conversation"}
                        </h3>

                        <p className="truncate text-sm text-gray-500">
                          {chat.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-xs text-gray-400 sm:text-sm">
                      {formatChatTime(chat.lastMessageTime)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, icon }) {
  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md sm:p-6">
      <div className="flex justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-500">{title}</p>

          <h2 className="mt-2 truncate text-3xl font-bold">{value}</h2>

          <p className="mt-3 text-sm text-gray-400">{subtitle}</p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF4FF] text-xl text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
