import { useState, useEffect, useRef } from "react";
import {
  FiPlus,
  FiUsers,
  FiSearch,
  FiCheck,
  FiX,
  FiSettings,
  FiLink,
  FiCopy,
  FiRefreshCw,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiShield,
  FiCamera,
  FiInfo,
  FiEdit2,
  FiLogOut,
} from "react-icons/fi";
import Avatar from "../../../components/common/Avatar";
import api from "../../../api/interceptors";

export default function GroupSection({
  currentUser,
  onSelectGroup,
  selectedGroupId,
  socket,
}) {
  const fileInputRef = useRef(null);
  const editAvatarInputRef = useRef(null);

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Drawers
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [activeManageGroup, setActiveManageGroup] = useState(null);

  // Create Group Form
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAvatarFile, setGroupAvatarFile] = useState(null);
  const [groupAvatarPreview, setGroupAvatarPreview] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [availableFriends, setAvailableFriends] = useState([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [createError, setCreateError] = useState("");

  // Manage Group State
  const [manageTab, setManageTab] = useState("members"); // 'members' | 'permissions' | 'invite' | 'requests'
  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [resettingInvite, setResettingInvite] = useState(false);
  const [managingAction, setManagingAction] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState([]);

  // =====================================================
  // LOAD GROUPS & FRIENDS
  // =====================================================

  const loadGroups = async () => {
    try {
      const response = await api.get("/conversations", {
        params: { type: "group" },
      });
      setGroups(response.data?.conversations || []);
    } catch (error) {
      console.error("Load groups error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await api.get("/friends");
      setAvailableFriends(response.data?.friends || []);
    } catch (error) {
      console.error("Load friends for group creation error:", error);
    }
  };

  useEffect(() => {
    if (!currentUserId) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setGroups([]);
    setLoading(true);
    loadGroups();
    loadFriends();
  }, [currentUserId]);

  // Socket listeners for group updates
  useEffect(() => {
    if (!socket) return;

    const handleGroupCreated = (newGroup) => {
      setGroups((prev) => {
        const exists = prev.some((g) => String(g._id) === String(newGroup._id));
        if (exists) return prev;
        return [newGroup, ...prev];
      });
    };

    const handleGroupUpdated = (updatedGroup) => {
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(updatedGroup._id) ? updatedGroup : g,
        ),
      );
      if (
        activeManageGroup &&
        String(activeManageGroup._id) === String(updatedGroup._id)
      ) {
        setActiveManageGroup(updatedGroup);
      }
    };

    const handleMemberRemoved = ({ conversationId, userId, conversation }) => {
      if (String(userId) === currentUserId) {
        setGroups((prev) =>
          prev.filter((g) => String(g._id) !== String(conversationId)),
        );
        if (
          activeManageGroup &&
          String(activeManageGroup._id) === String(conversationId)
        ) {
          setShowManageModal(false);
        }
      } else if (conversation) {
        handleGroupUpdated(conversation);
      }
    };

    const handleGroupDeleted = ({ conversationId }) => {
      setGroups((prev) =>
        prev.filter((g) => String(g._id) !== String(conversationId)),
      );
      if (
        activeManageGroup &&
        String(activeManageGroup._id) === String(conversationId)
      ) {
        setShowManageModal(false);
      }
    };

    socket.on("group:created", handleGroupCreated);
    socket.on("group:updated", handleGroupUpdated);
    socket.on("group:member_added", ({ conversation }) =>
      handleGroupUpdated(conversation),
    );
    socket.on("group:member_removed", handleMemberRemoved);
    socket.on("group:member_promoted", ({ conversation }) =>
      handleGroupUpdated(conversation),
    );
    socket.on("group:member_demoted", ({ conversation }) =>
      handleGroupUpdated(conversation),
    );
    socket.on("group:join_request", ({ conversation }) =>
      handleGroupUpdated(conversation),
    );
    socket.on("group:deleted", handleGroupDeleted);

    return () => {
      socket.off("group:created", handleGroupCreated);
      socket.off("group:updated", handleGroupUpdated);
      socket.off("group:member_added");
      socket.off("group:member_removed", handleMemberRemoved);
      socket.off("group:member_promoted");
      socket.off("group:member_demoted");
      socket.off("group:join_request");
      socket.off("group:deleted", handleGroupDeleted);
    };
  }, [socket, currentUserId, activeManageGroup]);

  // =====================================================
  // CREATE GROUP HANDLERS
  // =====================================================

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGroupAvatarFile(file);
      setGroupAvatarPreview(URL.createObjectURL(file));
    }
  };

  const toggleFriendSelection = (friendId) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId],
    );
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setCreateError("Please enter a group name");
      return;
    }

    setCreatingGroup(true);
    setCreateError("");

    try {
      const formData = new FormData();
      formData.append("name", groupName.trim());
      formData.append("description", groupDescription.trim());
      selectedFriendIds.forEach((id) => formData.append("memberIds", id));
      if (groupAvatarFile) {
        formData.append("avatar", groupAvatarFile);
      }

      const response = await api.post("/conversations/groups", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newGroup = response.data?.conversation;
      if (newGroup) {
        setGroups((prev) => [newGroup, ...prev]);
        setShowCreateModal(false);
        setGroupName("");
        setGroupDescription("");
        setGroupAvatarFile(null);
        setGroupAvatarPreview("");
        setSelectedFriendIds([]);
        if (onSelectGroup) {
          onSelectGroup(newGroup);
        }
      }
    } catch (err) {
      console.error("Create group error:", err);
      setCreateError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // =====================================================
  // MANAGE GROUP HANDLERS
  // =====================================================

  const openManageGroup = (group, e) => {
    e.stopPropagation();
    setActiveManageGroup(group);
    setEditName(group.name || "");
    setEditDesc(group.description || "");
    setEditingInfo(false);
    setShowManageModal(true);
  };

  const isCurrentUserOwner = (group) => {
    const g = group || activeManageGroup;
    if (!g) return false;
    const member = g.members?.find(
      (m) => String(m.userId?._id || m.userId) === currentUserId,
    );
    return (
      member?.role === "owner" ||
      String(g.createdBy?._id || g.createdBy) === currentUserId
    );
  };

  const isCurrentUserAdmin = (group) => {
    const g = group || activeManageGroup;
    if (!g) return false;
    const member = g.members?.find(
      (m) => String(m.userId?._id || m.userId) === currentUserId,
    );
    return (
      member?.role === "admin" ||
      member?.role === "owner" ||
      String(g.createdBy?._id || g.createdBy) === currentUserId
    );
  };

  const handleSaveGroupInfo = async () => {
    if (!activeManageGroup) return;
    setSavingInfo(true);
    try {
      const formData = new FormData();
      formData.append("name", editName.trim());
      formData.append("description", editDesc.trim());

      const response = await api.patch(
        `/conversations/${activeManageGroup._id}/info`,
        formData,
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
        setEditingInfo(false);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update group info");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleEditAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeManageGroup) return;

    setSavingInfo(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await api.patch(
        `/conversations/${activeManageGroup._id}/info`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update group photo");
    } finally {
      setSavingInfo(false);
      if (editAvatarInputRef.current) editAvatarInputRef.current.value = "";
    }
  };

  const handleTogglePermission = async (key, val) => {
    if (!activeManageGroup) return;
    try {
      const response = await api.patch(
        `/conversations/${activeManageGroup._id}/permissions`,
        { [key]: val },
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update permissions");
    }
  };

  const handleRoleChange = async (targetUserId, role) => {
    if (!activeManageGroup) return;
    try {
      const response = await api.patch(
        `/conversations/${activeManageGroup._id}/members/${targetUserId}/role`,
        { role },
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to change role");
    }
  };

  const handleRemoveMember = async (targetUserId) => {
    if (!activeManageGroup || !window.confirm("Remove this member from group?"))
      return;
    try {
      const response = await api.delete(
        `/conversations/${activeManageGroup._id}/members/${targetUserId}`,
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleTransferOwnership = async (targetUserId) => {
    if (
      !activeManageGroup ||
      !window.confirm("Transfer group ownership to this member?")
    )
      return;
    try {
      const response = await api.post(
        `/conversations/${activeManageGroup._id}/transfer-ownership`,
        { newOwnerId: targetUserId },
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to transfer ownership");
    }
  };

  const handleAddMembersSubmit = async () => {
    if (!activeManageGroup || !newMemberIds.length) return;
    setManagingAction(true);
    try {
      const response = await api.post(
        `/conversations/${activeManageGroup._id}/members`,
        { userIds: newMemberIds },
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
        setShowAddMemberModal(false);
        setNewMemberIds([]);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add members");
    } finally {
      setManagingAction(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!activeManageGroup?.inviteCode) return;
    const inviteUrl = `${window.location.origin}/chat?join=${activeManageGroup.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleResetInviteLink = async () => {
    if (!activeManageGroup) return;
    setResettingInvite(true);
    try {
      const response = await api.post(
        `/conversations/${activeManageGroup._id}/invite-link/reset`,
      );
      if (response.data?.inviteCode) {
        setActiveManageGroup((prev) => ({
          ...prev,
          inviteCode: response.data.inviteCode,
        }));
        alert("Invite link reset successfully. Previous link is now invalid.");
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset invite link");
    } finally {
      setResettingInvite(false);
    }
  };

  const handleApproveRequest = async (targetUserId) => {
    if (!activeManageGroup) return;
    try {
      const response = await api.post(
        `/conversations/${activeManageGroup._id}/requests/${targetUserId}/approve`,
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve request");
    }
  };

  const handleRejectRequest = async (targetUserId) => {
    if (!activeManageGroup) return;
    try {
      const response = await api.post(
        `/conversations/${activeManageGroup._id}/requests/${targetUserId}/reject`,
      );
      if (response.data?.conversation) {
        setActiveManageGroup(response.data.conversation);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reject request");
    }
  };

  const handleDeleteGroup = async () => {
    if (
      !activeManageGroup ||
      !window.confirm(
        "Are you sure you want to permanently delete this group? All messages and shared files will be deleted.",
      )
    )
      return;
    try {
      await api.delete(`/conversations/${activeManageGroup._id}/group`);
      setShowManageModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete group");
    }
  };

  const handleLeaveGroup = async () => {
    if (!activeManageGroup || !window.confirm("Leave this group?")) return;
    try {
      await api.delete(`/conversations/${activeManageGroup._id}/members/me`);
      setShowManageModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave group");
    }
  };

  // Filter groups
  const filteredGroups = groups.filter((g) =>
    (g.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      {/* =====================================================
          HEADER & SEARCH
      ===================================================== */}
      <div className="border-b border-gray-200 p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Group Chats</h2>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
          >
            <FiPlus size={14} />
            <span>New Group</span>
          </button>
        </div>

        <div className="flex items-center rounded-xl bg-[#F5F7FB] px-3 py-2">
          <FiSearch className="shrink-0 text-gray-400" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search groups..."
            className="ml-2 w-full bg-transparent text-xs outline-none"
          />
        </div>
      </div>

      {/* =====================================================
          GROUP LIST
      ===================================================== */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400">
            Loading groups...
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-400">
            <FiUsers size={32} className="mb-2 text-gray-300" />
            <p className="text-xs font-medium text-gray-600">No groups yet</p>
            <p className="mt-1 text-[11px] text-gray-400">
              Create a group to start collaborating with friends.
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroupId === group._id;
            const memberCount = group.members?.length || 0;
            const isOwner = isCurrentUserOwner(group);
            const isAdmin = isCurrentUserAdmin(group);
            const pendingCount = (group.joinRequests || []).length;

            return (
              <div
                key={group._id}
                onClick={() => onSelectGroup && onSelectGroup(group)}
                className={`group flex cursor-pointer items-center justify-between border-b border-gray-100 px-3 py-3 transition sm:px-4 ${
                  isSelected
                    ? "border-l-4 border-l-blue-600 bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    src={group.avatar}
                    name={group.name}
                    size="md"
                    previewable
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-xs font-semibold text-gray-900">
                        {group.name}
                      </h3>
                      {isOwner && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-medium text-amber-800">
                          Owner
                        </span>
                      )}
                      {!isOwner && isAdmin && (
                        <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[9px] font-medium text-blue-800">
                          Admin
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-[10px] text-gray-500">
                      {group.description || `${memberCount} members`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {pendingCount > 0 && isAdmin && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-xs">
                      {pendingCount}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={(e) => openManageGroup(group, e)}
                    className="rounded-lg p-1.5 text-gray-400 opacity-80 transition hover:bg-gray-100 hover:text-gray-700"
                    title="Group Settings & Members"
                    aria-label="Group settings"
                  >
                    <FiSettings size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* =====================================================
          CREATE GROUP MODAL
      ===================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-bold text-gray-900">
                Create New Group
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="p-5">
              {createError && (
                <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                  {createError}
                </div>
              )}

              {/* Photo & Name */}
              <div className="mb-4 flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 border border-gray-200 overflow-hidden">
                    {groupAvatarPreview ? (
                      <img
                        src={groupAvatarPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FiUsers size={22} className="text-gray-400" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm"
                  >
                    <FiCamera size={11} />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Design Team, Project Alpha"
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="mb-1 block text-[11px] font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What is this group about?"
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:bg-white resize-none"
                />
              </div>

              {/* Add Members */}
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Select Members ({selectedFriendIds.length} selected)
                  </label>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 space-y-1">
                  {availableFriends.length === 0 ? (
                    <p className="p-2 text-center text-[11px] text-gray-400">
                      No friends available to add
                    </p>
                  ) : (
                    availableFriends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend._id);
                      return (
                        <div
                          key={friend._id}
                          onClick={() => toggleFriendSelection(friend._id)}
                          className="flex cursor-pointer items-center justify-between rounded-md p-1.5 hover:bg-white transition"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar user={friend} size="xs" />
                            <span className="text-xs font-medium text-gray-800">
                              {friend.name || friend.username}
                            </span>
                          </div>
                          <div
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white"
                                : "border-gray-300 bg-white"
                            }`}
                          >
                            {isSelected && <FiCheck size={11} />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingGroup || !groupName.trim()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {creatingGroup ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          MANAGE GROUP MODAL
      ===================================================== */}
      {showManageModal && activeManageGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    src={activeManageGroup.avatar}
                    name={activeManageGroup.name}
                    size="md"
                    previewable
                  />
                  {isCurrentUserAdmin(activeManageGroup) && (
                    <>
                      <input
                        ref={editAvatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEditAvatarChange}
                      />
                      <button
                        type="button"
                        onClick={() => editAvatarInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm"
                        title="Change group photo"
                      >
                        <FiCamera size={9} />
                      </button>
                    </>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {activeManageGroup.name}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    {activeManageGroup.members?.length || 0} members
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5 text-xs">
              <button
                type="button"
                onClick={() => setManageTab("members")}
                className={`py-3 font-semibold border-b-2 transition mr-4 ${
                  manageTab === "members"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Members ({activeManageGroup.members?.length || 0})
              </button>

              <button
                type="button"
                onClick={() => setManageTab("invite")}
                className={`py-3 font-semibold border-b-2 transition mr-4 ${
                  manageTab === "invite"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                Invite Link
              </button>

              {isCurrentUserAdmin(activeManageGroup) && (
                <button
                  type="button"
                  onClick={() => setManageTab("permissions")}
                  className={`py-3 font-semibold border-b-2 transition mr-4 ${
                    manageTab === "permissions"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Permissions
                </button>
              )}

              {isCurrentUserAdmin(activeManageGroup) &&
                (activeManageGroup.joinRequests || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setManageTab("requests")}
                    className={`py-3 font-semibold border-b-2 transition ${
                      manageTab === "requests"
                        ? "border-rose-600 text-rose-600"
                        : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    Requests ({(activeManageGroup.joinRequests || []).length})
                  </button>
                )}
            </div>

            {/* Body Content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-4">
              {/* MEMBERS TAB */}
              {manageTab === "members" && (
                <div className="space-y-3">
                  {/* Edit Info Box */}
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    {editingInfo ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Group name"
                          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                        />
                        <textarea
                          rows={2}
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Group description"
                          className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingInfo(false)}
                            className="rounded-md px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={savingInfo}
                            onClick={handleSaveGroupInfo}
                            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                          >
                            {savingInfo ? "Saving..." : "Save Info"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-900">
                            {activeManageGroup.name}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {activeManageGroup.description ||
                              "No description provided."}
                          </p>
                        </div>
                        {(isCurrentUserAdmin(activeManageGroup) ||
                          activeManageGroup.permissions?.editGroupInfo ===
                            "all") && (
                          <button
                            type="button"
                            onClick={() => setEditingInfo(true)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Edit group info"
                          >
                            <FiEdit2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add Member Button */}
                  {(isCurrentUserAdmin(activeManageGroup) ||
                    activeManageGroup.permissions?.addMembers === "all") && (
                    <button
                      type="button"
                      onClick={() => setShowAddMemberModal(true)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 py-2.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                    >
                      <FiPlus size={14} />
                      Add Members
                    </button>
                  )}

                  {/* Member List */}
                  <div className="space-y-1.5">
                    {activeManageGroup.members?.map((m) => {
                      const u = m.userId || {};
                      const uId = String(u._id || u.id || u);
                      const isMe = uId === currentUserId;
                      const role = m.role || "member";

                      return (
                        <div
                          key={uId}
                          className="flex items-center justify-between rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar user={u} size="sm" previewable />
                            <div>
                              <p className="text-xs font-semibold text-gray-900">
                                {u.name || u.username || "User"}{" "}
                                {isMe && "(You)"}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                @{u.username || "syncspace"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Role Badge */}
                            {role === "owner" ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                                Owner
                              </span>
                            ) : role === "admin" ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-800">
                                Admin
                              </span>
                            ) : null}

                            {/* Actions if current user is admin/owner */}
                            {!isMe && isCurrentUserAdmin(activeManageGroup) && (
                              <div className="flex items-center gap-1">
                                {isCurrentUserOwner(activeManageGroup) && (
                                  <>
                                    {role !== "owner" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleRoleChange(
                                            uId,
                                            role === "admin"
                                              ? "member"
                                              : "admin",
                                          )
                                        }
                                        className="rounded-md border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
                                      >
                                        {role === "admin"
                                          ? "Demote"
                                          : "Make Admin"}
                                      </button>
                                    )}

                                    {role !== "owner" && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleTransferOwnership(uId)
                                        }
                                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-100"
                                      >
                                        Transfer Owner
                                      </button>
                                    )}
                                  </>
                                )}

                                {role !== "owner" && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMember(uId)}
                                    className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                                    title="Remove member"
                                  >
                                    <FiTrash2 size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Leave / Delete Group Footer */}
                  <div className="border-t border-gray-100 pt-4 flex justify-between">
                    <button
                      type="button"
                      onClick={handleLeaveGroup}
                      className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      <FiLogOut size={14} />
                      Leave Group
                    </button>

                    {isCurrentUserOwner(activeManageGroup) && (
                      <button
                        type="button"
                        onClick={handleDeleteGroup}
                        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        <FiTrash2 size={14} />
                        Delete Group
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* INVITE LINK TAB */}
              {manageTab === "invite" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2">
                      <FiLink className="text-blue-600" />
                      Group Invite Link
                    </div>
                    <p className="text-[11px] text-gray-500 mb-3">
                      Anyone with this link can join or request to join this
                      group.
                    </p>

                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-xs">
                      <span className="truncate flex-1 font-mono text-[11px] text-gray-700">
                        {`${window.location.origin}/chat?join=${activeManageGroup.inviteCode || "loading"}`}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyInviteLink}
                        className="flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                      >
                        <FiCopy size={12} />
                        {copiedInvite ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  {isCurrentUserAdmin(activeManageGroup) && (
                    <div className="rounded-xl border border-gray-100 p-4">
                      <h4 className="text-xs font-semibold text-gray-900 mb-1">
                        Reset Invite Link
                      </h4>
                      <p className="text-[11px] text-gray-500 mb-3">
                        If this link is being shared inappropriately, reset it
                        to generate a new code and invalidate the old one.
                      </p>
                      <button
                        type="button"
                        disabled={resettingInvite}
                        onClick={handleResetInviteLink}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
                      >
                        <FiRefreshCw size={12} />
                        {resettingInvite ? "Resetting..." : "Reset Invite Link"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PERMISSIONS TAB */}
              {manageTab === "permissions" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
                    {/* Edit Info */}
                    <div className="flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          Edit Group Info
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Who can change name, description, and photo
                        </p>
                      </div>
                      <select
                        value={
                          activeManageGroup.permissions?.editGroupInfo || "all"
                        }
                        onChange={(e) =>
                          handleTogglePermission(
                            "editGroupInfo",
                            e.target.value,
                          )
                        }
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="admins">Admins Only</option>
                      </select>
                    </div>

                    {/* Send Messages */}
                    <div className="flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          Send Messages
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Who can send messages in this group chat
                        </p>
                      </div>
                      <select
                        value={
                          activeManageGroup.permissions?.sendMessages || "all"
                        }
                        onChange={(e) =>
                          handleTogglePermission("sendMessages", e.target.value)
                        }
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="admins">Admins Only</option>
                      </select>
                    </div>

                    {/* Add Members */}
                    <div className="flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          Add Members
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Who can add new members directly
                        </p>
                      </div>
                      <select
                        value={
                          activeManageGroup.permissions?.addMembers || "admins"
                        }
                        onChange={(e) =>
                          handleTogglePermission("addMembers", e.target.value)
                        }
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="admins">Admins Only</option>
                      </select>
                    </div>

                    {/* Approve New Members */}
                    <div className="flex items-center justify-between p-3.5">
                      <div>
                        <p className="text-xs font-semibold text-gray-900">
                          Approve New Members
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Require admin approval when joining via invite link
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(
                          activeManageGroup.permissions?.approveMembers,
                        )}
                        onChange={(e) =>
                          handleTogglePermission(
                            "approveMembers",
                            e.target.checked,
                          )
                        }
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* REQUESTS TAB */}
              {manageTab === "requests" && (
                <div className="space-y-2">
                  {(activeManageGroup.joinRequests || []).length === 0 ? (
                    <p className="p-4 text-center text-xs text-gray-400">
                      No pending join requests
                    </p>
                  ) : (
                    activeManageGroup.joinRequests?.map((req) => {
                      const u = req.userId || {};
                      const uId = String(u._id || u);
                      return (
                        <div
                          key={uId}
                          className="flex items-center justify-between rounded-xl border border-gray-100 p-3 bg-gray-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar user={u} size="sm" />
                            <div>
                              <p className="text-xs font-semibold text-gray-900">
                                {u.name || u.username}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                Wants to join
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveRequest(uId)}
                              className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700"
                            >
                              <FiCheck size={12} />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectRequest(uId)}
                              className="flex items-center gap-1 rounded-md bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-300"
                            >
                              <FiX size={12} />
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD MEMBER MODAL (Inside Manage)
      ===================================================== */}
      {showAddMemberModal && activeManageGroup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-gray-900 mb-3">
              Add Members to {activeManageGroup.name}
            </h4>

            <div className="max-h-48 overflow-y-auto space-y-1 mb-4 rounded-lg border border-gray-100 p-2">
              {availableFriends
                .filter(
                  (f) =>
                    !activeManageGroup.members?.some(
                      (m) =>
                        String(m.userId?._id || m.userId) === String(f._id),
                    ),
                )
                .map((f) => {
                  const isChecked = newMemberIds.includes(f._id);
                  return (
                    <div
                      key={f._id}
                      onClick={() =>
                        setNewMemberIds((prev) =>
                          prev.includes(f._id)
                            ? prev.filter((id) => id !== f._id)
                            : [...prev, f._id],
                        )
                      }
                      className="flex cursor-pointer items-center justify-between p-1.5 rounded-md hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar user={f} size="xs" />
                        <span className="text-xs font-medium text-gray-800">
                          {f.name || f.username}
                        </span>
                      </div>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isChecked && <FiCheck size={11} />}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddMemberModal(false);
                  setNewMemberIds([]);
                }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={managingAction || !newMemberIds.length}
                onClick={handleAddMembersSubmit}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {managingAction ? "Adding..." : "Add Selected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
