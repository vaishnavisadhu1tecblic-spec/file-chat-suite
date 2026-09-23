import { useState, useEffect, useRef } from "react";
import {
  FiPlus,
  FiEye,
  FiTrash2,
  FiX,
  FiImage,
  FiMusic,
  FiSend,
  FiChevronLeft,
  FiChevronRight,
  FiPlay,
  FiPause,
  FiVolume2,
  FiVolumeX,
  FiClock,
  FiType,
} from "react-icons/fi";
import Avatar from "../../../components/common/Avatar";
import api from "../../../api/interceptors";

const API_BASE = (
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3005/api"
).replace(/\/+$/, "");

const BG_GRADIENTS = [
  "linear-gradient(135deg, #315EFF 0%, #00D2FF 100%)",
  "linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)",
  "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
  "linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)",
  "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
  "linear-gradient(135deg, #0F2027 0%, #203A43 50%, #2C5364 100%)",
  "linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)",
  "linear-gradient(135deg, #1A1A24 0%, #2B2D42 100%)",
];

const FONTS = [
  { label: "Modern", value: "font-sans font-semibold" },
  { label: "Serif", value: "font-serif italic" },
  { label: "Mono", value: "font-mono font-medium" },
  { label: "Bold Display", value: "font-extrabold uppercase tracking-wider" },
];

export default function StatusSection({ currentUser, onOpenDirectChat }) {
  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const [statusesByUser, setStatusesByUser] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Status Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createType, setCreateType] = useState("media"); // 'media' | 'text'
  const [statusText, setStatusText] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_GRADIENTS[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0].value);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [mediaType, setMediaType] = useState(""); // 'image' | 'video'
  const [audioFile, setAudioFile] = useState(null);
  const [audioFileName, setAudioFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Status Story Viewer
  const [activeStoryGroup, setActiveStoryGroup] = useState(null); // { user, statuses }
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);

  // Viewers Sheet for own status
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const mediaInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const storyAudioRef = useRef(null);
  const storyVideoRef = useRef(null);
  const timerRef = useRef(null);

  // Fetch all active statuses
  const fetchStatuses = async () => {
    try {
      setLoading(true);
      const res = await api.get("/status");
      const myStatusesData = res.data?.myStatuses;
      const recentUpdatesData = res.data?.recentUpdates;
      const viewedUpdatesData = res.data?.viewedUpdates;

      if (myStatusesData || recentUpdatesData || viewedUpdatesData) {
        setMyStatuses(myStatusesData || []);
        const friendsGroups = [
          ...(recentUpdatesData || []),
          ...(viewedUpdatesData || []),
        ];
        setStatusesByUser(friendsGroups);
      } else {
        const data = res.data?.statuses || [];
        const myItems = [];
        const friendsMap = {};

        data.forEach((status) => {
          const userObj = status.user || status.userId;
          const creatorId = String(
            userObj?._id || userObj?.id || userObj || ""
          );
          const formatted = {
            ...status,
            user: userObj,
          };
          if (creatorId === currentUserId) {
            myItems.push(formatted);
          } else {
            if (!friendsMap[creatorId]) {
              friendsMap[creatorId] = {
                user: userObj,
                statuses: [],
                hasUnseen: false,
              };
            }
            friendsMap[creatorId].statuses.push(formatted);
            const viewedByMe = (status.viewers || []).some(
              (v) =>
                String(
                  v.userId?._id ||
                    v.userId?.id ||
                    v.userId ||
                    v.user?._id ||
                    v.user
                ) === currentUserId
            );
            if (!viewedByMe) {
              friendsMap[creatorId].hasUnseen = true;
            }
          }
        });

        setMyStatuses(myItems);
        setStatusesByUser(Object.values(friendsMap));
      }
    } catch (err) {
      console.error("Failed to load statuses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [currentUserId]);

  // Handle Media Select
  const handleMediaSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size cannot exceed 50MB");
      return;
    }

    setUploadError("");
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setMediaPreview(URL.createObjectURL(file));
  };

  // Handle Audio Select
  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Audio size cannot exceed 20MB");
      return;
    }

    setAudioFile(file);
    setAudioFileName(file.name);
  };

  // Upload Status
  const handleCreateStatus = async () => {
    if (createType === "text" && !statusText.trim()) {
      setUploadError("Please type a message for your status.");
      return;
    }
    if (createType === "media" && !mediaFile) {
      setUploadError("Please select a photo or video.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const formData = new FormData();
      formData.append("type", createType);

      if (createType === "text") {
        formData.append("text", statusText.trim());
        formData.append("bgColor", selectedBg);
        formData.append("fontStyle", selectedFont);
      } else {
        formData.append("media", mediaFile);
        if (statusText.trim()) {
          formData.append("text", statusText.trim());
        }
      }

      if (audioFile) {
        formData.append("audio", audioFile);
      }

      await api.post("/status", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Reset and close
      setShowCreateModal(false);
      setStatusText("");
      setMediaFile(null);
      setMediaPreview("");
      setAudioFile(null);
      setAudioFileName("");
      fetchStatuses();
    } catch (err) {
      console.error("Create status error:", err);
      setUploadError(err.response?.data?.message || "Failed to post status");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete own status
  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm("Are you sure you want to delete this status?")) return;
    try {
      await api.delete(`/status/${statusId}`);
      // Remove from list
      setMyStatuses((prev) => prev.filter((s) => s._id !== statusId));
      if (activeStoryGroup) {
        const remaining = activeStoryGroup.statuses.filter((s) => s._id !== statusId);
        if (remaining.length === 0) {
          closeStoryViewer();
        } else {
          setActiveStoryGroup({ ...activeStoryGroup, statuses: remaining });
          if (activeStoryIndex >= remaining.length) {
            setActiveStoryIndex(0);
          }
        }
      }
    } catch (err) {
      console.error("Delete status error:", err);
    }
  };

  // Open Story Viewer
  const openStoryViewer = (storyGroup, startIndex = 0) => {
    setActiveStoryGroup(storyGroup);
    setActiveStoryIndex(startIndex);
    setStoryProgress(0);
    setIsPaused(false);
  };

  const closeStoryViewer = () => {
    setActiveStoryGroup(null);
    setActiveStoryIndex(0);
    setStoryProgress(0);
    setIsPaused(false);
    setShowViewersModal(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Mark status as viewed & fetch viewers when active
  useEffect(() => {
    if (!activeStoryGroup || !activeStoryGroup.statuses[activeStoryIndex]) return;

    const currentStatus = activeStoryGroup.statuses[activeStoryIndex];
    const isMine = String(currentStatus.user?._id || currentStatus.user?.id || currentStatus.user) === currentUserId;

    if (!isMine) {
      api.post(`/status/${currentStatus._id}/view`).catch(() => {});
    }

    // Story duration timer
    const duration = currentStatus.type === "video" ? 15000 : 6000;
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;

    setStoryProgress(0);

    if (timerRef.current) clearInterval(timerRef.current);

    if (!isPaused) {
      timerRef.current = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            // Move to next story or close
            if (activeStoryIndex < activeStoryGroup.statuses.length - 1) {
              setActiveStoryIndex((idx) => idx + 1);
            } else {
              closeStoryViewer();
            }
            return 0;
          }
          return prev + step;
        });
      }, intervalTime);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeStoryGroup, activeStoryIndex, isPaused]);

  // Load viewers for own status
  const handleOpenViewers = async () => {
    if (!activeStoryGroup) return;
    const currentStatus = activeStoryGroup.statuses[activeStoryIndex];
    if (!currentStatus) return;

    setIsPaused(true);
    setShowViewersModal(true);
    setLoadingViewers(true);

    try {
      const res = await api.get(`/status/${currentStatus._id}/viewers`);
      setViewersList(res.data?.viewers || []);
    } catch (err) {
      console.error("Failed to load viewers:", err);
    } finally {
      setLoadingViewers(false);
    }
  };

  const currentStatus = activeStoryGroup?.statuses[activeStoryIndex];
  const isCurrentMine =
    currentStatus &&
    String(currentStatus.user?._id || currentStatus.user?.id || currentStatus.user) === currentUserId;

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
        <div>
          <h2 className="text-[14px] font-bold text-gray-900">Status Updates</h2>
          <p className="text-[10px] text-gray-500">Stories disappear after 24 hours</p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#315EFF] px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-[#2852e8] active:scale-95"
        >
          <FiPlus size={14} />
          <span>Add Status</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* MY STATUS CARD */}
        <div className="mb-5 rounded-2xl border border-gray-100 bg-[#F8FAFF] p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div
              className="flex cursor-pointer items-center gap-3.5"
              onClick={() => {
                if (myStatuses.length > 0) {
                  openStoryViewer({ user: currentUser, statuses: myStatuses });
                } else {
                  setShowCreateModal(true);
                }
              }}
            >
              <div className="relative">
                <div
                  className={`rounded-full p-0.5 ${
                    myStatuses.length > 0
                      ? "bg-gradient-to-tr from-[#315EFF] to-[#00D2FF]"
                      : "border border-gray-200"
                  }`}
                >
                  <Avatar user={currentUser} size={48} showOnline={false} />
                </div>
                {myStatuses.length === 0 && (
                  <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#315EFF] text-white ring-2 ring-white">
                    <FiPlus size={10} />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-[12px] font-semibold text-gray-900">My Status</h3>
                <p className="text-[10px] text-gray-500">
                  {myStatuses.length > 0
                    ? `${myStatuses.length} active ${
                        myStatuses.length === 1 ? "story" : "stories"
                      } • Tap to view`
                    : "Tap to share an update"}
                </p>
              </div>
            </div>

            {myStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#315EFF] transition hover:bg-blue-100"
                title="Add another story"
              >
                <FiPlus size={16} />
              </button>
            )}
          </div>
        </div>

        {/* RECENT UPDATES SECTION */}
        <div>
          <h4 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Recent Updates
          </h4>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#315EFF] border-t-transparent mb-2" />
              <p className="text-[11px]">Loading updates...</p>
            </div>
          ) : statusesByUser.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#315EFF] mb-2">
                <FiClock size={20} />
              </div>
              <p className="text-[12px] font-medium text-gray-800">No recent updates</p>
              <p className="mt-0.5 max-w-[200px] text-[10px] text-gray-400">
                When your contacts share photos, videos, or music stories, they'll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {statusesByUser.map((group) => {
                const latest = group.statuses[group.statuses.length - 1];
                const timeAgo = formatTimeAgo(latest?.createdAt);

                return (
                  <div
                    key={group.user?._id || group.user?.id}
                    onClick={() => openStoryViewer(group)}
                    className="flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-full p-0.5 ${
                          group.hasUnseen
                            ? "bg-gradient-to-tr from-[#315EFF] via-[#8A2387] to-[#FF4E50]"
                            : "border border-gray-300"
                        }`}
                      >
                        <Avatar user={group.user} size={44} showOnline={false} />
                      </div>

                      <div>
                        <h4 className="text-[12px] font-semibold text-gray-900">
                          {group.user?.name || group.user?.username || "Contact"}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {timeAgo} • {group.statuses.length}{" "}
                          {group.statuses.length === 1 ? "update" : "updates"}
                        </p>
                      </div>
                    </div>

                    {group.hasUnseen && (
                      <span className="h-2 w-2 rounded-full bg-[#315EFF]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CREATE STATUS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-[14px] font-bold text-gray-900">Create New Story</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setMediaFile(null);
                  setMediaPreview("");
                  setAudioFile(null);
                  setAudioFileName("");
                  setStatusText("");
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex border-b border-gray-100 px-6 pt-3">
              <button
                type="button"
                onClick={() => setCreateType("media")}
                className={`flex items-center gap-2 border-b-2 pb-3 text-[12px] font-medium transition ${
                  createType === "media"
                    ? "border-[#315EFF] text-[#315EFF]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <FiImage size={15} />
                Photo / Video
              </button>
              <button
                type="button"
                onClick={() => setCreateType("text")}
                className={`ml-6 flex items-center gap-2 border-b-2 pb-3 text-[12px] font-medium transition ${
                  createType === "text"
                    ? "border-[#315EFF] text-[#315EFF]"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <FiType size={15} />
                Text Status
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {createType === "media" ? (
                <div>
                  {mediaPreview ? (
                    <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
                      {mediaType === "video" ? (
                        <video
                          src={mediaPreview}
                          className="h-full w-full object-contain"
                          controls
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Story preview"
                          className="h-full w-full object-contain"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview("");
                        }}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/80"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => mediaInputRef.current?.click()}
                      className="mb-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 transition hover:border-[#315EFF] hover:bg-blue-50/30"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#315EFF]">
                        <FiImage size={22} />
                      </div>
                      <p className="mt-2 text-[12px] font-semibold text-gray-700">
                        Choose a Photo or Video
                      </p>
                      <p className="text-[10px] text-gray-400">Supports JPG, PNG, MP4, WebM (Max 50MB)</p>
                    </div>
                  )}

                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaSelect}
                  />

                  {/* Optional Caption */}
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[12px] text-gray-800 outline-none focus:border-[#315EFF]"
                  />
                </div>
              ) : (
                <div>
                  {/* Text Status Live Canvas */}
                  <div
                    style={{ background: selectedBg }}
                    className="relative mb-4 flex aspect-[4/3] w-full flex-col items-center justify-center rounded-2xl p-6 text-center text-white shadow-inner"
                  >
                    <textarea
                      placeholder="Type your story..."
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                      maxLength={280}
                      rows={4}
                      className={`w-full resize-none bg-transparent text-center text-[18px] text-white placeholder-white/70 outline-none ${selectedFont}`}
                    />
                    <span className="absolute bottom-3 right-3 text-[10px] text-white/70">
                      {statusText.length}/280
                    </span>
                  </div>

                  {/* Gradient Color Swatches */}
                  <div className="mb-3">
                    <p className="mb-1.5 text-[10px] font-semibold text-gray-500">
                      Background Theme
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {BG_GRADIENTS.map((bg, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedBg(bg)}
                          style={{ background: bg }}
                          className={`h-7 w-7 shrink-0 rounded-full transition ${
                            selectedBg === bg
                              ? "ring-2 ring-[#315EFF] ring-offset-2 scale-110"
                              : "hover:opacity-90"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Font Styles */}
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold text-gray-500">Font Style</p>
                    <div className="flex gap-2">
                      {FONTS.map((f, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedFont(f.value)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                            selectedFont === f.value
                              ? "bg-[#315EFF] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Music / Audio Track Attachment */}
              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                      <FiMusic size={14} />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-gray-800">
                        {audioFileName ? audioFileName : "Attach Background Music"}
                      </p>
                      <p className="text-[9px] text-gray-400">Optional soundtrack for your status</p>
                    </div>
                  </div>

                  {audioFileName ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioFileName("");
                      }}
                      className="text-[10px] font-medium text-red-500 hover:underline"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Choose Audio
                    </button>
                  )}
                </div>

                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioSelect}
                />
              </div>

              {uploadError && (
                <p className="mt-3 text-[11px] text-red-600 font-medium">{uploadError}</p>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={handleCreateStatus}
                  className="flex items-center gap-2 rounded-xl bg-[#315EFF] px-5 py-2 text-[12px] font-semibold text-white shadow-md transition hover:bg-[#2852e8] disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <FiSend size={13} />
                      <span>Share to Status</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN STORY VIEWER */}
      {activeStoryGroup && currentStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md">
          {/* Main Story Container */}
          <div className="relative flex h-full max-h-[92vh] w-full max-w-md flex-col justify-between overflow-hidden rounded-3xl bg-neutral-900 shadow-2xl">
            {/* Top Bar: Progress Bars + Header */}
            <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 pb-8">
              {/* Segmented Progress Indicators */}
              <div className="mb-3 flex items-center gap-1.5">
                {activeStoryGroup.statuses.map((st, idx) => (
                  <div
                    key={st._id || idx}
                    className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
                  >
                    <div
                      className="h-full bg-white transition-all duration-75"
                      style={{
                        width:
                          idx < activeStoryIndex
                            ? "100%"
                            : idx === activeStoryIndex
                            ? `${storyProgress}%`
                            : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User Header */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Avatar user={activeStoryGroup.user} size={36} showOnline={false} />
                  <div>
                    <h4 className="text-[12px] font-bold">
                      {activeStoryGroup.user?.name ||
                        activeStoryGroup.user?.username ||
                        "Contact"}
                    </h4>
                    <p className="text-[9px] text-white/70">
                      {formatTimeAgo(currentStatus.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Pause / Play */}
                  <button
                    type="button"
                    onClick={() => setIsPaused((p) => !p)}
                    className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
                  >
                    {isPaused ? <FiPlay size={13} /> : <FiPause size={13} />}
                  </button>

                  {/* Audio Mute toggle if audio attached */}
                  {currentStatus.hasAudio && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMuted((m) => !m);
                        if (storyAudioRef.current) {
                          storyAudioRef.current.muted = !isMuted;
                        }
                      }}
                      className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
                    >
                      {isMuted ? <FiVolumeX size={13} /> : <FiVolume2 size={13} />}
                    </button>
                  )}

                  {/* Delete (if own story) */}
                  {isCurrentMine && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStatus(currentStatus._id)}
                      className="rounded-full bg-red-600/80 p-2 text-white hover:bg-red-600"
                      title="Delete this status"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  )}

                  {/* Close Viewer */}
                  <button
                    type="button"
                    onClick={closeStoryViewer}
                    className="rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
                  >
                    <FiX size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Middle: Content Canvas */}
            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden"
              onMouseDown={() => setIsPaused(true)}
              onMouseUp={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
            >
              {currentStatus.type === "text" ? (
                <div
                  style={{ background: currentStatus.bgColor || BG_GRADIENTS[0] }}
                  className="flex h-full w-full items-center justify-center p-8 text-center"
                >
                  <p
                    className={`max-w-xs text-[22px] leading-relaxed text-white drop-shadow-md ${
                      currentStatus.fontStyle || "font-sans font-semibold"
                    }`}
                  >
                    {currentStatus.text}
                  </p>
                </div>
              ) : currentStatus.mediaType === "video" ? (
                <video
                  ref={storyVideoRef}
                  src={`${API_BASE}/status/media/${currentStatus._id}`}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className="h-full w-full object-contain"
                />
              ) : (
                <img
                  src={`${API_BASE}/status/media/${currentStatus._id}`}
                  alt="Story"
                  className="h-full w-full object-contain"
                />
              )}

              {/* Background Music Player (if attached) */}
              {currentStatus.hasAudio && (
                <audio
                  ref={storyAudioRef}
                  src={`${API_BASE}/status/audio/${currentStatus._id}`}
                  autoPlay
                  loop
                  muted={isMuted}
                />
              )}

              {/* Caption Overlay (if media has caption) */}
              {currentStatus.type !== "text" && currentStatus.text && (
                <div className="absolute inset-x-0 bottom-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-center">
                  <p className="text-[12px] text-white drop-shadow-sm">
                    {currentStatus.text}
                  </p>
                </div>
              )}

              {/* Tap Left / Right Nav Touch Zones */}
              <button
                type="button"
                onClick={() => {
                  if (activeStoryIndex > 0) {
                    setActiveStoryIndex((idx) => idx - 1);
                  }
                }}
                className="absolute inset-y-0 left-0 w-1/3 cursor-pointer opacity-0"
                aria-label="Previous story"
              />
              <button
                type="button"
                onClick={() => {
                  if (activeStoryIndex < activeStoryGroup.statuses.length - 1) {
                    setActiveStoryIndex((idx) => idx + 1);
                  } else {
                    closeStoryViewer();
                  }
                }}
                className="absolute inset-y-0 right-0 w-1/3 cursor-pointer opacity-0"
                aria-label="Next story"
              />
            </div>

            {/* Bottom Bar: Viewers (if own) or Reply action */}
            <div className="relative z-20 border-t border-white/10 bg-black/70 p-3.5 backdrop-blur-md">
              {isCurrentMine ? (
                <button
                  type="button"
                  onClick={handleOpenViewers}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 py-2 text-[11px] font-semibold text-white transition hover:bg-white/25"
                >
                  <FiEye size={14} />
                  <span>{currentStatus.viewers?.length || 0} Views</span>
                </button>
              ) : (
                <div className="flex items-center justify-center text-center">
                  <span className="text-[10px] text-white/60">
                    SyncSpace 24-Hour Story
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEWERS MODAL */}
      {showViewersModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center p-0 sm:p-4">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FiEye className="text-[#315EFF]" size={16} />
                <h3 className="text-[13px] font-bold text-gray-900">
                  Viewed by ({viewersList.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowViewersModal(false);
                  setIsPaused(false);
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2.5">
              {loadingViewers ? (
                <div className="py-6 text-center text-[11px] text-gray-400">
                  Loading viewers...
                </div>
              ) : viewersList.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-gray-400">
                  No views yet
                </div>
              ) : (
                viewersList.map((viewer, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar user={viewer.user} size={32} showOnline={false} />
                      <div>
                        <p className="text-[11px] font-semibold text-gray-900">
                          {viewer.user?.name || viewer.user?.username || "Friend"}
                        </p>
                        <p className="text-[9px] text-gray-400">
                          {formatTimeAgo(viewer.viewedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Utility: Time ago formatter
function formatTimeAgo(dateStr) {
  if (!dateStr) return "Just now";
  const date = new Date(dateStr);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
