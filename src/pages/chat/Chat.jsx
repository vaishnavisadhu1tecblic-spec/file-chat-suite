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
  FiArrowLeft,
  FiTrash2,
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import Avatar from "../../components/common/Avatar";
import BottomNav from "./components/BottomNav";
import GroupSection from "./components/GroupSection";
import StatusSection from "./components/StatusSection";
import CallsSection from "./components/CallsSection";
import CallingOverlay from "./components/CallingOverlay";

const BACKEND_BASE =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_BACKEND_URL
    ? import.meta.env.VITE_BACKEND_URL.replace(/\/api$/, "")
    : "http://localhost:3005");
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

const normalizeUnreadCounts = (payload) => {
  const source =
    payload?.counts || payload?.unreadCounts || payload?.data || payload || {};

  if (Array.isArray(source)) {
    return source.reduce((result, item) => {
      const key =
        item?.conversationId || item?.chatId || item?.chatKey || item?._id;

      if (key) {
        result[String(key)] = Number(
          item?.count ?? item?.unreadCount ?? item?.unread ?? 0,
        );
      }

      return result;
    }, {});
  }

  if (source && typeof source === "object") {
    return Object.entries(source).reduce((result, [key, value]) => {
      if (value && typeof value === "object") {
        result[String(key)] = Number(
          value.count ?? value.unreadCount ?? value.unread ?? 0,
        );
      } else {
        result[String(key)] = Number(value || 0);
      }

      return result;
    }, {});
  }

  return {};
};

function Chat() {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const chatSearchInputRef = useRef(null);
  const previewRequestsRef = useRef(new Set());
  const previousMessageCountRef = useRef(0);

  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [activeNavTab, setActiveNavTab] = useState("chat"); // 'chat' | 'groups' | 'status' | 'calls'
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const callingOverlayRef = useRef(null);

  const [selectedChatId, setSelectedChatId] = useState("");
  const [chats, setChats] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [friendActionState, setFriendActionState] = useState({});
  const [messagesByChat, setMessagesByChat] = useState({});
  const [sharedFiles, setSharedFiles] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState({});
  const [uploadState, setUploadState] = useState({
    status: "idle",
    message: "",
  });

  const [paginationByChat, setPaginationByChat] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingByChat, setTypingByChat] = useState({});

  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [openMessageMenu, setOpenMessageMenu] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  /*
   * Mobile:
   * false = chat list
   * true = selected chat
   */
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // =====================================================
  // CURRENT USER
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
      const [
        conversationResponse,
        friendsResponse,
        requestsResponse,
        unreadResponse,
      ] = await Promise.all([
        api.get("/conversations", {
          params: { type: "private" },
        }),
        api.get("/friends"),
        api.get("/friends/requests"),
        api.get("/messages/unread-counts").catch(() => ({
          data: {},
        })),
      ]);

      const nextUnreadCounts = normalizeUnreadCounts(unreadResponse?.data);

      setUnreadCounts(nextUnreadCounts);

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

          return {
            id: conversation?._id
              ? String(conversation._id)
              : `friend-${receiverId}`,

            chatKey,

            conversationId: conversation?._id ? String(conversation._id) : null,

            name: displayName,

            avatar: getInitials(displayName),

            online: false,

            members: conversation
              ? "Private conversation"
              : "Friend - start a conversation",

            message: conversation
              ? "No messages yet"
              : "Start a private conversation",

            time: "",

            type: "private",

            receiverId,
          };
        })
        .filter(Boolean);

      setFriendRequests(requestsResponse.data?.requests || []);
      setFriendsList(friendsResponse.data?.friends || []);
      setChats(nextChats);

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
  // USER SEARCH
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
          params: {
            q: query,
          },
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

  const selectedUser = selectedGroup
    ? {
        id: selectedGroup._id,
        _id: selectedGroup._id,
        conversationId: selectedGroup._id,
        chatKey: selectedGroup._id,
        name: selectedGroup.name,
        avatar: selectedGroup.avatar || getInitials(selectedGroup.name),
        type: "group",
        isGroup: true,
        groupData: selectedGroup,
      }
    : chats.find((chat) => chat.id === selectedChatId) || null;

  const selectedUserType = selectedUser?.type || "";

  const selectedUserId = selectedUser?.conversationId;

  const selectedUserReceiverId = selectedUser?.receiverId;

  const activeChatId = selectedGroup
    ? String(selectedGroup._id)
    : selectedUser?.type === "private" &&
        selectedUser?.receiverId &&
        currentUserId
      ? selectedUser.chatKey
      : String(selectedUser?.chatKey || "");

  const currentMessages = useMemo(
    () => messagesByChat[activeChatId] || [],
    [messagesByChat, activeChatId],
  );

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const visibleChats = filteredChats;

  const markChatAsRead = useCallback(async (conversationId, chatKey) => {
    if (!conversationId) {
      return;
    }

    setUnreadCounts((previous) => {
      const next = { ...previous };

      [chatKey, conversationId, String(chatKey || "")].forEach((key) => {
        if (key) {
          next[String(key)] = 0;
        }
      });

      return next;
    });

    try {
      if (socket.connected) {
        socket.emit("mark_messages_read", { conversationId });
        return;
      }

      await api.post(`/messages/conversation/${conversationId}/read`);
    } catch (error) {
      console.error("Mark chat as read failed:", error);
    }
  }, []);

  // =====================================================
  // OPEN CHAT & CALL ACTIONS
  // =====================================================

  const openChat = async (chat) => {
    setSelectedGroup(null);
    if (chat.conversationId) {
      setSelectedChatId(chat.id);
      setMobileChatOpen(true);
      await markChatAsRead(chat.conversationId, chat.chatKey);
      return;
    }

    try {
      const response = await api.post(
        `/conversations/private/${chat.receiverId}`,
      );

      const conversationId = String(response.data?.conversation?._id || "");

      await loadChatData();

      setSelectedChatId(conversationId);
      setMobileChatOpen(true);
    } catch (error) {
      console.error("Private conversation creation failed:", error);

      alert(error.response?.data?.message || "Unable to open conversation");
    }
  };

  const closeMobileChat = () => {
    setMobileChatOpen(false);
    setTopMenuOpen(false);
    setShowEmoji(false);
    setOpenMessageMenu(null);
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedChatId(`group-${group._id}`);
    setMobileChatOpen(true);
    if (socket.connected) {
      socket.emit("join_chat", { conversationId: group._id });
    }
  };

  const handleStartCall = (targetUser, callType = "voice") => {
    callingOverlayRef.current?.startCall(
      targetUser,
      callType,
      selectedUser?.conversationId || activeChatId,
    );
  };

  // =====================================================
  // FRIEND REQUESTS
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
            String(item._id) === userId
              ? {
                  ...item,
                  status,
                }
              : item,
          ),
        );
      } else {
        alert(error.response?.data?.message || "Unable to send friend request");
      }
    } finally {
      setFriendActionState((previous) => {
        const next = {
          ...previous,
        };

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
        const next = {
          ...previous,
        };

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
      return;
    }

    socket.auth = {
      token,
    };

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = () => {
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
  // PRESENCE
  // =====================================================

  useEffect(() => {
    const handleUserStatusChanged = (payload) => {
      const userId = String(payload?.userId || payload?.id || "");

      if (!userId) {
        return;
      }

      setChats((previous) =>
        previous.map((chat) =>
          String(chat.receiverId) === userId
            ? {
                ...chat,
                online: payload?.online ?? payload?.status === "online",
              }
            : chat,
        ),
      );
    };

    const handlePresence = (payload) => {
      const userId = String(payload?.userId || payload?.id || "");

      if (!userId) {
        return;
      }

      setChats((previous) =>
        previous.map((chat) =>
          String(chat.receiverId) === userId
            ? {
                ...chat,
                online: payload?.online ?? payload?.status === "online",
              }
            : chat,
        ),
      );
    };

    socket.on("user_status_changed", handleUserStatusChanged);
    socket.on("presence", handlePresence);

    if (socket.connected) {
      const userIds = chats
        .map((chat) => chat.receiverId)
        .filter(Boolean)
        .map((userId) => String(userId));

      if (userIds.length > 0) {
        socket.emit("request_presence", { userIds });
      }
    }

    return () => {
      socket.off("user_status_changed", handleUserStatusChanged);
      socket.off("presence", handlePresence);
    };
  }, [chats]);

  // =====================================================
  // LOAD CHAT HISTORY
  // =====================================================

  const refreshCurrentConversationMessages = useCallback(async () => {
    if (!activeChatId || !selectedUser?.conversationId) {
      return;
    }

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
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const messages = response.data?.messages || [];

      const formattedMessages = messages.map((message) => {
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
          type: message.messageType === "file" ? "file" : type,
        };
      });

      setMessagesByChat((previous) => ({
        ...previous,
        [activeChatId]: formattedMessages,
      }));

      const hasMore =
        response.data?.hasMore ??
        response.data?.pagination?.hasMore ??
        messages.length >= 20;

      const lastMessage = formattedMessages[0];

      setPaginationByChat((previous) => ({
        ...previous,
        [activeChatId]: {
          hasMore,
          nextCursor:
            response.data?.nextCursor ||
            response.data?.pagination?.nextCursor ||
            lastMessage?.createdAt ||
            lastMessage?._id ||
            null,
          loading: false,
        },
      }));
    } catch (error) {
      console.error(
        "CHAT HISTORY ERROR:",
        error.response?.data || error.message,
      );
    }
  }, [
    activeChatId,
    currentUserId,
    selectedUser?.conversationId,
    selectedUserType,
  ]);

  useEffect(() => {
    if (!selectedUser?.conversationId || !activeChatId) {
      return;
    }

    markChatAsRead(selectedUser.conversationId, activeChatId);
  }, [activeChatId, markChatAsRead, selectedUser?.conversationId]);

  useEffect(() => {
    refreshCurrentConversationMessages();
  }, [refreshCurrentConversationMessages]);

  useEffect(() => {
    const handleChatRefresh = async () => {
      await loadChatData();
      await refreshCurrentConversationMessages();
    };

    window.addEventListener("syncspace:chat-updated", handleChatRefresh);
    window.addEventListener("syncspace:backup-restored", handleChatRefresh);

    return () => {
      window.removeEventListener("syncspace:chat-updated", handleChatRefresh);
      window.removeEventListener(
        "syncspace:backup-restored",
        handleChatRefresh,
      );
    };
  }, [loadChatData, refreshCurrentConversationMessages]);

  // =====================================================
  // LOAD SHARED FILES
  // =====================================================

  useEffect(() => {
    if (!activeChatId || !selectedUserType || !selectedUser?.conversationId) {
      return;
    }

    const loadConversationFiles = async () => {
      try {
        const response = await api.get(
          `/conversations/${selectedUser.conversationId}/files`,
        );

        setSharedFiles(response.data?.files || []);
      } catch (error) {
        console.error("Conversation files load failed:", error);

        setSharedFiles([]);
      }
    };

    loadConversationFiles();
  }, [activeChatId, selectedUser?.conversationId, selectedUserType]);

  // =====================================================
  // JOIN CHAT
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
    selectedUserId,
    activeChatId,
  ]);

  // =====================================================
  // LOCAL MESSAGE HELPER
  // =====================================================

  const addMessageToChat = useCallback((chatId, message) => {
    if (!chatId) {
      return;
    }

    setMessagesByChat((previous) => {
      const existing = previous[chatId] || [];

      return {
        ...previous,
        [chatId]: appendUniqueMessage(existing, message),
      };
    });
  }, []);

  // =====================================================
  // RECEIVE PRIVATE MESSAGE
  // =====================================================

  useEffect(() => {
    const handlePrivateMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      const messageChatId = String(message.chatId);

      const isActive = messageChatId === String(activeChatId);

      if (isActive) {
        setUnreadCounts((previous) => ({
          ...previous,
          [messageChatId]: 0,
          [selectedUser?.conversationId || messageChatId]: 0,
        }));
      }

      setMessagesByChat((previous) => {
        const existing = previous[messageChatId] || [];

        const newMessage = {
          ...message,
          _id: message._id ? String(message._id) : undefined,
          senderId: String(message.senderId || ""),
          receiverId: message.receiverId ? String(message.receiverId) : null,
          type:
            String(message.senderId) === currentUserId ? "sent" : "received",
        };

        return {
          ...previous,
          [messageChatId]: appendUniqueMessage(existing, newMessage),
        };
      });

      if (!isActive) {
        setUnreadCounts((previous) => ({
          ...previous,
          [messageChatId]: Number(previous[messageChatId] || 0) + 1,
        }));
      }

      setChats((previous) =>
        previous.map((chat) =>
          chat.chatKey === messageChatId
            ? {
                ...chat,
                message: message.text || chat.message,
                time: message.time || chat.time,
              }
            : chat,
        ),
      );
    };

    socket.on("receive_private_message", handlePrivateMessage);

    return () => {
      socket.off("receive_private_message", handlePrivateMessage);
    };
  }, [currentUserId, activeChatId, selectedUser?.conversationId]);

  // =====================================================
  // RECEIVE GROUP MESSAGE
  // =====================================================

  useEffect(() => {
    const handleGroupMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      const chatId = String(message.chatId);

      const isActive = chatId === String(activeChatId);

      if (isActive) {
        setUnreadCounts((previous) => ({
          ...previous,
          [chatId]: 0,
          [selectedUser?.conversationId || chatId]: 0,
        }));
      }

      addMessageToChat(chatId, {
        ...message,
        _id: message._id ? String(message._id) : undefined,
        senderId: String(message.senderId || ""),
        type: String(message.senderId) === currentUserId ? "sent" : "received",
      });

      if (!isActive) {
        setUnreadCounts((previous) => ({
          ...previous,
          [chatId]: Number(previous[chatId] || 0) + 1,
        }));
      }
    };

    socket.on("receive_message", handleGroupMessage);

    return () => {
      socket.off("receive_message", handleGroupMessage);
    };
  }, [
    addMessageToChat,
    activeChatId,
    currentUserId,
    selectedUser?.conversationId,
  ]);

  // =====================================================
  // RECEIVE FILE MESSAGE
  // =====================================================

  useEffect(() => {
    const handleFileMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      addMessageToChat(message.chatId, {
        ...message,
        type: "file",
      });
    };

    socket.on("receive_file_message", handleFileMessage);

    return () => {
      socket.off("receive_file_message", handleFileMessage);
    };
  }, [addMessageToChat]);

  // =====================================================
  // TYPING
  // =====================================================

  const handleTyping = (value) => {
    setMessageText(value);

    if (!selectedUser || !socket.connected) {
      return;
    }

    if (selectedUser.type === "private") {
      socket.emit("typing_start", {
        receiverId: selectedUser.receiverId,
        chatId: activeChatId,
      });
    } else {
      socket.emit("typing_start", {
        chatId: selectedUser.id,
      });
    }
  };

  useEffect(() => {
    const handleTypingStart = (payload) => {
      const chatId = payload?.chatId || payload?.conversationId;

      if (!chatId) {
        return;
      }

      setTypingByChat((previous) => ({
        ...previous,
        [String(chatId)]: true,
      }));
    };

    const handleTypingStop = (payload) => {
      const chatId = payload?.chatId || payload?.conversationId;

      if (!chatId) {
        return;
      }

      setTypingByChat((previous) => ({
        ...previous,
        [String(chatId)]: false,
      }));
    };

    socket.on("typing_start", handleTypingStart);

    socket.on("typing_stop", handleTypingStop);

    return () => {
      socket.off("typing_start", handleTypingStart);

      socket.off("typing_stop", handleTypingStop);
    };
  }, []);

  // =====================================================
  // MESSAGE STATUS
  // =====================================================

  useEffect(() => {
    const handleMessageStatusUpdated = (payload) => {
      const messageId = payload?.messageId || payload?._id;

      const status = payload?.status;

      if (!messageId || !status) {
        return;
      }

      if (status === "read") {
        const chatId = payload?.chatId || payload?.conversationId;

        if (chatId) {
          setUnreadCounts((previous) => ({
            ...previous,
            [String(chatId)]: 0,
            [selectedUser?.conversationId || String(chatId)]: 0,
          }));
        }
      }

      setMessagesByChat((previous) => {
        const next = {};

        Object.entries(previous).forEach(([chatId, messages]) => {
          next[chatId] = messages.map((message) =>
            String(message._id) === String(messageId)
              ? {
                  ...message,
                  status,
                }
              : message,
          );
        });

        return next;
      });
    };

    socket.on("message_status_updated", handleMessageStatusUpdated);

    return () => {
      socket.off("message_status_updated", handleMessageStatusUpdated);
    };
  }, [selectedUser?.conversationId]);

  // =====================================================
  // PAGINATION
  // =====================================================

  const loadOlderMessages = useCallback(async () => {
    if (!activeChatId || !selectedUser?.conversationId) {
      return;
    }

    const pagination = paginationByChat[activeChatId];

    if (pagination?.loading || pagination?.hasMore === false) {
      return;
    }

    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    const previousScrollHeight = container.scrollHeight;

    const previousScrollTop = container.scrollTop;

    setPaginationByChat((previous) => ({
      ...previous,
      [activeChatId]: {
        ...(previous[activeChatId] || {}),
        loading: true,
      },
    }));

    try {
      const token = localStorage.getItem("token");

      const params = {
        limit: 20,
      };

      if (pagination?.nextCursor) {
        params.before = pagination.nextCursor;
      }

      const response = await axios.get(
        `${BACKEND_BASE}/api/messages/${activeChatId}`,
        {
          params,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const messages = response.data?.messages || [];

      const formattedMessages = messages.map((message) => {
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
          type: message.messageType === "file" ? "file" : type,
        };
      });

      setMessagesByChat((previous) => {
        const existing = previous[activeChatId] || [];

        const merged = [...formattedMessages, ...existing];

        const unique = [];
        const seen = new Set();

        merged.forEach((message) => {
          const id = String(
            message._id ||
              `${message.senderId}-${message.time}-${message.text}`,
          );

          if (!seen.has(id)) {
            seen.add(id);
            unique.push(message);
          }
        });

        return {
          ...previous,
          [activeChatId]: unique,
        };
      });

      const nextCursor =
        response.data?.nextCursor ||
        response.data?.pagination?.nextCursor ||
        formattedMessages[0]?._id ||
        null;

      const hasMore =
        response.data?.hasMore ??
        response.data?.pagination?.hasMore ??
        formattedMessages.length >= 20;

      setPaginationByChat((previous) => ({
        ...previous,
        [activeChatId]: {
          hasMore,
          nextCursor,
          loading: false,
        },
      }));

      requestAnimationFrame(() => {
        if (!messagesContainerRef.current) {
          return;
        }

        const newScrollHeight = messagesContainerRef.current.scrollHeight;

        messagesContainerRef.current.scrollTop =
          newScrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch (error) {
      console.error("Older messages load failed:", error);

      setPaginationByChat((previous) => ({
        ...previous,
        [activeChatId]: {
          ...(previous[activeChatId] || {}),
          loading: false,
        },
      }));
    }
  }, [
    activeChatId,
    currentUserId,
    paginationByChat,
    selectedUser?.conversationId,
    selectedUserType,
  ]);

  const handleMessagesScroll = () => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    if (container.scrollTop <= 80) {
      loadOlderMessages();
    }
  };

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;

    const currentCount = currentMessages.length;

    if (currentCount === 0 || currentCount < previousCount) {
      previousMessageCountRef.current = currentCount;
      return;
    }

    const shouldScroll = currentCount > previousCount || previousCount === 0;

    if (shouldScroll) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }

    previousMessageCountRef.current = currentCount;
  }, [currentMessages.length, selectedChatId]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = () => {
    const text = messageText.trim();

    if (!text || !selectedUser) {
      return;
    }

    if (!currentUserId) {
      return;
    }

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const localId = `local-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    if (selectedUser.type === "private") {
      if (!selectedUser.receiverId) {
        return;
      }

      const privateMessage = {
        chatId: activeChatId,
        senderId: currentUserId,
        receiverId: String(selectedUser.receiverId),
        text,
        time,
        type: "sent",
        status: "sent",
        _id: localId,
      };

      if (socket.connected) {
        addMessageToChat(activeChatId, privateMessage);

        socket.emit("send_private_message", privateMessage);
      } else {
        addMessageToChat(activeChatId, privateMessage);
      }
    } else {
      const groupMessage = {
        chatId: selectedUser.conversationId || selectedUser.id,
        conversationId: selectedUser.conversationId || selectedUser.id,
        senderId: currentUserId,
        text,
        time,
        type: "sent",
        status: "sent",
        _id: localId,
      };

      if (socket.connected) {
        addMessageToChat(activeChatId, groupMessage);
        socket.emit("send_message", groupMessage);
      } else {
        addMessageToChat(activeChatId, groupMessage);
      }
    }

    setMessageText("");
    setShowEmoji(false);

    if (selectedUser?.type === "private") {
      socket.emit("typing_stop", {
        receiverId: selectedUser.receiverId,
        chatId: activeChatId,
      });
    }
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
        addMessageToChat(activeChatId, {
          ...message,
          type: "file",
        });

        setSharedFiles((previous) => [
          {
            fileId: message.fileId,
            conversationId: message.conversationId,
            name: message.attachment?.name || file.name,
            mimeType: message.attachment?.mimeType || file.type,
            size: message.attachment?.size || file.size,
            type: getAttachmentType(message.attachment),
            permission: message.attachment?.permission || "download",
          },
          ...previous.filter((item) => item.fileId !== message.fileId),
        ]);
      }

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

      setFilePreviewUrls((previous) => ({
        ...previous,
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

  const isMessageSentByCurrentUser = (message) =>
    String(message?.senderId || "") === String(currentUserId);

  const removeMessageFromLocalChat = (messageId) => {
    if (!messageId) {
      return;
    }

    setMessagesByChat((previous) => ({
      ...previous,
      [activeChatId]: (previous[activeChatId] || []).filter(
        (message) => String(message._id) !== String(messageId),
      ),
    }));
  };

  const deleteMessageForMe = async (message) => {
    if (!message?._id) {
      return;
    }

    const messageId = String(message._id);

    if (messageId.startsWith("local-")) {
      removeMessageFromLocalChat(messageId);

      setOpenMessageMenu(null);
      return;
    }

    setDeletingMessageId(messageId);

    try {
      await api.delete(`/messages/${messageId}`, {
        params: {
          mode: "me",
        },
      });

      removeMessageFromLocalChat(messageId);

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

    if (!isMessageSentByCurrentUser(message)) {
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

  const toggleMessageSelection = (messageId) => {
    const id = String(messageId || "");

    if (!id) {
      return;
    }

    setSelectedMessageIds((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id],
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

      setMessagesByChat((previous) => ({
        ...previous,
        [activeChatId]: (previous[activeChatId] || []).filter(
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

      setMessagesByChat((previous) => ({
        ...previous,
        [activeChatId]: [],
      }));

      setPaginationByChat((previous) => ({
        ...previous,
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

    setMessagesByChat((previous) => {
      const next = {};

      Object.entries(previous).forEach(([chatId, messages]) => {
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
  // MESSAGE STATUS TICKS
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
  // UI
  // =====================================================

  return (
    <div className="flex h-screen min-h-0 overflow-hidden bg-[#F7F8FC]">
      {/* DESKTOP SIDEBAR */}
      <div className="shrink-0 lg:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <Navbar />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ================================================= */}
          {/* LEFT CHAT LIST */}
          {/* ================================================= */}

          <aside
            className={`${
              mobileChatOpen ? "hidden md:flex" : "flex"
            } w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-[280px] lg:w-[320px] xl:w-[320px]`}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {activeNavTab === "chat" && (
                <>
                  <div className="border-b border-gray-200 p-3 sm:p-4">
                    <div className="flex items-center rounded-xl bg-[#F5F7FB] px-3 py-2.5 sm:px-4 sm:py-3">
                      <FiSearch className="shrink-0 text-gray-400" />

                      <input
                        ref={chatSearchInputRef}
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search users or conversations..."
                        className="ml-2 min-w-0 flex-1 bg-transparent text-xs outline-none sm:ml-3"
                      />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {/* FRIEND REQUESTS */}

                    {friendRequests.length > 0 && (
                      <div className="border-b border-gray-200 px-3 py-3 sm:px-4">
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
                              className="mb-2 flex min-w-0 items-center gap-2 last:mb-0"
                            >
                              <Avatar
                                user={requester}
                                size={32}
                                showOnline={false}
                              />

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[11px] font-semibold text-gray-900">
                                  {requester.name ||
                                    requester.username ||
                                    requester.email}
                                </p>

                                <p className="truncate text-[9px] text-gray-500">
                                  Wants to connect
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={() =>
                                  respondToFriendRequest(request._id, "accept")
                                }
                                className="shrink-0 text-green-600 hover:text-green-800 disabled:opacity-50"
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
                                className="shrink-0 text-red-500 hover:text-red-700 disabled:opacity-50"
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
                      <div className="border-b border-gray-200 px-3 py-3 sm:px-4">
                        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                          Search Results
                        </h3>

                        {userSearchResults.map((user) => {
                          const userId = String(user._id);

                          const isLoading =
                            friendActionState[userId] === "loading";

                          const status = user.status || "Add Friend";

                          return (
                            <div
                              key={userId}
                              className="mb-2 flex min-w-0 items-center gap-2 last:mb-0"
                            >
                              <Avatar
                                user={user}
                                size={32}
                                showOnline={false}
                              />

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
                                  className="shrink-0 text-blue-600 hover:text-blue-800 disabled:opacity-50"
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
                          className={`cursor-pointer border-b border-gray-100 px-3 py-3 transition sm:px-4 ${
                            selectedChatId === chat.id
                              ? "border-l-4 border-l-blue-600 bg-blue-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              user={{ name: chat.name, avatar: chat.avatar }}
                              size={40}
                              showOnline={chat.online}
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center justify-between gap-2">
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
                </>
              )}

              {activeNavTab === "groups" && (
                <GroupSection
                  currentUser={currentUser}
                  onSelectGroup={handleSelectGroup}
                  selectedGroupId={selectedGroup?._id}
                  socket={socket}
                />
              )}

              {activeNavTab === "status" && (
                <StatusSection
                  currentUser={currentUser}
                  onOpenDirectChat={openChat}
                />
              )}

              {activeNavTab === "calls" && (
                <CallsSection
                  currentUser={currentUser}
                  onStartCall={handleStartCall}
                  friends={friendsList}
                />
              )}
            </div>

            {/* FIXED BOTTOM NAVIGATION */}
            <BottomNav
              activeTab={activeNavTab}
              onSelectTab={setActiveNavTab}
              unreadChatCount={Object.values(unreadCounts).reduce(
                (a, b) => a + Number(b || 0),
                0,
              )}
            />
          </aside>

          {/* ================================================= */}
          {/* CENTER CHAT */}
          {/* ================================================= */}

          <main
            className={`${
              mobileChatOpen ? "flex" : "hidden md:flex"
            } min-w-0 min-h-0 flex-1 flex-col bg-white`}
          >
            {/* HEADER */}

            <div className="relative flex min-h-[56px] shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 sm:px-4">
              {selectionMode ? (
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={exitSelectionMode}
                    className="shrink-0 text-gray-500 hover:text-gray-800"
                    aria-label="Exit message selection"
                  >
                    <FiX />
                  </button>

                  <h2 className="truncate text-[13px] font-semibold text-gray-900">
                    {selectedMessageIds.length} selected
                  </h2>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={closeMobileChat}
                    className="shrink-0 text-gray-500 hover:text-gray-800 md:hidden"
                    aria-label="Back to chats"
                  >
                    <FiArrowLeft size={19} />
                  </button>

                  <Avatar
                    user={selectedUser}
                    size={34}
                    showOnline={!selectedUser?.isGroup && selectedUser?.online}
                  />

                  <div className="min-w-0">
                    <h2 className="truncate text-[13px] font-semibold text-gray-900">
                      {selectedUser?.name || "Select a conversation"}
                    </h2>

                    <p
                      className={`truncate text-[9px] ${
                        typingByChat[activeChatId]
                          ? "font-medium text-blue-600"
                          : selectedUser?.online
                            ? "text-green-600"
                            : "text-gray-400"
                      }`}
                    >
                      {selectedUser?.isGroup
                        ? `${selectedUser.groupData?.members?.length || 0} members`
                        : typingByChat[activeChatId]
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

              <div className="flex shrink-0 items-center gap-3 text-sm text-gray-500 sm:gap-4">
                {!selectionMode && selectedUser && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStartCall(selectedUser, "voice")}
                      className="hidden hover:text-blue-600 sm:block"
                      aria-label="Call"
                    >
                      <FiPhone />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartCall(selectedUser, "video")}
                      className="hidden hover:text-blue-600 sm:block"
                      aria-label="Video call"
                    >
                      <FiVideo />
                    </button>

                    <button
                      type="button"
                      onClick={() => setTopMenuOpen((previous) => !previous)}
                      className="hover:text-blue-600"
                      aria-label="Chat options"
                    >
                      <FiMoreVertical />
                    </button>
                  </>
                )}
              </div>

              {/* TOP MENU */}

              {!selectionMode && topMenuOpen && selectedUser && (
                <div className="absolute right-2 top-12 z-40 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg sm:right-3">
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
              className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FC] px-3 py-4 sm:px-5 sm:py-5 lg:px-7"
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
                      className="rounded-full p-1 text-gray-400 opacity-100 transition hover:bg-gray-100 hover:text-gray-700 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
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

                // RECEIVED TEXT

                if (msg.type === "received") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex min-w-0 items-start gap-2"
                    >
                      {selectionControl}

                      <div className="min-w-0 max-w-[88%] rounded-xl rounded-tl-md border border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:max-w-[75%] sm:px-4 sm:py-3">
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

                // SENT TEXT

                if (msg.type === "sent") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex min-w-0 items-start justify-end gap-2"
                    >
                      <div className="min-w-0 max-w-[88%] rounded-xl rounded-br-md bg-blue-600 px-3 py-2.5 text-white sm:max-w-[75%] sm:px-4 sm:py-3">
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

                // VOICE

                if (msg.type === "voice") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex min-w-0 items-start gap-2"
                    >
                      {selectionControl}

                      <div className="flex w-full max-w-[250px] min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"
                        >
                          <FiPlay size={14} />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="h-1.5 rounded-full bg-gray-200">
                            <div className="h-1.5 w-[55%] rounded-full bg-blue-500" />
                          </div>
                        </div>

                        <span className="shrink-0 text-[11px] text-gray-500">
                          {msg.duration}
                        </span>
                      </div>

                      {messageMenu}
                    </div>
                  );
                }

                // FILE

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

                      <div className="min-w-0 max-w-[92%] rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:max-w-[75%] sm:px-4">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          {attachmentType === "image" && previewUrl ? (
                            <button
                              type="button"
                              onClick={() => previewSharedFile(msg)}
                              className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-16 sm:w-16"
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
                              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-16 sm:w-16"
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

                  {selectedUser?.isGroup &&
                  selectedUser.groupData?.permissions?.sendMessages ===
                    "admins" &&
                  !(
                    String(
                      selectedUser.groupData.owner?._id ||
                        selectedUser.groupData.owner,
                    ) === currentUserId ||
                    selectedUser.groupData.members?.some(
                      (m) =>
                        String(m.userId?._id || m.userId?.id || m.userId) ===
                          currentUserId &&
                        (m.role === "admin" || m.role === "owner"),
                    )
                  ) ? (
                    <div className="flex h-11 items-center justify-center rounded-xl bg-gray-100 px-4 text-center text-xs font-medium text-gray-500">
                      Only group admins can send messages in this group.
                    </div>
                  ) : (
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
                  )}
                </>
              )}
            </div>
          </main>

          {/* ================================================= */}
          {/* RIGHT SIDEBAR */}
          {/* ================================================= */}

          <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white xl:block">
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
                    className="flex min-w-0 items-center gap-3 border-b border-gray-200 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                      <FiFileText className="text-blue-600" size={15} />
                    </div>

                    <button
                      type="button"
                      onClick={() => previewSharedFile(file)}
                      className="min-w-0 flex-1 text-left"
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
                        className="ml-auto shrink-0 text-blue-600 hover:text-blue-800"
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

      {/* WebRTC Calling Modal & Overlay */}
      <CallingOverlay
        ref={callingOverlayRef}
        socket={socket}
        currentUser={currentUser}
      />
    </div>
  );
}

export default Chat;
