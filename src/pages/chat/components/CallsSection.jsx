import { useState, useEffect } from "react";
import {
  FiPhone,
  FiVideo,
  FiPhoneIncoming,
  FiPhoneOutgoing,
  FiPhoneMissed,
  FiPlus,
  FiTrash2,
  FiSearch,
  FiX,
  FiClock,
  FiMoreVertical,
} from "react-icons/fi";
import Avatar from "../../../components/common/Avatar";
import api from "../../../api/interceptors";

export default function CallsSection({
  currentUser,
  onStartCall, // function(targetUser, callType: 'voice' | 'video')
  friends = [],
}) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' | 'missed'
  const [showNewCallModal, setShowNewCallModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  // Load call history from server
  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/calls");
      setCalls(res.data?.calls || []);
    } catch (err) {
      console.error("Failed to load calls:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  // Delete a single call log
  const handleDeleteCall = async (callId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/calls/${callId}`);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
    } catch (err) {
      console.error("Failed to delete call:", err);
    }
  };

  // Clear all call logs
  const handleClearAllCalls = async () => {
    if (!window.confirm("Are you sure you want to clear your call history?")) return;
    try {
      await api.delete("/api/calls");
      setCalls([]);
      setMenuOpen(false);
    } catch (err) {
      console.error("Failed to clear calls:", err);
    }
  };

  // Filtered calls
  const displayedCalls = calls.filter((call) => {
    const isMissed =
      call.status === "missed" ||
      call.status === "rejected" ||
      (call.status === "busy" && String(call.caller?._id || call.caller) !== currentUserId);

    if (filter === "missed" && !isMissed) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const otherUser = getOtherParticipant(call, currentUserId);
      const name = otherUser?.name || otherUser?.username || "";
      return name.toLowerCase().includes(q);
    }

    return true;
  });

  // Filtered friends for new call modal
  const filteredFriends = friends.filter((f) => {
    const name = f.name || f.username || f.email || "";
    return name.toLowerCase().includes(friendSearch.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5">
        <div>
          <h2 className="text-[14px] font-bold text-gray-900">Calls</h2>
          <p className="text-[10px] text-gray-500">Voice and video call history</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNewCallModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#315EFF] px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition hover:bg-[#2852e8] active:scale-95"
          >
            <FiPlus size={14} />
            <span>New Call</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:bg-gray-50"
            >
              <FiMoreVertical size={14} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-10 z-30 w-36 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleClearAllCalls}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] text-red-600 hover:bg-red-50"
                >
                  <FiTrash2 size={13} />
                  <span>Clear call log</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="border-b border-gray-100 px-4 py-2.5">
        <div className="mb-2.5 flex rounded-xl bg-gray-100 p-0.5">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-lg py-1 text-[11px] font-semibold transition ${
              filter === "all"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Calls
          </button>
          <button
            type="button"
            onClick={() => setFilter("missed")}
            className={`flex-1 rounded-lg py-1 text-[11px] font-semibold transition ${
              filter === "missed"
                ? "bg-white text-red-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Missed
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13} />
          <input
            type="text"
            placeholder="Search call history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-[#F8FAFF] py-1.5 pl-8 pr-3 text-[11px] text-gray-800 outline-none transition focus:border-[#315EFF] focus:bg-white"
          />
        </div>
      </div>

      {/* Calls List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#315EFF] border-t-transparent mb-2" />
            <p className="text-[11px]">Loading call history...</p>
          </div>
        ) : displayedCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#315EFF] mb-2">
              <FiPhone size={20} />
            </div>
            <p className="text-[12px] font-semibold text-gray-800">
              {filter === "missed" ? "No missed calls" : "No recent calls"}
            </p>
            <p className="mt-0.5 max-w-[220px] text-[10px] text-gray-400">
              {filter === "missed"
                ? "You're all caught up with your incoming calls."
                : "Start high quality 1:1 voice and video calls with your contacts anytime."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedCalls.map((call) => {
              const otherUser = getOtherParticipant(call, currentUserId);
              const isCaller = String(call.caller?._id || call.caller) === currentUserId;
              const isMissed =
                !isCaller && (call.status === "missed" || call.status === "rejected");

              return (
                <div
                  key={call._id}
                  className="group flex items-center justify-between rounded-2xl p-2.5 transition hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={otherUser} size={42} />

                    <div className="min-w-0">
                      <h4
                        className={`truncate text-[12px] font-semibold ${
                          isMissed ? "text-red-600" : "text-gray-900"
                        }`}
                      >
                        {otherUser?.name || otherUser?.username || "Contact"}
                      </h4>

                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                        {isCaller ? (
                          <span className="flex items-center gap-1 text-blue-500">
                            <FiPhoneOutgoing size={11} />
                            <span>Outgoing</span>
                          </span>
                        ) : isMissed ? (
                          <span className="flex items-center gap-1 text-red-500">
                            <FiPhoneMissed size={11} />
                            <span>Missed</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-500">
                            <FiPhoneIncoming size={11} />
                            <span>Incoming</span>
                          </span>
                        )}

                        <span>•</span>
                        <span>{formatCallDate(call.createdAt)}</span>

                        {call.duration > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(call.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Call Back / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onStartCall?.(otherUser, "voice")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-blue-50 hover:text-[#315EFF]"
                      title="Voice call"
                    >
                      <FiPhone size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onStartCall?.(otherUser, "video")}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-500 transition hover:bg-blue-50 hover:text-[#315EFF]"
                      title="Video call"
                    >
                      <FiVideo size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteCall(call._id, e)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      title="Delete log"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* START NEW CALL MODAL */}
      {showNewCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">Start New Call</h3>
                <p className="text-[10px] text-gray-400">Select a contact to call</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCallModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Friend Search */}
            <div className="border-b border-gray-100 p-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={13} />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-[#F8FAFF] py-1.5 pl-8 pr-3 text-[11px] text-gray-800 outline-none focus:border-[#315EFF] focus:bg-white"
                />
              </div>
            </div>

            {/* Contacts List */}
            <div className="max-h-72 overflow-y-auto p-3 space-y-1">
              {filteredFriends.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-gray-400">
                  No contacts found. Add friends to start calling!
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center justify-between rounded-xl p-2 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={friend} size={38} />
                      <div>
                        <h4 className="text-[12px] font-semibold text-gray-900">
                          {friend.name || friend.username}
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          {friend.online ? (
                            <span className="text-green-500 font-medium">Online</span>
                          ) : (
                            "Offline"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCallModal(false);
                          onStartCall?.(friend, "voice");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#315EFF] transition hover:bg-[#315EFF] hover:text-white"
                        title="Voice Call"
                      >
                        <FiPhone size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCallModal(false);
                          onStartCall?.(friend, "video");
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-[#315EFF] transition hover:bg-[#315EFF] hover:text-white"
                        title="Video Call"
                      >
                        <FiVideo size={13} />
                      </button>
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

// Helpers
function getOtherParticipant(call, currentUserId) {
  if (String(call.caller?._id || call.caller) === currentUserId) {
    return call.recipient;
  }
  return call.caller;
}

function formatDuration(sec) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatCallDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${timeStr}`;
  return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
}
