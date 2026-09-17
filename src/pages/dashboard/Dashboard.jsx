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
  const [recentUploads, setRecentUploads] = useState([]);

  // =====================================================
  // STORAGE FORMAT
  // =====================================================

  const formatStorage = useCallback((bytes) => {
    if (!bytes || bytes <= 0) {
      return "0 KB";
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${Math.round(kb * 10) / 10} KB`;
    }

    const mb = kb / 1024;

    if (mb < 1024) {
      return `${Math.round(mb * 10) / 10} MB`;
    }

    const gb = mb / 1024;

    return `${Math.round(gb * 10) / 10} GB`;
  }, []);

  // =====================================================
  // FILE STATS
  // =====================================================

  const loadFileStats = useCallback(async () => {
    try {
      const response = await api.get("/files/stats");

      const stats = response.data?.stats || {};

      setFilesUploaded(stats.filesUploaded || 0);

      setStorageUsed(formatStorage(stats.totalBytes || 0));

      setRecentUploads(stats.recentUploads || []);
    } catch (error) {
      console.error("Dashboard file stats error:", error);

      console.error(
        "GET /api/files/stats failed:",
        error?.response?.data || error?.message || error,
      );
    }
  }, [formatStorage]);

  // =====================================================
  // MESSAGE COUNT
  // =====================================================

  const loadMessageCount = useCallback(async () => {
    try {
      const response = await api.get("/messages/count");

      setMessages(response.data?.count || 0);
    } catch (error) {
      console.error("Dashboard message count error:", error);

      console.error(
        "GET /api/messages/count failed:",
        error?.response?.data || error?.message || error,
      );
    }
  }, []);

  // =====================================================
  // LOAD DASHBOARD DATA
  // =====================================================

  const loadDashboardData = useCallback(async () => {
    await Promise.all([loadFileStats(), loadMessageCount()]);
  }, [loadFileStats, loadMessageCount]);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // =====================================================
  // FILE ICON
  // =====================================================

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

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
          {/* =====================================================
              HEADER
          ===================================================== */}

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
              CARDS
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
              value="0"
              subtitle="Sharing not configured"
              icon={<FiShare2 />}
            />
          </div>

          {/* =====================================================
              BOTTOM
          ===================================================== */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:gap-8">
            {/* =================================================
                RECENT UPLOADS
            ================================================= */}

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
                          {file.sizeLabel || formatStorage(file.size || 0)}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 text-right text-xs text-gray-400 sm:text-sm">
                      {file.createdDate ||
                        (file.createdAt
                          ? new Date(file.createdAt).toLocaleDateString(
                              undefined,
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "")}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* =================================================
                RECENT CHATS
            ================================================= */}

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

              <RecentChats />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// CARD
// =====================================================

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

// =====================================================
// RECENT CHATS
// =====================================================

function RecentChats() {
  const chats = [
    {
      name: "Design Guild",
      message: "Tobias: uploaded the new spacing scale",
      time: "2m",
      avatar: "DG",
      online: true,
    },
    {
      name: "Priya Raman",
      message: "Can you review the pricing deck?",
      time: "14m",
      avatar: "PR",
      online: true,
    },
    {
      name: "Marcus Vale",
      message: "Voice message • 0:24",
      time: "1h",
      avatar: "MV",
      online: false,
    },
    {
      name: "Engineering",
      message: "You: shipped to staging 🎉",
      time: "3h",
      avatar: "EN",
      online: true,
    },
    {
      name: "Tobias Lund",
      message: "Thanks — that unblocks me.",
      time: "Yesterday",
      avatar: "TL",
      online: false,
    },
  ];

  return (
    <>
      {chats.map((chat, index) => (
        <div
          key={index}
          className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-4 last:border-none sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                {chat.avatar}
              </div>

              {chat.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"></span>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-medium">{chat.name}</h3>

              <p className="truncate text-sm text-gray-500">{chat.message}</p>
            </div>
          </div>

          <span className="shrink-0 text-xs text-gray-400 sm:text-sm">
            {chat.time}
          </span>
        </div>
      ))}
    </>
  );
}

export default Dashboard;
