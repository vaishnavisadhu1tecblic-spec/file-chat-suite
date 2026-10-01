import { useEffect, useState } from "react";
import { updateUser } from "../../api/authApi";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import api from "../../api/interceptors";
import {
  FiUser,
  FiBell,
  FiShield,
  FiHardDrive,
  FiPhone,
  FiMoon,
  FiDownloadCloud,
  FiUploadCloud,
  FiTrash2,
  FiCheckCircle,
  FiRefreshCw,
  FiClock,
} from "react-icons/fi";

const DEFAULT_USER = {
  name: "Alina Meyer",
  username: "alina",
  email: "alina@syncspace.io",
  about: "Hey there! I am using SyncSpace.",
};

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  desktopNotifications: true,
  callRingtone: true,
  sharedLinkExpiry: false,
  readReceipts: true,
  statusPrivacy: "contacts",
  groupAddPrivacy: "contacts",
};

function Settings() {
  const [activeTab, setActiveTab] = useState("account"); // 'account' | 'backup' | 'privacy' | 'notifications'
  const [formData, setFormData] = useState(DEFAULT_USER);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Chat Backup State
  const [backupInfo, setBackupInfo] = useState(null);
  const [loadingBackup, setLoadingBackup] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupConfig, setBackupConfig] = useState({
    autoBackup: "weekly",
    includePhotos: true,
    includeVideos: true,
    includeDocuments: true,
  });

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const storedPreferences = JSON.parse(
        localStorage.getItem("preferences") || "{}"
      );
      const storedTheme = localStorage.getItem("theme") || "light";

      setFormData({
        name: storedUser?.name || storedUser?.username || DEFAULT_USER.name,
        username: storedUser?.username || DEFAULT_USER.username,
        email: storedUser?.email || DEFAULT_USER.email,
        about: storedUser?.about || DEFAULT_USER.about,
      });

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...storedPreferences,
      });

      if (storedUser?.backupSettings) {
        setBackupConfig((prev) => ({
          ...prev,
          ...storedUser.backupSettings,
        }));
      }

      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    } catch (error) {
      console.error("Load settings error:", error);
    }

    // Fetch latest backup info
    fetchBackupInfo();
  }, []);

  const fetchBackupInfo = async () => {
    try {
      setLoadingBackup(true);
      const res = await api.get("/backup/latest");
      setBackupInfo(res.data?.backup || res.data?.latestBackup || null);
      if (res.data?.settings || res.data?.backupSettings) {
        setBackupConfig((prev) => ({
          ...prev,
          ...(res.data?.settings || res.data?.backupSettings),
        }));
      }
    } catch (err) {
      console.error("Failed to load backup info:", err);
    } finally {
      setLoadingBackup(false);
    }
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSaved(false);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (name) => {
    setSaved(false);
    setPreferences((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleBackupToggle = (name) => {
    setBackupConfig((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  // Save Account Changes
  const handleSave = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser?._id || storedUser?.id;

      if (!userId) {
        setSaveError("Your session is missing. Please log in again.");
        return;
      }

      const updatedUser = {
        ...storedUser,
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        about: formData.about.trim(),
        backupSettings: backupConfig,
      };

      setIsSaving(true);
      setSaveError("");

      const response = await updateUser(userId, {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        about: updatedUser.about,
      });

      // Also save backup preferences
      await api.patch("/backup/settings", backupConfig).catch(() => {});

      localStorage.setItem(
        "user",
        JSON.stringify(response.data?.user || updatedUser)
      );
      localStorage.setItem("preferences", JSON.stringify(preferences));
      localStorage.setItem("theme", theme);

      document.documentElement.dataset.theme = theme;
      window.dispatchEvent(new Event("userUpdated"));

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (error) {
      console.error("Save settings error:", error);
      setSaveError(
        error.response?.data?.message ||
          "Unable to save your account settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Execute manual chat backup
  const handleCreateBackup = async () => {
    try {
      setIsBackingUp(true);
      setBackupMessage("");
      setBackupError("");

      const res = await api.post("/backup/create", {
        includePhotos: backupConfig.includePhotos,
        includeVideos: backupConfig.includeVideos,
        includeDocs:
          backupConfig.includeDocs !== undefined
            ? backupConfig.includeDocs
            : backupConfig.includeDocuments,
        includeDocuments:
          backupConfig.includeDocuments !== undefined
            ? backupConfig.includeDocuments
            : backupConfig.includeDocs,
      });

      setBackupInfo(res.data?.backup);
      setBackupMessage("Backup completed successfully!");
      setTimeout(() => setBackupMessage(""), 4000);
    } catch (err) {
      console.error("Create backup error:", err);
      setBackupError(err.response?.data?.message || "Failed to create backup");
    } finally {
      setIsBackingUp(false);
    }
  };

  // Restore latest chat backup
  const handleRestoreBackup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to restore from your latest backup? Existing conversations will be synchronized with the snapshot."
      )
    ) {
      return;
    }

    try {
      setIsRestoring(true);
      setBackupMessage("");
      setBackupError("");

      const res = await api.post("/backup/restore");
      setBackupMessage(res.data?.message || "Backup restored successfully!");
      window.dispatchEvent(
        new CustomEvent("syncspace:backup-restored", { detail: res.data })
      );
      window.dispatchEvent(new Event("syncspace:chat-updated"));
      setTimeout(() => setBackupMessage(""), 5000);
    } catch (err) {
      console.error("Restore backup error:", err);
      setBackupError(err.response?.data?.message || "Failed to restore backup");
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete Backup
  const handleDeleteBackup = async () => {
    if (!window.confirm("Are you sure you want to delete your cloud backup?")) {
      return;
    }

    try {
      await api.delete(
        backupInfo?._id ? `/backup/${backupInfo._id}` : "/backup"
      );
      setBackupInfo(null);
      setBackupMessage("Backup deleted.");
      setTimeout(() => setBackupMessage(""), 3000);
    } catch (err) {
      console.error("Delete backup error:", err);
      setBackupError(err.response?.data?.message || "Failed to delete backup");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[680px]">
            {/* Page Header */}
            <div className="mb-5">
              <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">
                Settings
              </h1>
              <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">
                Manage your account, privacy, calls, notifications, and cloud backups.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveTab("account")}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-semibold transition ${
                  activeTab === "account"
                    ? "bg-[#315EFF] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiUser size={13} />
                <span>Account</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("backup")}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-semibold transition ${
                  activeTab === "backup"
                    ? "bg-[#315EFF] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiHardDrive size={13} />
                <span>Chat Backup</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("privacy")}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-semibold transition ${
                  activeTab === "privacy"
                    ? "bg-[#315EFF] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiShield size={13} />
                <span>Privacy</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("notifications")}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-semibold transition ${
                  activeTab === "notifications"
                    ? "bg-[#315EFF] text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FiBell size={13} />
                <span>Preferences</span>
              </button>
            </div>

            {/* 1. ACCOUNT TAB */}
            {activeTab === "account" && (
              <section className="rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="mb-4 text-[13px] font-semibold text-gray-900">
                  Account Details
                </h2>

                <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-[11px] font-medium text-gray-900 sm:text-[10px]"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      className="h-[36px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-blue-500 sm:h-[32px] sm:text-[11px]"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-1.5 block text-[11px] font-medium text-gray-900 sm:text-[10px]"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      value={formData.username}
                      onChange={handleChange}
                      className="h-[36px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-blue-500 sm:h-[32px] sm:text-[11px]"
                    />
                  </div>

                  {/* Email */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-[11px] font-medium text-gray-900 sm:text-[10px]"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="h-[36px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-blue-500 sm:h-[32px] sm:text-[11px]"
                    />
                  </div>

                  {/* About / Bio */}
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="about"
                      className="mb-1.5 block text-[11px] font-medium text-gray-900 sm:text-[10px]"
                    >
                      About / Status
                    </label>
                    <input
                      id="about"
                      name="about"
                      type="text"
                      value={formData.about}
                      onChange={handleChange}
                      placeholder="Hey there! I am using SyncSpace."
                      className="h-[36px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[12px] text-gray-800 outline-none focus:border-blue-500 sm:h-[32px] sm:text-[11px]"
                    />
                  </div>
                </div>

                {/* Save Changes */}
                <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-end">
                  {saved && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-green-600 sm:text-[10px]">
                      <FiCheckCircle /> Changes saved
                    </span>
                  )}

                  {saveError && (
                    <span className="break-words text-[11px] font-medium text-red-600 sm:max-w-[300px] sm:text-right sm:text-[10px]">
                      {saveError}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full rounded-[10px] bg-[#315EFF] px-5 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#2852e8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2 sm:text-[11px]"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </section>
            )}

            {/* 2. CHAT BACKUP TAB */}
            {activeTab === "backup" && (
              <div className="space-y-4">
                {/* Backup Status Overview Card */}
                <section className="rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#315EFF] sm:h-12 sm:w-12">
                        <FiHardDrive size={20} className="sm:text-[24px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[13px] font-bold text-gray-900 sm:text-[14px]">
                          Last Cloud Backup
                        </h3>
                        <p className="mt-0.5 text-[10px] text-gray-500 sm:text-[11px]">
                          {backupInfo ? (
                            <>
                              <span>{formatDate(backupInfo.createdAt)}</span>
                              <span className="mx-1">•</span>
                              <span>
                                {formatBytes(
                                  backupInfo.totalSize || backupInfo.size
                                )}
                              </span>
                            </>
                          ) : (
                            "No backups found for your account"
                          )}
                        </p>
                      </div>
                    </div>

                    {backupInfo && (
                      <button
                        type="button"
                        onClick={handleDeleteBackup}
                        className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        title="Delete Backup"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Backup Stats if Available */}
                  {backupInfo && (
                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-2.5 text-center sm:gap-3 sm:p-3">
                      <div>
                        <p className="text-[9px] font-medium uppercase text-gray-400">
                          Messages
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-gray-800 sm:text-[13px]">
                          {backupInfo.messagesCount ||
                            backupInfo.messageCount ||
                            0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium uppercase text-gray-400">
                          Media Files
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-gray-800 sm:text-[13px]">
                          {backupInfo.mediaCount || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium uppercase text-gray-400">
                          Status
                        </p>
                        <p className="mt-0.5 text-[12px] font-bold text-green-600 sm:text-[13px]">
                          Secure
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Feedback Messages */}
                  {backupMessage && (
                    <div className="mt-3 rounded-xl bg-green-50 p-2.5 text-center text-[11px] font-semibold text-green-700">
                      {backupMessage}
                    </div>
                  )}
                  {backupError && (
                    <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-center text-[11px] font-semibold text-red-600">
                      {backupError}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-5 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                    <button
                      type="button"
                      disabled={isBackingUp}
                      onClick={handleCreateBackup}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#315EFF] px-4 py-2.5 text-[12px] font-semibold text-white shadow-sm hover:bg-[#2852e8] disabled:opacity-50 sm:py-2 sm:text-[11px]"
                    >
                      {isBackingUp ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Backing up...</span>
                        </>
                      ) : (
                        <>
                          <FiUploadCloud size={14} />
                          <span>Back Up Now</span>
                        </>
                      )}
                    </button>

                    {backupInfo && (
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={handleRestoreBackup}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:py-2 sm:text-[11px]"
                      >
                        {isRestoring ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#315EFF] border-t-transparent" />
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <FiDownloadCloud size={14} />
                            <span>Restore Backup</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </section>

                {/* Backup Settings & Auto-Backup */}
                <section className="rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-gray-900">
                    Backup Preferences
                  </h3>

                  {/* Auto-backup Schedule */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                        Auto-Backup Frequency
                      </p>
                      <p className="text-[9px] text-gray-500 sm:text-[10px]">
                        Automatically create backup snapshots
                      </p>
                    </div>

                    <select
                      value={backupConfig.autoBackup}
                      onChange={(e) => {
                        setBackupConfig((prev) => ({
                          ...prev,
                          autoBackup: e.target.value,
                        }));
                      }}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 outline-none focus:border-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="off">Off</option>
                    </select>
                  </div>

                  {/* Include Photos */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                        Include Photos
                      </p>
                      <p className="text-[9px] text-gray-500 sm:text-[10px]">
                        Save all received and sent images in backup
                      </p>
                    </div>
                    <Toggle
                      enabled={backupConfig.includePhotos}
                      onClick={() => handleBackupToggle("includePhotos")}
                      label="Include Photos"
                    />
                  </div>

                  {/* Include Videos */}
                  <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                        Include Videos
                      </p>
                      <p className="text-[9px] text-gray-500 sm:text-[10px]">
                        Include shared videos in the cloud snapshot
                      </p>
                    </div>
                    <Toggle
                      enabled={backupConfig.includeVideos}
                      onClick={() => handleBackupToggle("includeVideos")}
                      label="Include Videos"
                    />
                  </div>

                  {/* Include Documents */}
                  <div className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                        Include Documents & Files
                      </p>
                      <p className="text-[9px] text-gray-500 sm:text-[10px]">
                        Save PDFs, spreadsheets, and files
                      </p>
                    </div>
                    <Toggle
                      enabled={backupConfig.includeDocuments}
                      onClick={() => handleBackupToggle("includeDocuments")}
                      label="Include Documents"
                    />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="w-full rounded-xl bg-[#315EFF] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2852e8] sm:w-auto sm:py-1.5 sm:text-[11px]"
                    >
                      Save Preferences
                    </button>
                  </div>
                </section>
              </div>
            )}

            {/* 3. PRIVACY TAB */}
            {activeTab === "privacy" && (
              <section className="space-y-4 rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-[13px] font-semibold text-gray-900">
                  Privacy & Permissions
                </h2>

                {/* Read Receipts */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Read Receipts
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      If turned off, you won't send or receive read receipts.
                    </p>
                  </div>
                  <Toggle
                    enabled={preferences.readReceipts}
                    onClick={() => handleToggle("readReceipts")}
                    label="Toggle Read Receipts"
                  />
                </div>

                {/* Status Privacy */}
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Who can see my Status Updates
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Controls visibility for your 24h stories
                    </p>
                  </div>
                  <select
                    value={preferences.statusPrivacy}
                    onChange={(e) => {
                      setPreferences((prev) => ({
                        ...prev,
                        statusPrivacy: e.target.value,
                      }));
                    }}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 outline-none"
                  >
                    <option value="contacts">My Contacts Only</option>
                    <option value="everyone">Everyone</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                {/* Groups Privacy */}
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Who can add me to Groups
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Permissions for group creators
                    </p>
                  </div>
                  <select
                    value={preferences.groupAddPrivacy}
                    onChange={(e) => {
                      setPreferences((prev) => ({
                        ...prev,
                        groupAddPrivacy: e.target.value,
                      }));
                    }}
                    className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-800 outline-none"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts Only</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full rounded-xl bg-[#315EFF] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2852e8] sm:w-auto sm:py-1.5 sm:text-[11px]"
                  >
                    Save Changes
                  </button>
                </div>
              </section>
            )}

            {/* 4. PREFERENCES & NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <section className="space-y-4 rounded-[16px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <h2 className="text-[13px] font-semibold text-gray-900">
                  App & Workspace Preferences
                </h2>

                {/* Email Notifications */}
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Email notifications
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Digest of mentions and file activity every morning.
                    </p>
                  </div>
                  <Toggle
                    enabled={preferences.emailNotifications}
                    onClick={() => handleToggle("emailNotifications")}
                    label="Toggle email notifications"
                  />
                </div>

                {/* Desktop Notifications */}
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Desktop notifications
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Get notified when someone messages or calls you.
                    </p>
                  </div>
                  <Toggle
                    enabled={preferences.desktopNotifications}
                    onClick={() => handleToggle("desktopNotifications")}
                    label="Toggle desktop notifications"
                  />
                </div>

                {/* Call Ringtones */}
                <div className="flex min-w-0 items-center justify-between gap-3 border-b border-gray-100 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Call Alert Sounds
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Play ringtones for incoming voice and video calls.
                    </p>
                  </div>
                  <Toggle
                    enabled={preferences.callRingtone}
                    onClick={() => handleToggle("callRingtone")}
                    label="Toggle call sounds"
                  />
                </div>

                {/* Dark Mode */}
                <div className="flex min-w-0 items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-gray-900 sm:text-[12px]">
                      Dark Mode
                    </p>
                    <p className="text-[9px] text-gray-500 sm:text-[10px]">
                      Switch between Light and Dark purple theme.
                    </p>
                  </div>
                  <Toggle
                    enabled={theme === "dark"}
                    onClick={handleThemeToggle}
                    label="Toggle dark mode"
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="w-full rounded-xl bg-[#315EFF] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2852e8] sm:w-auto sm:py-1.5 sm:text-[11px]"
                  >
                    Save Preferences
                  </button>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function Toggle({ enabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative h-[16px] w-[30px] shrink-0 rounded-full transition-colors ${
        enabled ? "bg-[#315EFF]" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-transform ${
          enabled ? "left-[16px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default Settings;
