import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import socket from "../../socket";
import { appendUniqueMessage } from "../../utils/chatUtils";
import api from "../../api/interceptors";

import {
  FiSearch,
  FiPhone,
  FiVideo,
  FiMoreVertical,
  FiPaperclip,
  FiSmile,
  FiMic,
  FiSend,
  FiPlay,
  FiFileText,
  FiDownload,
  FiEye,
  FiImage,
  FiUserPlus,
  FiCheck,
  FiX,
  FiTrash2,
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

// const BACKEND_BASE = "http://localhost:3005";
const BACKEND_BASE = "http://192.168.0.102:3005";

const formatFileSize = (size) => {
  if (!size) {
    return "0 B";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentType = (attachment = {}) => {
  if (attachment.type === "image" || attachment.type === "video") {
    return attachment.type;
  }

  if (attachment.mimeType?.startsWith("image/")) {
    return "image";
  }

  if (attachment.mimeType?.startsWith("video/")) {
    return "video";
  }

  return "document";
};

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

/*
 * Supports the common unread-count response shapes:
 *
 * { counts: { conversationId: 3 } }
 * { unreadCounts: { conversationId: 3 } }
 * { data: { conversationId: 3 } }
 *
 * and array forms such as:
 *
 * [
 *   { conversationId: "...", count: 3 }
 * ]
 */
const normalizeUnreadCounts = (responseData) => {
  const source =
    responseData?.counts ??
    responseData?.unreadCounts ??
    responseData?.data ??
    responseData ??
    {};

  const normalized = {};

  if (Array.isArray(source)) {
    source.forEach((item) => {
      const key =
        item?.conversationId || item?.chatId || item?.id || item?._id || "";

      const count = Number(
        item?.count ?? item?.unreadCount ?? item?.unread ?? 0,
      );

      if (key && Number.isFinite(count)) {
        normalized[String(key)] = Math.max(0, count);
      }
    });

    return normalized;
  }

  if (source && typeof source === "object") {
    Object.entries(source).forEach(([key, value]) => {
      if (typeof value === "number") {
        normalized[String(key)] = Math.max(0, value);
        return;
      }

      if (typeof value === "string" && value.trim() !== "") {
        const count = Number(value);

        if (Number.isFinite(count)) {
          normalized[String(key)] = Math.max(0, count);
        }

        return;
      }

      if (value && typeof value === "object") {
        const count = Number(
          value.count ?? value.unreadCount ?? value.unread ?? 0,
        );

        if (Number.isFinite(count)) {
          normalized[String(key)] = Math.max(0, count);
        }
      }
    });
  }

  return normalized;
};

function Chat() {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previewRequestsRef = useRef(new Set());
  const messagesContainerRef = useRef(null);
  const chatSearchInputRef = useRef(null);
  const shouldScrollToBottomRef = useRef(false);
  const loadingOlderMessagesRef = useRef(false);

  // Typing refs
  const typingTimeoutRef = useRef(null);
  const typingChatRef = useRef(null);

  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState("");
  const [chats, setChats] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [friendActionState, setFriendActionState] = useState({});

  const [messagesByChat, setMessagesByChat] = useState({});

  // =====================================================
  // UNREAD MESSAGE COUNTS
  // =====================================================

  const [unreadCounts, setUnreadCounts] = useState({});

  const [sharedFiles, setSharedFiles] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState({});

  const [uploadState, setUploadState] = useState({
    status: "idle",
    message: "",
  });

  const [paginationByChat, setPaginationByChat] = useState({});

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [openMessageMenu, setOpenMessageMenu] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // =====================================================
  // TYPING STATE
  // =====================================================

  const [typingByChat, setTypingByChat] = useState({});

  // =====================================================
  // CURRENT LOGGED-IN USER
  // =====================================================

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

  // =====================================================
  // LOAD CHAT DATA
  // =====================================================

  const loadChatData = useCallback(async () => {
    if (!currentUserId) {
      return;
    }

    try {
      const [conversationResponse, friendsResponse, requestsResponse] =
        await Promise.all([
          api.get("/conversations", { params: { type: "private" } }),
          api.get("/friends"),
          api.get("/friends/requests"),
        ]);

      let unreadMap = {};

      /*
       * Unread counts are loaded separately so that if the unread
       * endpoint has a temporary issue, the main chat list still loads.
       */
      try {
        const unreadResponse = await api.get("/messages/unread-counts");

        unreadMap = normalizeUnreadCounts(unreadResponse.data);
      } catch (unreadError) {
        console.error(
          "Unread counts load failed:",
          unreadError.response?.data || unreadError.message,
        );
      }

      const conversationByFriendId = new Map();

      (conversationResponse.data?.conversations || []).forEach(
        (conversation) => {
          const otherMember = conversation.members?.find((member) => {
            const memberId = member.userId?._id || member.userId;

            return String(memberId) !== currentUserId;
          });

          const friendId = String(
            otherMember?.userId?._id || otherMember?.userId || "",
          );

          if (friendId && !conversationByFriendId.has(friendId)) {
            conversationByFriendId.set(friendId, conversation);
          }
        },
      );

      const seenPrivateParticipants = new Set();

      const nextChats = (friendsResponse.data?.friends || [])
        .filter((friend) => String(friend._id) !== currentUserId)
        .map((friend) => {
          const receiverId = String(friend._id);
          const conversation = conversationByFriendId.get(receiverId);
          const displayName = friend.name || friend.username || friend.email;

          if (!displayName || seenPrivateParticipants.has(receiverId)) {
            return null;
          }

          seenPrivateParticipants.add(receiverId);

          const chatKey = [currentUserId, receiverId].sort().join("_");

          /*
           * Backend may return unread counts using:
           * conversationId, chatKey, or chat id.
           */
          const unreadCount = Number(
            unreadMap[String(conversation?._id || "")] ??
              unreadMap[chatKey] ??
              unreadMap[
                String(
                  conversation?._id ? conversation._id : `friend-${receiverId}`,
                )
              ] ??
              0,
          );

          return {
            id: conversation?._id
              ? String(conversation._id)
              : `friend-${receiverId}`,

            chatKey,

            conversationId: conversation?._id ? String(conversation._id) : null,

            name: displayName,
            avatar: getInitials(displayName),

            // IMPORTANT:
            // Default is offline.
            // request_presence will update the real status.
            online: false,

            members: conversation ? "Offline" : "Friend - start a conversation",

            message: conversation
              ? "No messages yet"
              : "Start a private conversation",

            time: "",
            type: "private",
            receiverId,

            unreadCount: Number.isFinite(unreadCount)
              ? Math.max(0, unreadCount)
              : 0,
          };
        })
        .filter(Boolean);

      /*
       * Keep a separate map so realtime messages can update only
       * the affected chat without changing the existing chat UI.
       */
      const nextUnreadCounts = {};

      nextChats.forEach((chat) => {
        nextUnreadCounts[chat.chatKey] = chat.unreadCount || 0;

        if (chat.conversationId) {
          nextUnreadCounts[chat.conversationId] = chat.unreadCount || 0;
        }

        nextUnreadCounts[chat.id] = chat.unreadCount || 0;
      });

      setFriendRequests(requestsResponse.data?.requests || []);
      setChats(nextChats);

      /*
       * Only replace unread state when the unread endpoint returned
       * something usable. This prevents a temporary endpoint failure
       * from wiping existing realtime counts.
       */
      setUnreadCounts(nextUnreadCounts);

      setSelectedChatId((previousId) =>
        nextChats.some((chat) => chat.id === previousId) ? previousId : "",
      );
    } catch (error) {
      console.error("Chat data load failed:", error);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  // =====================================================
  // ONLINE / OFFLINE PRESENCE
  // =====================================================

  const presenceUserIds = useMemo(
    () =>
      chats
        .map((chat) => chat.receiverId)
        .filter(Boolean)
        .map((id) => String(id))
        .sort(),
    [chats],
  );

  const presenceUserIdsKey = presenceUserIds.join(",");

  useEffect(() => {
    const handleUserStatusChanged = ({ userId, isOnline }) => {
      const changedUserId = String(userId);

      setChats((previousChats) =>
        previousChats.map((chat) => {
          if (String(chat.receiverId) !== changedUserId) {
            return chat;
          }

          const online = Boolean(isOnline);

          return {
            ...chat,
            online,
            members: online ? "Online" : "Offline",
          };
        }),
      );
    };

    socket.on("user_status_changed", handleUserStatusChanged);

    return () => {
      socket.off("user_status_changed", handleUserStatusChanged);
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !presenceUserIds.length) {
      return;
    }

    socket.emit(
      "request_presence",
      {
        userIds: presenceUserIds,
      },
      (response) => {
        if (!response?.success) {
          return;
        }

        const statuses = response.statuses || {};

        setChats((previousChats) =>
          previousChats.map((chat) => {
            const userId = String(chat.receiverId || "");

            if (!Object.prototype.hasOwnProperty.call(statuses, userId)) {
              return {
                ...chat,
                online: false,
                members: "Offline",
              };
            }

            const isOnline = Boolean(statuses[userId]);

            return {
              ...chat,
              online: isOnline,
              members: isOnline ? "Online" : "Offline",
            };
          }),
        );
      },
    );
  }, [isConnected, presenceUserIdsKey, presenceUserIds]);

  // =====================================================
  // SEARCH USERS
  // =====================================================

  useEffect(() => {
    const query = searchText.trim();

    if (!query) {
      setUserSearchResults([]);
      return undefined;
    }

    let isActive = true;

    const searchUsers = async () => {
      try {
        const response = await api.get("/friends/search", {
          params: { q: query },
        });

        if (isActive) {
          setUserSearchResults(response.data?.users || []);
        }
      } catch (error) {
        if (isActive) {
          setUserSearchResults([]);
        }

        console.error("User search failed:", error);
      }
    };

    const timeoutId = window.setTimeout(searchUsers, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchText]);

  // =====================================================
  // SELECTED CHAT
  // =====================================================

  const selectedUser = chats.find((chat) => chat.id === selectedChatId) || null;

  const selectedUserType = selectedUser?.type || "";
  const selectedUserName = selectedUser?.name || "";
  const selectedUserId = selectedUser?.conversationId;
  const selectedUserReceiverId = selectedUser?.receiverId;

  // =====================================================
  // ACTIVE CHAT ID
  // =====================================================

  const activeChatId =
    selectedUser?.type === "private" &&
    selectedUser?.receiverId &&
    currentUserId
      ? selectedUser.chatKey
      : String(selectedUser?.chatKey || "");

  // =====================================================
  // CURRENT MESSAGES
  // =====================================================

  const currentMessages = useMemo(
    () => messagesByChat[activeChatId] || [],
    [messagesByChat, activeChatId],
  );

  // =====================================================
  // CURRENT TYPING STATUS
  // =====================================================

  const selectedUserIsTyping =
    selectedUserType === "private" && Boolean(typingByChat[activeChatId]);

  // =====================================================
  // FILTER CHATS
  // =====================================================

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const visibleChats = filteredChats;

  // =====================================================
  // OPEN CHAT
  // =====================================================

  const openChat = async (chat) => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setOpenMessageMenu(null);
    setTopMenuOpen(false);

    /*
     * Opening a chat means the user has read the messages.
     * Clear the local badge immediately.
     */
    setUnreadCounts((previous) => ({
      ...previous,
      [chat.chatKey]: 0,
      [chat.id]: 0,
      ...(chat.conversationId
        ? {
            [chat.conversationId]: 0,
          }
        : {}),
    }));

    if (chat.conversationId) {
      setSelectedChatId(chat.id);
      return;
    }

    try {
      const response = await api.post(
        `/conversations/private/${chat.receiverId}`,
      );

      const conversationId = String(response.data?.conversation?._id || "");

      await loadChatData();

      setSelectedChatId(conversationId);
    } catch (error) {
      console.error("Private conversation creation failed:", error);

      alert(error.response?.data?.message || "Unable to open conversation");
    }
  };

  // =====================================================
  // FRIEND REQUEST
  // =====================================================

  const sendFriendRequest = async (user) => {
    const userId = String(user._id);

    setFriendActionState((previous) => ({
      ...previous,
      [userId]: "loading",
    }));

    try {
      const response = await api.post(`/friends/requests/${userId}`);

      setUserSearchResults((previous) =>
        previous.map((item) =>
          String(item._id) === userId
            ? {
                ...item,
                status: response.data?.status || "Pending",
              }
            : item,
        ),
      );
    } catch (error) {
      const status = error.response?.data?.status;

      if (status) {
        setUserSearchResults((previous) =>
          previous.map((item) =>
            String(item._id) === userId ? { ...item, status } : item,
          ),
        );
      } else {
        alert(error.response?.data?.message || "Unable to send friend request");
      }
    } finally {
      setFriendActionState((previous) => {
        const next = { ...previous };
        delete next[userId];
        return next;
      });
    }
  };

  const respondToFriendRequest = async (requestId, action) => {
    setFriendActionState((previous) => ({
      ...previous,
      [requestId]: "loading",
    }));

    try {
      if (action === "accept") {
        await api.post(`/friends/requests/${requestId}/accept`);
      } else {
        await api.delete(`/friends/requests/${requestId}`);
      }

      await loadChatData();
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update friend request");
    } finally {
      setFriendActionState((previous) => {
        const next = { ...previous };
        delete next[requestId];
        return next;
      });
    }
  };

  // =====================================================
  // SOCKET CONNECTION
  // =====================================================

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      console.log("TOKEN MISSING");
      return;
    }

    socket.auth = {
      token,
    };

    const handleConnect = () => {
      console.log("CHAT DEBUG authenticated current user ID:", currentUserId);

      console.log("=================================");
      console.log("SOCKET CONNECTED");
      console.log("SOCKET ID:", socket.id);
      console.log("USER ID:", currentUserId);
      console.log("=================================");

      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("SOCKET DISCONNECTED");
      setIsConnected(false);
    };

    const handleConnectError = (error) => {
      console.error("SOCKET ERROR:", error.message);
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [currentUserId]);

  // =====================================================
  // FORMAT MESSAGES
  // =====================================================

  const formatMessages = useCallback(
    (messages) =>
      messages.map((message) => {
        let type = "received";

        if (selectedUserType === "private") {
          type =
            String(message.receiverId) === currentUserId ? "received" : "sent";
        } else {
          type =
            String(message.senderId) === currentUserId ? "sent" : "received";
        }

        return {
          ...message,
          _id: message._id ? String(message._id) : undefined,
          senderId: String(message.senderId || ""),
          receiverId: message.receiverId ? String(message.receiverId) : null,
          status: message.status || "sent",
          type: message.messageType === "file" ? "file" : type,
        };
      }),
    [currentUserId, selectedUserType],
  );

  // =====================================================
  // LOAD LATEST 20 MESSAGES
  // =====================================================

  useEffect(() => {
    if (!activeChatId || !selectedUser?.conversationId) {
      return;
    }

    let cancelled = false;

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          return;
        }

        setPaginationByChat((prev) => ({
          ...prev,
          [activeChatId]: {
            hasMore: true,
            nextCursor: null,
            loading: false,
          },
        }));

        setSelectedMessageIds([]);
        setSelectionMode(false);
        setTopMenuOpen(false);
        setOpenMessageMenu(null);

        const response = await axios.get(
          `${BACKEND_BASE}/api/messages/${activeChatId}`,
          {
            params: {
              limit: 20,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (cancelled) {
          return;
        }

        const formattedMessages = formatMessages(response.data?.messages || []);

        const pagination = response.data?.pagination || {};

        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: formattedMessages,
        }));

        setPaginationByChat((prev) => ({
          ...prev,
          [activeChatId]: {
            hasMore: Boolean(pagination.hasMore),
            nextCursor: pagination.nextCursor || null,
            loading: false,
          },
        }));

        /*
         * The chat has been opened and its history has been loaded,
         * therefore its unread badge should disappear.
         */
        setUnreadCounts((previous) => ({
          ...previous,
          [activeChatId]: 0,
          [selectedUser.conversationId]: 0,
          [selectedChatId]: 0,
        }));

        shouldScrollToBottomRef.current = true;

        socket.emit("mark_messages_read", {
          conversationId: selectedUser.conversationId,
        });
      } catch (error) {
        if (!cancelled) {
          console.error(
            "CHAT HISTORY ERROR:",
            error.response?.data || error.message,
          );
        }
      }
    };

    fetchMessages();

    return () => {
      cancelled = true;
    };
  }, [
    activeChatId,
    currentUserId,
    formatMessages,
    selectedChatId,
    selectedUser?.conversationId,
  ]);

  // =====================================================
  // LOAD OLDER 20 MESSAGES
  // =====================================================

  const loadOlderMessages = useCallback(async () => {
    if (
      !activeChatId ||
      !selectedUser?.conversationId ||
      loadingOlderMessagesRef.current
    ) {
      return;
    }

    const pagination = paginationByChat[activeChatId];

    if (!pagination?.hasMore || !pagination.nextCursor) {
      return;
    }

    const container = messagesContainerRef.current;

    const previousScrollHeight = container?.scrollHeight || 0;
    const previousScrollTop = container?.scrollTop || 0;

    const { createdAt, id } = pagination.nextCursor;

    loadingOlderMessagesRef.current = true;

    setPaginationByChat((prev) => ({
      ...prev,
      [activeChatId]: {
        ...prev[activeChatId],
        loading: true,
      },
    }));

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return;
      }

      const response = await axios.get(
        `${BACKEND_BASE}/api/messages/${activeChatId}`,
        {
          params: {
            limit: 20,
            before: createdAt,
            beforeId: id,
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const olderMessages = formatMessages(response.data?.messages || []);

      const nextPagination = response.data?.pagination || {};

      setMessagesByChat((prev) => {
        const existing = prev[activeChatId] || [];

        const existingIds = new Set(
          existing.map((message) => String(message._id)),
        );

        const uniqueOlder = olderMessages.filter(
          (message) => !existingIds.has(String(message._id)),
        );

        return {
          ...prev,
          [activeChatId]: [...uniqueOlder, ...existing],
        };
      });

      setPaginationByChat((prev) => ({
        ...prev,
        [activeChatId]: {
          hasMore: Boolean(nextPagination.hasMore),
          nextCursor: nextPagination.nextCursor || null,
          loading: false,
        },
      }));

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const currentContainer = messagesContainerRef.current;

          if (!currentContainer) {
            return;
          }

          const heightDifference =
            currentContainer.scrollHeight - previousScrollHeight;

          currentContainer.scrollTop = previousScrollTop + heightDifference;
        });
      });
    } catch (error) {
      console.error(
        "OLDER CHAT HISTORY ERROR:",
        error.response?.data || error.message,
      );

      setPaginationByChat((prev) => ({
        ...prev,
        [activeChatId]: {
          ...prev[activeChatId],
          loading: false,
        },
      }));
    } finally {
      loadingOlderMessagesRef.current = false;
    }
  }, [
    activeChatId,
    formatMessages,
    paginationByChat,
    selectedUser?.conversationId,
  ]);

  // =====================================================
  // MESSAGE SCROLL
  // =====================================================

  const handleMessagesScroll = (event) => {
    if (event.currentTarget.scrollTop <= 80) {
      loadOlderMessages();
    }
  };

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) {
      return;
    }

    shouldScrollToBottomRef.current = false;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "auto",
      });
    });
  }, [currentMessages.length, selectedChatId]);

  // =====================================================
  // LOAD SHARED FILES
  // =====================================================

  useEffect(() => {
    if (!activeChatId || !selectedUserType) {
      return;
    }

    const loadConversationFiles = async () => {
      try {
        const conversationId = selectedUser?.conversationId;

        if (!conversationId) {
          return;
        }

        const filesResponse = await api.get(
          `/conversations/${conversationId}/files`,
        );

        setSharedFiles(filesResponse.data?.files || []);
      } catch (error) {
        console.error("Conversation files load failed:", error);

        setSharedFiles([]);
      }
    };

    loadConversationFiles();
  }, [
    activeChatId,
    selectedUser?.conversationId,
    selectedUserName,
    selectedUserId,
    selectedUserReceiverId,
    selectedUserType,
  ]);

  // =====================================================
  // JOIN CURRENT CHAT
  // =====================================================

  useEffect(() => {
    if (!isConnected || !selectedUserType) {
      return;
    }

    if (selectedUserType === "private" && selectedUserReceiverId) {
      socket.emit("join_private_chat", String(selectedUserReceiverId));

      return;
    }

    if (selectedUserType === "group") {
      socket.emit("join_chat", selectedUserId);
    }
  }, [
    isConnected,
    selectedChatId,
    selectedUserReceiverId,
    selectedUserType,
    selectedUserName,
    selectedUserId,
    activeChatId,
    currentUserId,
  ]);

  // =====================================================
  // STOP TYPING WHEN CHAT CHANGES / COMPONENT UNMOUNTS
  // =====================================================

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    const previousTypingChat = typingChatRef.current;

    if (
      previousTypingChat?.receiverId &&
      previousTypingChat?.conversationId &&
      socket.connected
    ) {
      socket.emit("typing_stop", {
        receiverId: String(previousTypingChat.receiverId),
        conversationId: String(previousTypingChat.conversationId),
      });
    }

    typingChatRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      stopTyping();
    };
  }, [stopTyping]);

  useEffect(() => {
    stopTyping();
  }, [selectedChatId, stopTyping]);

  // =====================================================
  // HANDLE TYPING
  // =====================================================

  const handleTyping = (value) => {
    setMessageText(value);

    if (
      selectedUserType !== "private" ||
      !selectedUserReceiverId ||
      !selectedUser?.conversationId ||
      !socket.connected
    ) {
      return;
    }

    const typingData = {
      receiverId: String(selectedUserReceiverId),
      conversationId: String(selectedUser.conversationId),
    };

    const previousTypingChat = typingChatRef.current;

    if (
      !previousTypingChat ||
      String(previousTypingChat.receiverId) !== String(typingData.receiverId) ||
      String(previousTypingChat.conversationId) !==
        String(typingData.conversationId)
    ) {
      socket.emit("typing_start", typingData);

      typingChatRef.current = typingData;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (!value.trim()) {
      stopTyping();
      return;
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1500);
  };

  // =====================================================
  // RECEIVE TYPING STATUS
  // =====================================================

  useEffect(() => {
    const handleUserTyping = ({ conversationId, userId, isTyping }) => {
      if (!conversationId || !userId) {
        return;
      }

      if (String(userId) === currentUserId) {
        return;
      }

      const chat = chats.find(
        (item) => String(item.conversationId || "") === String(conversationId),
      );

      const chatKey = chat?.chatKey;

      if (!chatKey) {
        return;
      }

      setTypingByChat((previous) => ({
        ...previous,
        [chatKey]: Boolean(isTyping),
      }));
    };

    socket.on("user_typing", handleUserTyping);

    return () => {
      socket.off("user_typing", handleUserTyping);
    };
  }, [chats, currentUserId]);

  // =====================================================
  // LOCAL MESSAGE HELPER
  // =====================================================

  const addMessageToChat = (chatId, message) => {
    setMessagesByChat((prev) => {
      const existingMessages = prev[chatId] || [];

      const nextMessages = appendUniqueMessage(existingMessages, message);

      return {
        ...prev,
        [chatId]: nextMessages,
      };
    });
  };

  // =====================================================
  // INCREMENT UNREAD COUNT
  // =====================================================

  const incrementUnreadCount = useCallback((chatKey) => {
    if (!chatKey) {
      return;
    }

    setUnreadCounts((previous) => {
      const currentCount = Number(previous[chatKey] || 0);

      return {
        ...previous,
        [chatKey]: currentCount + 1,
      };
    });
  }, []);

  // =====================================================
  // UPDATE CHAT PREVIEW
  // =====================================================

  const updateChatPreview = useCallback((chatKey, message) => {
    if (!chatKey) {
      return;
    }

    setChats((previousChats) =>
      previousChats.map((chat) => {
        if (String(chat.chatKey) !== String(chatKey)) {
          return chat;
        }

        return {
          ...chat,
          message:
            message?.messageType === "file" || message?.type === "file"
              ? message?.attachment?.name || "Attachment"
              : message?.text || chat.message,
          time:
            message?.time ||
            (message?.createdAt
              ? new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : chat.time),
        };
      }),
    );
  }, []);

  // =====================================================
  // RECEIVE PRIVATE MESSAGE
  // =====================================================

  useEffect(() => {
    const handlePrivateMessage = (message) => {
      console.log("CHAT DEBUG receive_private_message event:", message);

      if (!message?.chatId) {
        return;
      }

      const messageChatId = String(message.chatId);

      const isCurrentChat = messageChatId === String(activeChatId);

      const isOwnMessage =
        String(message.senderId || "") === String(currentUserId);

      if (isCurrentChat) {
        shouldScrollToBottomRef.current = true;

        /*
         * Current chat is open, so incoming message is immediately read.
         */
        if (selectedUser?.conversationId && !isOwnMessage) {
          socket.emit("mark_messages_read", {
            conversationId: selectedUser.conversationId,
          });
        }

        setUnreadCounts((previous) => ({
          ...previous,
          [messageChatId]: 0,
        }));
      } else if (!isOwnMessage) {
        /*
         * Message arrived in another chat.
         * Increase that chat's unread badge.
         */
        incrementUnreadCount(messageChatId);
      }

      updateChatPreview(messageChatId, message);

      setMessagesByChat((prev) => {
        const existingMessages = prev[message.chatId] || [];

        const messageType =
          String(message.senderId) === currentUserId ? "sent" : "received";

        const newMessage = {
          ...message,

          _id: message._id ? String(message._id) : undefined,

          senderId: String(message.senderId || ""),

          receiverId: message.receiverId ? String(message.receiverId) : null,

          status: message.status || "sent",

          type: messageType,
        };

        const nextMessages = appendUniqueMessage(existingMessages, newMessage);

        return {
          ...prev,
          [message.chatId]: nextMessages,
        };
      });
    };

    socket.on("receive_private_message", handlePrivateMessage);

    return () => {
      socket.off("receive_private_message", handlePrivateMessage);
    };
  }, [
    currentUserId,
    activeChatId,
    selectedUser?.conversationId,
    incrementUnreadCount,
    updateChatPreview,
  ]);

  // =====================================================
  // RECEIVE GROUP MESSAGE
  // =====================================================

  useEffect(() => {
    const handleGroupMessage = (message) => {
      console.log("RECEIVED GROUP MESSAGE:", message);

      if (!message?.chatId) {
        return;
      }

      const messageChatId = String(message.chatId);

      const isCurrentChat = messageChatId === String(activeChatId);

      const isOwnMessage =
        String(message.senderId || "") === String(currentUserId);

      if (isCurrentChat) {
        shouldScrollToBottomRef.current = true;
      } else if (!isOwnMessage) {
        incrementUnreadCount(messageChatId);
      }

      updateChatPreview(messageChatId, message);

      setMessagesByChat((prev) => {
        const existingMessages = prev[message.chatId] || [];

        const newMessage = {
          ...message,

          _id: message._id ? String(message._id) : undefined,

          senderId: String(message.senderId || ""),

          receiverId: message.receiverId ? String(message.receiverId) : null,

          status: message.status || "sent",

          type:
            String(message.senderId) === currentUserId ? "sent" : "received",
        };

        return {
          ...prev,

          [message.chatId]: appendUniqueMessage(existingMessages, newMessage),
        };
      });
    };

    socket.on("receive_message", handleGroupMessage);

    return () => {
      socket.off("receive_message", handleGroupMessage);
    };
  }, [currentUserId, activeChatId, incrementUnreadCount, updateChatPreview]);

  // =====================================================
  // RECEIVE FILE MESSAGE
  // =====================================================

  useEffect(() => {
    const handleFileMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      const messageChatId = String(message.chatId);

      const isCurrentChat = messageChatId === String(activeChatId);

      const isOwnMessage =
        String(message.senderId || "") === String(currentUserId);

      if (isCurrentChat) {
        shouldScrollToBottomRef.current = true;
      } else if (!isOwnMessage) {
        incrementUnreadCount(messageChatId);
      }

      updateChatPreview(messageChatId, message);

      addMessageToChat(message.chatId, {
        ...message,
        status: message.status || "sent",
        type: "file",
      });
    };

    socket.on("receive_file_message", handleFileMessage);

    return () => {
      socket.off("receive_file_message", handleFileMessage);
    };
  }, [activeChatId, currentUserId, incrementUnreadCount, updateChatPreview]);

  // =====================================================
  // MESSAGE STATUS - SENT / DELIVERED / READ
  // =====================================================

  useEffect(() => {
    const handleMessageStatusUpdated = ({
      messageId,
      status,
      deliveredAt,
      readAt,
    }) => {
      if (!messageId || !status) {
        return;
      }

      const normalizedMessageId = String(messageId);

      setMessagesByChat((previous) => {
        const next = {};

        Object.entries(previous).forEach(([chatId, messages]) => {
          next[chatId] = messages.map((message) => {
            if (String(message._id) !== normalizedMessageId) {
              return message;
            }

            return {
              ...message,
              status,
              deliveredAt: deliveredAt || message.deliveredAt || null,
              readAt: readAt || message.readAt || null,
            };
          });
        });

        return next;
      });
    };

    socket.on("message_status_updated", handleMessageStatusUpdated);

    return () => {
      socket.off("message_status_updated", handleMessageStatusUpdated);
    };
  }, []);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = () => {
    const text = messageText.trim();

    if (!text) {
      return;
    }

    if (!selectedUser) {
      console.log("SELECTED USER MISSING");
      return;
    }

    if (!currentUserId) {
      console.log("CURRENT USER ID MISSING");
      return;
    }

    stopTyping();

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const localId = `local-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    // ===================================================
    // PRIVATE CHAT
    // ===================================================

    if (selectedUser.type === "private") {
      if (!selectedUser.receiverId) {
        console.log("RECEIVER ID MISSING");
        return;
      }

      const privateMessage = {
        chatId: activeChatId,
        conversationId: selectedUser.conversationId,
        senderId: currentUserId,
        receiverId: String(selectedUser.receiverId),
        text,
        time,
        status: "sent",
        type: "sent",
        _id: localId,
      };

      if (socket.connected) {
        shouldScrollToBottomRef.current = true;

        addMessageToChat(activeChatId, privateMessage);

        socket.emit(
          "send_private_message",
          privateMessage,
          (acknowledgement) => {
            console.log(
              "CHAT DEBUG send_private_message acknowledgement:",
              acknowledgement,
            );

            if (!acknowledgement?.success) {
              return;
            }

            const serverMessageId = acknowledgement.messageId;

            if (!serverMessageId) {
              return;
            }

            setMessagesByChat((previous) => {
              const current = previous[activeChatId] || [];

              return {
                ...previous,
                [activeChatId]: current.map((message) =>
                  String(message._id) === String(localId)
                    ? {
                        ...message,
                        _id: String(serverMessageId),
                        conversationId:
                          acknowledgement.conversationId ||
                          message.conversationId,
                        status: "sent",
                      }
                    : message,
                ),
              };
            });
          },
        );
      } else {
        addMessageToChat(activeChatId, privateMessage);
      }
    } else {
      // =================================================
      // GROUP CHAT
      // =================================================

      const groupMessage = {
        chatId: selectedUser.id,
        senderId: currentUserId,
        text,
        time,
        status: "sent",
        type: "sent",
        _id: localId,
      };

      if (socket.connected) {
        shouldScrollToBottomRef.current = true;

        socket.emit("send_message", groupMessage);
      } else {
        addMessageToChat(activeChatId, groupMessage);
      }
    }

    setMessageText("");
    setShowEmoji(false);
  };

  // =====================================================
  // MESSAGE STATUS UI
  // =====================================================

  const MessageStatusTicks = ({ message }) => {
    if (!isMessageSentByCurrentUser(message)) {
      return null;
    }

    const status = message?.status || "sent";

    if (status === "read") {
      return (
        <span
          className="ml-1 inline-flex items-center text-[10px] font-semibold"
          title="Read"
          aria-label="Read"
        >
          <span className="text-gray-300">✓</span>
          <span className="text-[#38BDF8]">✓</span>
        </span>
      );
    }

    if (status === "delivered") {
      return (
        <span
          className="ml-1 inline-flex items-center text-[10px] font-semibold text-gray-300"
          title="Delivered"
          aria-label="Delivered"
        >
          ✓✓
        </span>
      );
    }

    return (
      <span
        className="ml-1 text-[10px] font-semibold text-white"
        title="Sent"
        aria-label="Sent"
      >
        ✓
      </span>
    );
  };

  // =====================================================
  // FILE UPLOAD
  // =====================================================

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file || !selectedUser?.conversationId) {
      return;
    }

    const maxFileSize = 50 * 1024 * 1024;

    const allowedExtensions = [
      "png",
      "jpg",
      "jpeg",
      "gif",
      "webp",
      "svg",
      "mp4",
      "mov",
      "avi",
      "webm",
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "zip",
      "rar",
      "7z",
      "tar",
      "gz",
    ];

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (file.size > maxFileSize) {
      setUploadState({
        status: "error",
        message: "File is too large (50 MB maximum).",
      });

      event.target.value = "";

      return;
    }

    if (!extension || !allowedExtensions.includes(extension)) {
      setUploadState({
        status: "error",
        message: "This file type is not supported.",
      });

      event.target.value = "";

      return;
    }

    setUploadState({
      status: "uploading",
      message: `Uploading ${file.name}...`,
    });

    try {
      const conversationId = selectedUser.conversationId;

      const formData = new FormData();

      formData.append("file", file);

      const response = await api.post(
        `/conversations/${conversationId}/files`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const message = response.data?.message;

      if (message) {
        shouldScrollToBottomRef.current = true;

        addMessageToChat(activeChatId, {
          ...message,
          status: message.status || "sent",
          type: "file",
        });
      }

      setSharedFiles((prev) => [
        {
          fileId: message.fileId,
          conversationId: message.conversationId,
          name: message.attachment?.name || file.name,
          mimeType: message.attachment?.mimeType || file.type,
          size: message.attachment?.size || file.size,
          type: getAttachmentType(message.attachment),
          permission: message.attachment?.permission || "download",
        },

        ...prev.filter((item) => item.fileId !== message.fileId),
      ]);

      setUploadState({
        status: "success",
        message: "Attachment sent.",
      });
    } catch (error) {
      console.error("Chat file upload failed:", error);

      setUploadState({
        status: "error",
        message: error.response?.data?.message || "Upload failed. Try again.",
      });
    } finally {
      event.target.value = "";
    }
  };

  // =====================================================
  // FILE PREVIEW
  // =====================================================

  const requestAuthorizedPreview = useCallback(
    async (conversationId, fileId) => {
      if (!conversationId || !fileId) {
        throw new Error("Preview unavailable");
      }

      if (filePreviewUrls[fileId]) {
        return filePreviewUrls[fileId];
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${BACKEND_BASE}/api/conversations/${conversationId}/files/${fileId}/preview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Preview unavailable");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      setFilePreviewUrls((prev) => ({
        ...prev,
        [fileId]: url,
      }));

      return url;
    },
    [filePreviewUrls],
  );

  useEffect(() => {
    const files = [
      ...currentMessages
        .filter((message) => message.type === "file")
        .map((message) => ({
          fileId: message.fileId,
          conversationId: message.conversationId,
          attachment: message.attachment,
        })),

      ...sharedFiles.map((file) => ({
        fileId: file.fileId,
        conversationId: file.conversationId,
        attachment: {
          type: file.type,
          mimeType: file.mimeType,
        },
      })),
    ];

    files.forEach((file) => {
      const type = getAttachmentType(file.attachment);

      if (
        (type !== "image" && type !== "video") ||
        !file.fileId ||
        !file.conversationId ||
        filePreviewUrls[file.fileId] ||
        previewRequestsRef.current.has(file.fileId)
      ) {
        return;
      }

      previewRequestsRef.current.add(file.fileId);

      requestAuthorizedPreview(file.conversationId, file.fileId)
        .catch((error) => {
          console.error("Attachment preview load failed:", error);
        })
        .finally(() => {
          previewRequestsRef.current.delete(file.fileId);
        });
    });
  }, [currentMessages, sharedFiles, filePreviewUrls, requestAuthorizedPreview]);

  const downloadSharedFile = async (message) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${BACKEND_BASE}/api/conversations/${message.conversationId}/files/${message.fileId}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Unable to download shared file");
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = url;

      anchor.download =
        message.attachment?.name || message.name || message.text || "download";

      document.body.appendChild(anchor);

      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Shared file download failed:", error);

      alert(error.message || "Unable to download shared file");
    }
  };

  const previewSharedFile = async (message) => {
    try {
      const url = await requestAuthorizedPreview(
        message.conversationId,
        message.fileId,
      );

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Shared file preview failed:", error);

      setUploadState({
        status: "error",
        message: error.message || "Preview unavailable.",
      });
    }
  };

  // =====================================================
  // DELETE MESSAGE
  // =====================================================

  const removeMessageFromLocalChat = useCallback(
    (messageId, chatId = activeChatId) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(
          (message) => String(message._id) !== String(messageId),
        ),
      }));
    },
    [activeChatId],
  );

  const deleteMessageForMe = async (message) => {
    if (!message?._id || String(message._id).startsWith("local-")) {
      removeMessageFromLocalChat(message?._id);

      setOpenMessageMenu(null);

      return;
    }

    setDeletingMessageId(String(message._id));

    try {
      await api.delete(`/messages/${message._id}`, {
        params: {
          mode: "me",
        },
      });

      removeMessageFromLocalChat(message._id);

      setOpenMessageMenu(null);
    } catch (error) {
      console.error("Delete message for me failed:", error);

      alert(error.response?.data?.message || "Unable to delete message");
    } finally {
      setDeletingMessageId(null);
    }
  };

  const deleteMessageForEveryone = async (message) => {
    if (!message?._id || String(message._id).startsWith("local-")) {
      removeMessageFromLocalChat(message?._id);

      setOpenMessageMenu(null);

      return;
    }

    if (String(message.senderId) !== currentUserId) {
      return;
    }

    setDeletingMessageId(String(message._id));

    try {
      await api.delete(`/messages/${message._id}`, {
        params: {
          mode: "everyone",
        },
      });

      removeMessageFromLocalChat(message._id);

      setOpenMessageMenu(null);
    } catch (error) {
      console.error("Delete message for everyone failed:", error);

      alert(error.response?.data?.message || "Unable to delete message");
    } finally {
      setDeletingMessageId(null);
    }
  };

  // =====================================================
  // MESSAGE SELECTION
  // =====================================================

  const isMessageSentByCurrentUser = (message) =>
    String(message?.senderId || "") === currentUserId ||
    message?.type === "sent";

  const toggleMessageSelection = (messageId) => {
    const id = String(messageId || "");

    if (!id) {
      return;
    }

    setSelectedMessageIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedMessages = currentMessages.filter((message) =>
    selectedMessageIds.includes(String(message._id)),
  );

  const hasSelectedReceivedMessage = selectedMessages.some(
    (message) => !isMessageSentByCurrentUser(message),
  );

  const canBulkDeleteEveryone =
    selectedMessages.length > 0 && !hasSelectedReceivedMessage;

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedMessageIds([]);
    setOpenMessageMenu(null);
    setTopMenuOpen(false);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setOpenMessageMenu(null);
  };

  const bulkDeleteSelected = async (mode) => {
    if (!selectedMessages.length || bulkDeleting) {
      return;
    }

    if (mode === "everyone" && !canBulkDeleteEveryone) {
      return;
    }

    const selectedIds = selectedMessages.map((message) => String(message._id));

    const serverIds = selectedIds.filter((id) => !id.startsWith("local-"));

    if (mode === "everyone") {
      const invalidSelection = selectedMessages.some(
        (message) => !isMessageSentByCurrentUser(message),
      );

      if (invalidSelection) {
        return;
      }
    }

    setBulkDeleting(true);

    try {
      if (serverIds.length > 0) {
        await api.delete("/messages/bulk", {
          data: {
            messageIds: serverIds,
            mode,
          },
        });
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).filter(
          (message) => !selectedIds.includes(String(message._id)),
        ),
      }));

      setSelectedMessageIds([]);

      setSelectionMode(false);

      setOpenMessageMenu(null);
    } catch (error) {
      console.error("Bulk message delete failed:", error);

      alert(
        error.response?.data?.message || "Unable to delete selected messages",
      );
    } finally {
      setBulkDeleting(false);
    }
  };

  // =====================================================
  // CLEAR CHAT
  // =====================================================

  const clearCurrentChat = async () => {
    if (!selectedUser?.conversationId || !activeChatId) {
      return;
    }

    const confirmed = window.confirm(
      "Clear all messages from this chat for you? The other person will keep their messages.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(
        `/messages/conversation/${selectedUser.conversationId}/clear`,
      );

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChatId]: [],
      }));

      setPaginationByChat((prev) => ({
        ...prev,
        [activeChatId]: {
          hasMore: false,
          nextCursor: null,
          loading: false,
        },
      }));

      setUnreadCounts((previous) => ({
        ...previous,
        [activeChatId]: 0,
        [selectedUser.conversationId]: 0,
        [selectedChatId]: 0,
      }));

      setSelectedMessageIds([]);

      setSelectionMode(false);

      setTopMenuOpen(false);
    } catch (error) {
      console.error("Clear chat failed:", error);

      alert(error.response?.data?.message || "Unable to clear chat");
    }
  };

  // =====================================================
  // MESSAGE DELETED SOCKET
  // =====================================================

  const handleMessageDeleted = useCallback((payload) => {
    const messageId = payload?.messageId || payload?._id;

    if (!messageId) {
      return;
    }

    setMessagesByChat((prev) => {
      const next = {};

      Object.entries(prev).forEach(([chatId, messages]) => {
        next[chatId] = messages.filter(
          (message) => String(message._id) !== String(messageId),
        );
      });

      return next;
    });
  }, []);

  useEffect(() => {
    socket.on("message_deleted", handleMessageDeleted);

    return () => socket.off("message_deleted", handleMessageDeleted);
  }, [handleMessageDeleted]);

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FC]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ================================================= */}
          {/* LEFT CHAT LIST */}
          {/* ================================================= */}

          <aside className="flex w-[300px] shrink-0 flex-col border-r border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center rounded-xl bg-[#F5F7FB] px-4 py-3">
                <FiSearch className="text-gray-400" />

                <input
                  ref={chatSearchInputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search users or conversations..."
                  className="ml-3 min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* FRIEND REQUESTS */}

              {friendRequests.length > 0 && (
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Friend Requests
                  </h3>

                  {friendRequests.map((request) => {
                    const requester = request.requester;

                    const isLoading =
                      friendActionState[request._id] === "loading";

                    return (
                      <div
                        key={request._id}
                        className="mb-2 flex items-center gap-2 last:mb-0"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                          {getInitials(
                            requester.name ||
                              requester.username ||
                              requester.email,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-gray-900">
                            {requester.name ||
                              requester.username ||
                              requester.email}
                          </p>

                          <p className="text-[9px] text-gray-500">
                            Wants to connect
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            respondToFriendRequest(request._id, "accept")
                          }
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                          aria-label="Accept friend request"
                        >
                          <FiCheck size={15} />
                        </button>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() =>
                            respondToFriendRequest(request._id, "reject")
                          }
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          aria-label="Reject friend request"
                        >
                          <FiX size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SEARCH RESULTS */}

              {userSearchResults.length > 0 && (
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                    Search Results
                  </h3>

                  {userSearchResults.map((user) => {
                    const userId = String(user._id);

                    const isLoading = friendActionState[userId] === "loading";

                    const status = user.status || "Add Friend";

                    return (
                      <div
                        key={userId}
                        className="mb-2 flex items-center gap-2 last:mb-0"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-700">
                          {getInitials(
                            user.name || user.username || user.email,
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-semibold text-gray-900">
                            {user.name || user.username || user.email}
                          </p>

                          <p className="truncate text-[9px] text-gray-500">
                            {status}
                          </p>
                        </div>

                        {status === "Add Friend" && (
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => sendFriendRequest(user)}
                            className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                            aria-label="Send friend request"
                          >
                            <FiUserPlus size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CHAT LIST */}

              {visibleChats.map((chat) => {
                const unreadCount = Number(
                  unreadCounts[chat.chatKey] ??
                    unreadCounts[chat.conversationId] ??
                    unreadCounts[chat.id] ??
                    chat.unreadCount ??
                    0,
                );

                return (
                  <div
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition ${
                      selectedChatId === chat.id
                        ? "border-l-4 border-l-blue-600 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                          {chat.avatar}
                        </div>

                        {chat.online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <h3 className="min-w-0 truncate text-[12px] font-semibold text-gray-900">
                              {chat.name}
                            </h3>

                            {unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[9px] font-semibold leading-none text-white">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>

                          <span className="shrink-0 text-[9px] text-gray-400">
                            {chat.time}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[10px] text-gray-500">
                          {typingByChat[chat.chatKey] ? (
                            <span className="font-medium text-blue-600">
                              typing...
                            </span>
                          ) : (
                            messagesByChat[chat.chatKey]?.at(-1)?.text ||
                            chat.message
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ================================================= */}
          {/* CENTER */}
          {/* ================================================= */}

          <main className="flex min-w-0 flex-1 flex-col bg-white">
            {/* HEADER */}

            <div className="relative flex h-[56px] shrink-0 items-center justify-between border-b border-gray-200 px-4">
              {selectionMode ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={exitSelectionMode}
                    className="text-gray-500 hover:text-gray-800"
                    aria-label="Exit message selection"
                  >
                    <FiX />
                  </button>

                  <h2 className="text-[13px] font-semibold text-gray-900">
                    {selectedMessageIds.length} selected
                  </h2>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                      {selectedUser?.avatar || "U"}
                    </div>

                    {selectedUser?.online && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-[13px] font-semibold text-gray-900">
                      {selectedUser?.name || "Select a conversation"}
                    </h2>

                    <p
                      className={`text-[9px] ${
                        selectedUserIsTyping
                          ? "font-medium text-blue-600"
                          : selectedUser?.online
                            ? "text-green-600"
                            : "text-gray-400"
                      }`}
                    >
                      {selectedUserIsTyping
                        ? "typing..."
                        : selectedUser
                          ? selectedUser.online
                            ? "Online"
                            : "Offline"
                          : ""}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                {!selectionMode && (
                  <>
                    <button type="button" className="hover:text-blue-600">
                      <FiPhone />
                    </button>

                    <button type="button" className="hover:text-blue-600">
                      <FiVideo />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTopMenuOpen((prev) => !prev)}
                      className="hover:text-blue-600"
                      aria-label="Chat options"
                    >
                      <FiMoreVertical />
                    </button>
                  </>
                )}
              </div>

              {/* TOP CHAT MENU */}

              {!selectionMode && topMenuOpen && selectedUser && (
                <div className="absolute right-3 top-12 z-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setTopMenuOpen(false);

                      window.setTimeout(
                        () => chatSearchInputRef.current?.focus(),
                        0,
                      );
                    }}
                    className="flex w-full items-center px-4 py-2.5 text-left text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={clearCurrentChat}
                    className="flex w-full items-center px-4 py-2.5 text-left text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    Clear chat
                  </button>

                  <button
                    type="button"
                    onClick={enterSelectionMode}
                    className="flex w-full items-center px-4 py-2.5 text-left text-[11px] text-gray-700 hover:bg-gray-50"
                  >
                    Delete chat
                  </button>
                </div>
              )}
            </div>

            {/* ================================================= */}
            {/* MESSAGES */}
            {/* ================================================= */}

            <div
              ref={messagesContainerRef}
              onScroll={handleMessagesScroll}
              className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FC] px-7 py-5"
            >
              {paginationByChat[activeChatId]?.loading && (
                <div className="mb-3 text-center text-[10px] text-gray-400">
                  Loading older messages...
                </div>
              )}

              <div className="mb-7 text-center text-[10px] text-gray-400">
                Today
              </div>

              {currentMessages.map((msg, index) => {
                const messageId = String(msg._id || `local-${index}`);

                const isSelected = selectedMessageIds.includes(messageId);

                const isSent = isMessageSentByCurrentUser(msg);

                const selectionControl = selectionMode ? (
                  <button
                    type="button"
                    onClick={() => toggleMessageSelection(messageId)}
                    className={`mt-3 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-transparent"
                    }`}
                    aria-label={
                      isSelected ? "Deselect message" : "Select message"
                    }
                  >
                    {isSelected && <FiCheck size={12} />}
                  </button>
                ) : null;

                const messageMenu = !selectionMode ? (
                  <div className="relative shrink-0 self-start">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMessageMenu((previous) =>
                          previous === messageId ? null : messageId,
                        )
                      }
                      className="rounded-full p-1 text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700 focus:opacity-100"
                      aria-label="Message options"
                    >
                      <FiMoreVertical size={14} />
                    </button>

                    {openMessageMenu === messageId && (
                      <div className="absolute right-0 top-7 z-30 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button
                          type="button"
                          disabled={deletingMessageId === messageId}
                          onClick={() => deleteMessageForMe(msg)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Delete for me
                        </button>

                        {isSent && (
                          <button
                            type="button"
                            disabled={deletingMessageId === messageId}
                            onClick={() => deleteMessageForEveryone(msg)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[10px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete for everyone
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null;

                // =================================================
                // RECEIVED TEXT
                // =================================================

                if (msg.type === "received") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex min-w-0 items-start gap-2"
                    >
                      {selectionControl}

                      <div className="min-w-0 max-w-[75%] rounded-xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="min-w-0 break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-[12px] leading-5">
                          {msg.text}
                        </p>

                        <p className="mt-2 text-[9px] text-gray-400">
                          {msg.time}
                        </p>
                      </div>

                      {messageMenu}
                    </div>
                  );
                }

                // =================================================
                // SENT TEXT
                // =================================================

                if (msg.type === "sent") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex min-w-0 items-start justify-end gap-2"
                    >
                      <div className="min-w-0 max-w-[75%] rounded-xl rounded-br-md bg-blue-600 px-4 py-3 text-white">
                        <p className="min-w-0 break-words whitespace-pre-wrap [overflow-wrap:anywhere] text-[12px] leading-5">
                          {msg.text}
                        </p>

                        <div className="mt-2 flex items-center justify-end">
                          <span className="text-[9px] text-blue-100">
                            {msg.time}
                          </span>

                          <MessageStatusTicks message={msg} />
                        </div>
                      </div>

                      {messageMenu}

                      {selectionControl}
                    </div>
                  );
                }

                // =================================================
                // VOICE
                // =================================================

                if (msg.type === "voice") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex items-start gap-2"
                    >
                      {selectionControl}

                      <div className="flex w-[250px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
                        >
                          <FiPlay size={14} />
                        </button>

                        <div className="flex-1">
                          <div className="h-1.5 rounded-full bg-gray-200">
                            <div className="h-1.5 w-[55%] rounded-full bg-blue-500" />
                          </div>
                        </div>

                        <span className="text-[11px] text-gray-500">
                          {msg.duration}
                        </span>
                      </div>

                      {messageMenu}
                    </div>
                  );
                }

                // =================================================
                // FILE
                // =================================================

                if (msg.type === "file") {
                  const fileName = msg.attachment?.name || msg.file || msg.text;

                  const fileSize = formatFileSize(msg.attachment?.size);

                  const attachmentType = getAttachmentType(msg.attachment);

                  const previewUrl = filePreviewUrls[msg.fileId];

                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className={`group mb-4 flex min-w-0 items-start gap-2 ${
                        isSent ? "justify-end" : ""
                      }`}
                    >
                      {!isSent && selectionControl}

                      <div className="min-w-0 max-w-[75%] rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex min-w-0 items-center gap-3">
                          {attachmentType === "image" && previewUrl ? (
                            <button
                              type="button"
                              onClick={() => previewSharedFile(msg)}
                              className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                              aria-label={`Preview ${fileName}`}
                            >
                              <img
                                src={previewUrl}
                                alt={fileName}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ) : attachmentType === "video" && previewUrl ? (
                            <button
                              type="button"
                              onClick={() => previewSharedFile(msg)}
                              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                              aria-label={`Preview ${fileName}`}
                            >
                              <video
                                src={previewUrl}
                                muted
                                preload="metadata"
                                className="h-full w-full object-cover"
                              />

                              <FiPlay className="absolute inset-0 m-auto text-white drop-shadow" />
                            </button>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                              {attachmentType === "video" ? (
                                <FiVideo className="text-blue-600" />
                              ) : attachmentType === "image" ? (
                                <FiImage className="text-blue-600" />
                              ) : (
                                <FiFileText className="text-blue-600" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className="break-words text-[11px] font-medium [overflow-wrap:anywhere]">
                              {fileName}
                            </h4>

                            <p className="text-[10px] text-gray-500">
                              {fileSize}
                            </p>
                          </div>

                          {msg.conversationId && msg.fileId && (
                            <div className="ml-auto flex shrink-0 items-center gap-2 text-blue-600">
                              <button
                                type="button"
                                onClick={() => previewSharedFile(msg)}
                                className="hover:text-blue-800"
                                aria-label="Preview shared file"
                              >
                                <FiEye size={15} />
                              </button>

                              {msg.attachment?.permission !== "view" && (
                                <button
                                  type="button"
                                  onClick={() => downloadSharedFile(msg)}
                                  className="hover:text-blue-800"
                                  aria-label="Download shared file"
                                >
                                  <FiDownload size={15} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {isSent && (
                          <div className="mt-2 flex items-center justify-end">
                            <span className="text-[9px] text-gray-400">
                              {msg.time}
                            </span>

                            <MessageStatusTicks message={msg} />
                          </div>
                        )}
                      </div>

                      {messageMenu}

                      {isSent && selectionControl}
                    </div>
                  );
                }

                return null;
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* ================================================= */}
            {/* INPUT / SELECTION TOOLBAR */}
            {/* ================================================= */}

            <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
              {selectionMode ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FB] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FiTrash2 className="text-gray-500" size={16} />

                    <span className="text-[11px] text-gray-600">
                      {selectedMessageIds.length} message
                      {selectedMessageIds.length === 1 ? "" : "s"} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!selectedMessageIds.length || bulkDeleting}
                      onClick={() => bulkDeleteSelected("me")}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Delete for me
                    </button>

                    {canBulkDeleteEveryone && (
                      <button
                        type="button"
                        disabled={bulkDeleting}
                        onClick={() => bulkDeleteSelected("everyone")}
                        className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Delete for everyone
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {uploadState.status !== "idle" && (
                    <div
                      className={`mb-2 text-[10px] ${
                        uploadState.status === "error"
                          ? "text-red-500"
                          : uploadState.status === "uploading"
                            ? "text-blue-600"
                            : "text-green-600"
                      }`}
                    >
                      {uploadState.message}
                    </div>
                  )}

                  <div className="relative flex items-center gap-2 rounded-xl border border-gray-100 bg-[#F5F7FB] px-3 py-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      <FiPaperclip size={18} />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.tar,.gz"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => handleTyping(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={`Message ${
                        selectedUser?.name || "this conversation"
                      }...`}
                      className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setShowEmoji((prev) => !prev)}
                      className="text-gray-500 hover:text-yellow-500"
                    >
                      <FiSmile size={18} />
                    </button>

                    {showEmoji && (
                      <div className="absolute bottom-14 right-16 z-20 grid w-48 grid-cols-6 gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                        {[
                          "😀",
                          "😂",
                          "😍",
                          "👍",
                          "❤️",
                          "🎉",
                          "🔥",
                          "👏",
                          "😊",
                          "😎",
                          "🙌",
                          "✅",
                        ].map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              handleTyping(`${messageText}${emoji}`);

                              setShowEmoji(false);
                            }}
                            className="text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsRecording((prev) => !prev)}
                      className={
                        isRecording
                          ? "text-red-500"
                          : "text-gray-500 hover:text-red-500"
                      }
                    >
                      <FiMic size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={
                        !selectedUser || !messageText.trim() || !isConnected
                      }
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <FiSend size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </main>

          {/* ================================================= */}
          {/* RIGHT SIDEBAR */}
          {/* ================================================= */}

          <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white">
            <div className="border-b border-gray-200 p-4">
              <h2 className="text-[14px] font-semibold text-gray-900">
                Shared Media
              </h2>

              <p className="mt-1 text-[10px] leading-4 text-gray-500">
                Files and photos shared in this conversation.
              </p>
            </div>

            {/* IMAGES */}

            <div className="p-4">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Images
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {sharedFiles
                  .filter((file) => file.type === "image")
                  .map((file) => (
                    <button
                      key={file.fileId}
                      type="button"
                      onClick={() => previewSharedFile(file)}
                      className="aspect-square overflow-hidden rounded-xl bg-[#E5E7EB]"
                      aria-label={`Preview ${file.name}`}
                    >
                      {filePreviewUrls[file.fileId] ? (
                        <img
                          src={filePreviewUrls[file.fileId]}
                          alt={file.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FiImage className="mx-auto text-gray-500" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* VIDEOS */}

            <div className="px-4 pb-4">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Videos
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {sharedFiles
                  .filter((file) => file.type === "video")
                  .map((file) => (
                    <button
                      key={file.fileId}
                      type="button"
                      onClick={() => previewSharedFile(file)}
                      className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#E5E7EB]"
                      aria-label={`Preview ${file.name}`}
                    >
                      {filePreviewUrls[file.fileId] && (
                        <video
                          src={filePreviewUrls[file.fileId]}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      )}

                      <div className="absolute flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                        <FiPlay className="text-gray-500" size={12} />
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* RECENT FILES */}

            <div className="px-4 pb-4">
              <h3 className="mb-3 text-[12px] font-semibold">Recent Files</h3>

              {sharedFiles
                .filter(
                  (file) => file.type !== "image" && file.type !== "video",
                )
                .map((file) => (
                  <div
                    key={file.fileId}
                    className="flex items-center gap-3 border-b border-gray-200 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <FiFileText className="text-blue-600" size={15} />
                    </div>

                    <button
                      type="button"
                      onClick={() => previewSharedFile(file)}
                      className="min-w-0 text-left"
                      aria-label={`Preview ${file.name}`}
                    >
                      <h4 className="truncate text-[10px] font-medium">
                        {file.name}
                      </h4>

                      <p className="text-[9px] text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </button>

                    {file.permission !== "view" && (
                      <button
                        type="button"
                        onClick={() => downloadSharedFile(file)}
                        className="ml-auto text-blue-600 hover:text-blue-800"
                        aria-label={`Download ${file.name}`}
                      >
                        <FiDownload size={14} />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Chat;
