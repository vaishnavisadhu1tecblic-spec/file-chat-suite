import { useEffect, useRef, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiUploadCloud,
  FiShare2,
  FiHardDrive,
  FiDownload,
  FiFileText,
  FiCamera,
  FiTrash2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Avatar from "../../components/common/Avatar";
import api from "../../api/interceptors";

const formatStorage = (bytes = 0) => {
  const value = Number(bytes) || 0;

  if (value < 1024) {
    return `${value} B`;
  }

  const kb = value / 1024;

  if (kb < 1024) {
    return `${Math.round(kb * 10) / 10} KB`;
  }

  const mb = kb / 1024;

  if (mb < 1024) {
    return `${Math.round(mb * 10) / 10} MB`;
  }

  const gb = mb / 1024;

  return `${Math.round(gb * 10) / 10} GB`;
};

const formatDate = (date) => {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getInitial = (name) => {
  return (
    String(name || "")
      .trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
};

const getUserId = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    return storedUser?._id || storedUser?.id || "";
  } catch (error) {
    console.error("Read stored user error:", error);
    return "";
  }
};

function Profile() {
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [fileStats, setFileStats] = useState({
    filesUploaded: 0,
    totalBytes: 0,
    recentUploads: [],
  });
  const [sharedFiles, setSharedFiles] = useState([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingShared, setLoadingShared] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [error, setError] = useState("");

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setUploadingAvatar(true);
    setError("");

    try {
      const response = await api.post("/auth/profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = response.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        const currentStoredUser = JSON.parse(
          localStorage.getItem("user") || "{}",
        );
        localStorage.setItem(
          "user",
          JSON.stringify({ ...currentStoredUser, ...updatedUser }),
        );
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error("Upload avatar error:", err);
      setError(err.response?.data?.message || "Failed to upload profile photo");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleAvatarRemove = async () => {
    if (!window.confirm("Remove your profile photo?")) return;

    setUploadingAvatar(true);
    try {
      const response = await api.delete("/auth/profile-photo");
      const updatedUser = response.data?.user;
      if (updatedUser) {
        setUser(updatedUser);
        const currentStoredUser = JSON.parse(
          localStorage.getItem("user") || "{}",
        );
        localStorage.setItem(
          "user",
          JSON.stringify({ ...currentStoredUser, ...updatedUser }),
        );
        window.dispatchEvent(new Event("userUpdated"));
      }
    } catch (err) {
      console.error("Remove avatar error:", err);
      setError(err.response?.data?.message || "Failed to remove profile photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const loadProfile = async () => {
    const userId = getUserId();

    if (!userId) {
      setError("Logged-in user information was not found.");
      setLoadingUser(false);
      return;
    }

    try {
      const response = await api.get(`/auth/user/${userId}`);

      const responseUser = response.data?.user || response.data;

      setUser(responseUser || null);

      // Keep localStorage user synchronized with backend data.
      if (responseUser) {
        const currentStoredUser = JSON.parse(
          localStorage.getItem("user") || "{}",
        );

        localStorage.setItem(
          "user",
          JSON.stringify({
            ...currentStoredUser,
            ...responseUser,
          }),
        );
      }
    } catch (error) {
      console.error("Load profile error:", error);

      setError(
        error.response?.data?.message ||
          "Unable to load your profile information.",
      );
    } finally {
      setLoadingUser(false);
    }
  };

  // =====================================================
  // LOAD FILE STATS
  // =====================================================

  const loadFileStats = async () => {
    try {
      const response = await api.get("/files/stats");

      setFileStats(
        response.data?.stats || {
          filesUploaded: 0,
          totalBytes: 0,
          recentUploads: [],
        },
      );
    } catch (error) {
      console.error("Load file stats error:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  // =====================================================
  // LOAD SHARED FILES
  // =====================================================

  const loadSharedFiles = async () => {
    try {
      const response = await api.get("/files/shared");

      setSharedFiles(response.data?.files || []);
    } catch (error) {
      console.error("Load shared files error:", error);
    } finally {
      setLoadingShared(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadProfile();
    loadFileStats();
    loadSharedFiles();
  }, []);

  // =====================================================
  // USER UPDATE EVENT
  // =====================================================

  useEffect(() => {
    const handleUserUpdated = () => {
      loadProfile();
    };

    window.addEventListener("userUpdated", handleUserUpdated);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);

  // =====================================================
  // DOWNLOAD FILE
  // =====================================================

  const downloadFile = async (file) => {
    if (!file?._id) {
      return;
    }

    try {
      const response = await api.get(`/files/${file._id}/download`, {
        responseType: "blob",
      });

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data], {
          type: file.mimeType || "application/octet-stream",
        }),
      );

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = file.originalName || "download";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("File download error:", error);

      let message = "Unable to download this file.";

      if (error.response?.status === 403) {
        message = "You do not have permission to download this file.";
      }

      alert(message);
    }
  };

  // =====================================================
  // DISPLAY DATA
  // =====================================================

  const displayName = user?.name || user?.username || "User";

  const username = user?.username || "";

  const email = user?.email || "";

  const firstLetter = getInitial(displayName);

  const recentUploads = fileStats.recentUploads || [];

  const totalUploads = Number(fileStats.filesUploaded) || 0;

  const totalStorage = formatStorage(fileStats.totalBytes);

  const sharedCount = sharedFiles.length;

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-[800px]">
            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
                Profile
              </h1>

              <p className="mt-1 text-[11px] text-gray-500">
                How your teammates see you in SyncSpace.
              </p>
            </div>

            {/* =====================================================
                ERROR
            ===================================================== */}

            {error && (
              <div className="mb-4 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-600">
                {error}
              </div>
            )}

            {/* =====================================================
                PROFILE CARD
            ===================================================== */}

            <section className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm">
              <div className="h-[120px] bg-gradient-to-r from-[#f4f7fa] via-[#edf2f6] to-[#e3e9ef] sm:h-[150px]" />

              <div className="relative flex min-h-[73px] flex-col items-start justify-between gap-4 px-4 pb-4 pt-3 sm:px-5 md:flex-row md:items-center md:gap-3 md:pb-3">
                <div className="flex min-w-0 w-full items-center gap-3">
                  {/* AVATAR WITH UPLOAD */}
                  <div className="relative -mt-[52px] shrink-0 sm:-mt-[67px]">
                    <Avatar
                      user={user}
                      size="xl"
                      previewable
                      className="border-4 border-white shadow-md"
                    />

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleAvatarFileChange}
                    />

                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                      title="Upload / Change profile photo"
                      aria-label="Upload profile photo"
                    >
                      <FiCamera size={13} />
                    </button>

                    {user?.image && (
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={handleAvatarRemove}
                        className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                        title="Remove profile photo"
                        aria-label="Remove profile photo"
                      >
                        <FiTrash2 size={11} />
                      </button>
                    )}
                  </div>

                  {/* USER INFO */}
                  <div className="min-w-0">
                    <h2 className="truncate text-[14px] font-semibold leading-tight text-gray-900">
                      {loadingUser ? "Loading..." : displayName}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-gray-500">
                      {username && (
                        <>
                          <span className="truncate">@{username}</span>

                          <span>·</span>
                        </>
                      )}

                      <span>SyncSpace User</span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-gray-500">
                      {email && (
                        <>
                          <span className="truncate">{email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}

                <div className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="flex h-[27px] flex-1 items-center justify-center gap-1 rounded-[8px] border border-gray-300 bg-white px-2 text-[9px] font-medium text-gray-700 transition hover:bg-gray-50 sm:flex-none sm:px-3"
                  >
                    <FiLock size={10} />
                    Change Password
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="flex h-[27px] flex-1 items-center justify-center gap-1 rounded-[8px] bg-[#315eff] px-2 text-[9px] font-semibold text-white transition hover:bg-[#2853e6] sm:flex-none sm:px-3"
                  >
                    <FiEdit2 size={10} />
                    Edit Profile
                  </button>
                </div>
              </div>
            </section>

            {/* =====================================================
                MAIN CONTENT
            ===================================================== */}

            <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_250px]">
              <div className="min-w-0 space-y-4">
                {/* =================================================
                    ABOUT
                ================================================= */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    About
                  </h3>

                  <p className="mt-2 text-[9px] leading-[1.55] text-gray-600">
                    {user?.about ||
                      "No profile description has been added yet."}
                  </p>
                </section>

                {/* =================================================
                    SKILLS
                ================================================= */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    Skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Array.isArray(user?.skills) && user.skills.length > 0 ? (
                      user.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-[7px] border border-gray-200 bg-[#f5f7fa] px-2.5 py-1 text-[8px] font-medium text-gray-700"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[9px] text-gray-500">
                        No skills added yet.
                      </span>
                    )}
                  </div>
                </section>

                {/* =================================================
                    RECENT UPLOADS
                ================================================= */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-gray-900">
                      Recent Uploads
                    </h3>

                    <button
                      type="button"
                      onClick={() => navigate("/files")}
                      className="text-[8px] font-medium text-[#315eff] hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {loadingFiles ? (
                      <div className="rounded-[9px] bg-[#f8fafc] px-3 py-4 text-center text-[9px] text-gray-500">
                        Loading files...
                      </div>
                    ) : recentUploads.length === 0 ? (
                      <div className="rounded-[9px] bg-[#f8fafc] px-3 py-4 text-center text-[9px] text-gray-500">
                        No uploads yet.
                      </div>
                    ) : (
                      recentUploads.map((file) => (
                        <button
                          type="button"
                          key={file._id}
                          onClick={() => downloadFile(file)}
                          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-[9px] bg-[#f8fafc] px-2.5 py-2 text-left transition hover:bg-[#f1f5f9]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                              <FiFileText size={11} />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-[9px] font-semibold text-gray-900">
                                {file.originalName}
                              </p>

                              <p className="mt-0.5 truncate text-[7px] text-gray-500">
                                {file.sizeLabel || formatStorage(file.size)}
                                {file.createdDate
                                  ? ` · ${file.createdDate}`
                                  : file.createdAt
                                    ? ` · ${formatDate(file.createdAt)}`
                                    : ""}
                              </p>
                            </div>
                          </div>

                          <FiDownload
                            size={11}
                            className="shrink-0 text-gray-400"
                          />
                        </button>
                      ))
                    )}
                  </div>
                </section>

                {/* =================================================
                    SHARED FILES
                ================================================= */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-gray-900">
                      Shared Files
                    </h3>

                    <button
                      type="button"
                      onClick={() => navigate("/files")}
                      className="text-[8px] font-medium text-[#315eff] hover:underline"
                    >
                      View all
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {loadingShared ? (
                      <div className="rounded-[9px] bg-[#f8fafc] px-3 py-4 text-center text-[9px] text-gray-500">
                        Loading shared files...
                      </div>
                    ) : sharedFiles.length === 0 ? (
                      <div className="rounded-[9px] bg-[#f8fafc] px-3 py-4 text-center text-[9px] text-gray-500">
                        No shared files yet.
                      </div>
                    ) : (
                      sharedFiles.slice(0, 5).map((file) => (
                        <button
                          type="button"
                          key={`${file._id}-${file.conversationId}`}
                          onClick={() => {
                            if (file.permission === "download") {
                              downloadFile(file);
                              return;
                            }

                            alert(
                              "You have view permission for this file, but download permission is not available.",
                            );
                          }}
                          className="flex w-full min-w-0 items-center justify-between gap-2 rounded-[9px] bg-[#f8fafc] px-2.5 py-2 text-left transition hover:bg-[#f1f5f9]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                              <FiShare2 size={11} />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-[9px] font-semibold text-gray-900">
                                {file.originalName}
                              </p>

                              <p className="mt-0.5 truncate text-[7px] text-gray-500">
                                {file.sizeLabel || formatStorage(file.size)}
                                {file.sharedAt
                                  ? ` · Shared ${formatDate(file.sharedAt)}`
                                  : ""}
                              </p>
                            </div>
                          </div>

                          <FiDownload
                            size={11}
                            className="shrink-0 text-gray-400"
                          />
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* ===================================================
                  STATS
              =================================================== */}

              <aside className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:block lg:space-y-4">
                {/* TOTAL UPLOADS */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Total Uploads
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        {loadingFiles ? "..." : totalUploads}
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        Files uploaded by you
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiUploadCloud size={13} />
                    </span>
                  </div>
                </section>

                {/* SHARED FILES */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Total Shared Files
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        {loadingShared ? "..." : sharedCount}
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        Files shared with you
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiShare2 size={13} />
                    </span>
                  </div>
                </section>

                {/* STORAGE */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Storage Used
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        {loadingFiles ? "..." : totalStorage}
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        Total size of your files
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiHardDrive size={13} />
                    </span>
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;
