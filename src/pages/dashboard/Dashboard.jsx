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

      <div className="flex-1 flex flex-col">
        <Navbar />

        <div className="p-8">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight">
                Dashboard
              </h1>

              <p className="text-gray-500 mt-2">
                Here's what's moving in your workspace today.
              </p>
            </div>
          </div>

          {/* =====================================================
              CARDS
          ===================================================== */}

          <div className="grid grid-cols-4 gap-8 mb-8">
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

          <div className="grid grid-cols-2 gap-8">
            {/* =================================================
                RECENT UPLOADS
            ================================================= */}

            <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition">
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <h2 className="font-semibold text-lg">Recent Uploads</h2>

                <button
                  className="text-sm text-gray-700 flex items-center gap-1"
                  onClick={() => navigate("/files")}
                >
                  View all ↗
                </button>
              </div>

              {recentUploads.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="flex justify-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <FiFileText size={18} className="text-gray-400" />
                    </div>
                  </div>

                  <p className="text-sm font-medium text-gray-700">
                    No uploads yet
                  </p>

                  <p className="text-xs text-gray-400 mt-1">
                    Uploaded files will appear here.
                  </p>
                </div>
              ) : (
                recentUploads.map((file, index) => (
                  <div
                    key={file._id || index}
                    className="flex justify-between items-center px-6 py-4 border-b border-gray-100 last:border-none"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        {getFileIcon(file)}
                      </div>

                      <div className="min-w-0">
                        <h3
                          className="font-medium text-[15px] truncate max-w-[300px]"
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

                    <span className="text-sm text-gray-400 shrink-0 ml-3">
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

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <h2 className="font-semibold text-lg">Recent Chats</h2>

                <button
                  className="text-sm text-gray-700"
                  onClick={() => navigate("/chat")}
                >
                  Open ↗
                </button>
              </div>

              <RecentChats />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// CARD
// =====================================================

function Card({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <h2 className="text-3xl font-bold mt-2">{value}</h2>

          <p className="text-sm text-gray-400 mt-3">{subtitle}</p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center text-blue-600 text-xl">
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
          className="flex justify-between items-center px-6 py-4 border-b border-gray-100 last:border-none"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                {chat.avatar}
              </div>

              {chat.online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>

            <div>
              <h3 className="font-medium text-[15px]">{chat.name}</h3>

              <p className="text-sm text-gray-500">{chat.message}</p>
            </div>
          </div>

          <span className="text-sm text-gray-400">{chat.time}</span>
        </div>
      ))}
    </>
  );
}

export default Dashboard;
