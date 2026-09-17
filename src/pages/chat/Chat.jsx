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
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

//const BACKEND_BASE = "http://localhost:3005";
const BACKEND_BASE = import.meta.env.VITE_SOCKET_URL;

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

function Chat() {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const previewRequestsRef = useRef(new Set());

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
  const [sharedFiles, setSharedFiles] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState({});
  const [uploadState, setUploadState] = useState({
    status: "idle",
    message: "",
  });
  const [openMessageMenu, setOpenMessageMenu] = useState(null);
  const [deletingMessageId, setDeletingMessageId] = useState(null);

  // =====================================================
  // MOBILE SIDEBAR
  // =====================================================

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // =====================================================
  // CURRENT LOGGED-IN USER
  // =====================================================

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const currentUserId = String(currentUser?._id || currentUser?.id || "");

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

          return {
            id: conversation?._id
              ? String(conversation._id)
              : `friend-${receiverId}`,
            chatKey: [currentUserId, receiverId].sort().join("_"),
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
  // PRIVATE CHAT ID
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
  // FILTER CHATS
  // =====================================================

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const visibleChats = filteredChats;

  const openChat = async (chat) => {
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
  // MOBILE BACK
  // =====================================================

  const handleBackToChats = () => {
    setSelectedChatId("");
    setShowEmoji(false);

    setUploadState({
      status: "idle",
      message: "",
    });
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
  // LOAD CHAT HISTORY
  // =====================================================

  useEffect(() => {
    if (!activeChatId || !selectedUser?.conversationId) {
      return;
    }

    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.log("TOKEN MISSING");
          return;
        }

        console.log("=================================");
        console.log("FETCHING CHAT HISTORY");
        console.log("CHAT ID:", activeChatId);
        console.log("=================================");

        const response = await axios.get(
          `${BACKEND_BASE}/api/messages/${activeChatId}`,
          {
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
              String(message.receiverId) === currentUserId
                ? "received"
                : "sent";
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

        setMessagesByChat((prev) => ({
          ...prev,
          [activeChatId]: formattedMessages,
        }));
      } catch (error) {
        console.error(
          "CHAT HISTORY ERROR:",
          error.response?.data || error.message,
        );
      }
    };

    fetchMessages();
  }, [
    activeChatId,
    currentUserId,
    selectedUser?.conversationId,
    selectedUserType,
  ]);

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
      const groupRoom = `group_${String(selectedUserId)}`;

      console.log("JOINING GROUP:", groupRoom);

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
  // LOCAL MESSAGE HELPERS
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
  // RECEIVE PRIVATE MESSAGE
  // =====================================================

  useEffect(() => {
    const handlePrivateMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      setMessagesByChat((prev) => {
        const existingMessages = prev[message.chatId] || [];

        const messageType = message.type === "received" ? "received" : "sent";

        const newMessage = {
          ...message,
          _id: message._id ? String(message._id) : undefined,
          senderId: String(message.senderId || ""),
          receiverId: message.receiverId ? String(message.receiverId) : null,
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
  }, [currentUserId, activeChatId]);

  // =====================================================
  // RECEIVE GROUP MESSAGE
  // =====================================================

  useEffect(() => {
    const handleGroupMessage = (message) => {
      if (!message?.chatId) {
        return;
      }

      setMessagesByChat((prev) => {
        const existingMessages = prev[message.chatId] || [];

        const newMessage = {
          ...message,
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
  }, [currentUserId]);

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
  }, []);

  // =====================================================
  // RECEIVE MESSAGE DELETE
  // =====================================================

  useEffect(() => {
    const handleMessageDeleted = (data) => {
      if (!data?.messageId) {
        return;
      }

      const messageId = String(data.messageId);

      setMessagesByChat((prev) => {
        const next = {};

        Object.entries(prev).forEach(([chatId, messages]) => {
          next[chatId] = messages.filter(
            (message) => String(message._id) !== messageId,
          );
        });

        return next;
      });

      setOpenMessageMenu((current) => (current === messageId ? null : current));
    };

    socket.on("message_deleted", handleMessageDeleted);

    return () => {
      socket.off("message_deleted", handleMessageDeleted);
    };
  }, []);

  // =====================================================
  // DELETE MESSAGE
  // =====================================================

  const removeMessageFromLocalChat = useCallback(
    (messageId, chatId = activeChatId) => {
      if (!messageId || !chatId) {
        return;
      }

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
      console.error("Delete for me failed:", error);

      alert(
        error.response?.data?.message || "Unable to delete message for you",
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  const deleteMessageForEveryone = async (message) => {
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
          mode: "everyone",
        },
      });

      removeMessageFromLocalChat(messageId);
      setOpenMessageMenu(null);
    } catch (error) {
      console.error("Delete for everyone failed:", error);

      alert(
        error.response?.data?.message ||
          "Unable to delete message for everyone",
      );
    } finally {
      setDeletingMessageId(null);
    }
  };

  // =====================================================
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messagesByChat, selectedChatId]);

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  const sendMessage = () => {
    const text = messageText.trim();

    if (!text) {
      return;
    }

    if (!selectedUser) {
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
        _id: localId,
      };

      if (socket.connected) {
        addMessageToChat(activeChatId, privateMessage);

        socket.emit(
          "send_private_message",
          privateMessage,
          (acknowledgement) => {
            console.log(
              "CHAT DEBUG send_private_message acknowledgement:",
              acknowledgement,
            );
          },
        );
      } else {
        addMessageToChat(activeChatId, privateMessage);
      }
    } else {
      const groupMessage = {
        chatId: selectedUser.id,
        senderId: currentUserId,
        text,
        time,
        type: "sent",
        _id: localId,
      };

      if (socket.connected) {
        socket.emit("send_message", groupMessage);
      } else {
        addMessageToChat(activeChatId, groupMessage);
      }
    }

    setMessageText("");
    setShowEmoji(false);
  };

  // =====================================================
  // FILE
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
  // UI
  // =====================================================

  return (
    <div className="flex h-[100dvh] min-h-0 overflow-hidden bg-[#F7F8FC]">
      {/* ================================================= */}
      {/* MAIN APP SIDEBAR */}
      {/* ================================================= */}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMobileSidebarOpen(true)} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* ================================================= */}
          {/* LEFT CHAT LIST */}
          {/* ================================================= */}

          <aside
            className={`${
              selectedUser ? "hidden md:flex" : "flex"
            } w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-[280px] lg:w-[300px]`}
          >
            {/* SEARCH */}

            <div className="border-b border-gray-200 p-4 lg:p-5">
              <div className="flex items-center rounded-xl bg-[#F5F7FB] px-3 py-3 lg:px-4">
                <FiSearch className="shrink-0 text-gray-400" />

                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search users or conversations..."
                  className="ml-3 min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </div>
            </div>

            {/* CHAT LIST */}

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

              {/* CHATS */}

              {visibleChats.map((chat) => {
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
                          <h3 className="truncate text-[12px] font-semibold text-gray-900">
                            {chat.name}
                          </h3>

                          <span className="shrink-0 text-[9px] text-gray-400">
                            {chat.time}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-[10px] text-gray-500">
                          {messagesByChat[chat.chatKey]?.at(-1)?.text ||
                            chat.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ================================================= */}
          {/* CENTER CHAT */}
          {/* ================================================= */}

          <main
            className={`${
              selectedUser ? "flex" : "hidden md:flex"
            } min-w-0 flex-1 flex-col bg-white`}
          >
            {/* CHAT HEADER */}

            <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-gray-200 px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                {/* MOBILE BACK */}

                <button
                  type="button"
                  onClick={handleBackToChats}
                  className="flex shrink-0 items-center justify-center text-gray-500 hover:text-blue-600 md:hidden"
                  aria-label="Back to chats"
                >
                  <FiArrowLeft size={20} />
                </button>

                {/* USER AVATAR */}

                <div className="relative shrink-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                    {selectedUser?.avatar || "U"}
                  </div>

                  {selectedUser?.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>

                {/* USER NAME */}

                <div className="min-w-0">
                  <h2 className="truncate text-[13px] font-semibold text-gray-900">
                    {selectedUser?.name || "Select a conversation"}
                  </h2>

                  <p className="truncate text-[9px] text-green-600">
                    {selectedUser?.members || ""}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}

              <div className="flex shrink-0 items-center gap-3 text-sm text-gray-500 sm:gap-4">
                <button type="button" className="hover:text-blue-600">
                  <FiPhone />
                </button>

                <button type="button" className="hover:text-blue-600">
                  <FiVideo />
                </button>

                <button type="button" className="hover:text-blue-600">
                  <FiMoreVertical />
                </button>
              </div>
            </div>

            {/* ================================================= */}
            {/* MESSAGES */}
            {/* ================================================= */}

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FC] px-3 py-4 sm:px-5 lg:px-7 lg:py-5">
              <div className="mb-7 text-center text-[10px] text-gray-400">
                Today
              </div>

              {currentMessages.map((msg, index) => {
                // RECEIVED

                if (msg.type === "received") {
                  const messageId = String(msg._id || `${index}-${msg.time}`);
                  const isDeleting = deletingMessageId === String(msg._id);

                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex"
                    >
                      <div className="relative max-w-[85%] sm:max-w-[400px]">
                        <div className="break-words rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[12px] leading-5">{msg.text}</p>

                          <p className="mt-2 text-[9px] text-gray-400">
                            {msg.time}
                          </p>
                        </div>

                        <div className="absolute -right-2 top-1 sm:-right-8">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMessageMenu((current) =>
                                current === messageId ? null : messageId,
                              )
                            }
                            className="rounded-full bg-white p-1 text-gray-400 shadow-sm transition hover:bg-gray-100 hover:text-gray-700 md:bg-transparent md:shadow-none md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Message options"
                          >
                            <FiMoreVertical size={14} />
                          </button>

                          {openMessageMenu === messageId && (
                            <div className="absolute right-0 top-7 z-30 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => deleteMessageForMe(msg)}
                                className="block w-full px-3 py-2 text-left text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Delete for me
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // SENT

                if (msg.type === "sent") {
                  const messageId = String(msg._id || `${index}-${msg.time}`);
                  const isDeleting = deletingMessageId === String(msg._id);

                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="group mb-4 flex justify-end"
                    >
                      <div className="relative max-w-[85%] sm:max-w-[400px]">
                        <div className="break-words rounded-xl rounded-br-md bg-blue-600 px-4 py-3 text-white">
                          <p className="text-[12px] leading-5">{msg.text}</p>

                          <p className="mt-2 text-[9px] text-blue-100">
                            {msg.time}
                          </p>
                        </div>

                        <div className="absolute -left-2 top-1 sm:-left-8">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMessageMenu((current) =>
                                current === messageId ? null : messageId,
                              )
                            }
                            className="rounded-full bg-white p-1 text-gray-400 shadow-sm transition hover:bg-gray-100 hover:text-gray-700 md:bg-transparent md:shadow-none md:opacity-0 md:group-hover:opacity-100"
                            aria-label="Message options"
                          >
                            <FiMoreVertical size={14} />
                          </button>

                          {openMessageMenu === messageId && (
                            <div className="absolute left-0 top-7 z-30 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => deleteMessageForMe(msg)}
                                className="block w-full px-3 py-2 text-left text-[11px] text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                              >
                                Delete for me
                              </button>

                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => deleteMessageForEveryone(msg)}
                                className="block w-full px-3 py-2 text-left text-[11px] text-red-600 hover:bg-red-50 disabled:opacity-50"
                              >
                                Delete for everyone
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // VOICE

                if (msg.type === "voice") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="mb-4 flex"
                    >
                      <div className="flex w-full max-w-[250px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
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
                      className="mb-4 flex"
                    >
                      <div className="flex w-full max-w-[270px] min-w-0 items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
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
                          <h4 className="truncate text-[11px] font-medium">
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
                    </div>
                  );
                }

                return null;
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* ================================================= */}
            {/* INPUT */}
            {/* ================================================= */}

            <div className="shrink-0 border-t border-gray-200 bg-white px-2 py-2 sm:px-5 sm:py-3">
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

              <div className="relative flex min-w-0 items-center gap-1 rounded-xl border border-gray-100 bg-[#F5F7FB] px-2 py-2 sm:gap-2 sm:px-3">
                {/* ATTACHMENT */}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 text-gray-500 hover:text-blue-600"
                  aria-label="Attach file"
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

                {/* MESSAGE INPUT */}

                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
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

                {/* EMOJI */}

                <button
                  type="button"
                  onClick={() => setShowEmoji((prev) => !prev)}
                  className="shrink-0 text-gray-500 hover:text-yellow-500"
                  aria-label="Emoji"
                >
                  <FiSmile size={18} />
                </button>

                {showEmoji && (
                  <div className="absolute bottom-14 right-8 z-20 grid w-48 grid-cols-6 gap-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg sm:right-16">
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
                          setMessageText((prev) => prev + emoji);
                          setShowEmoji(false);
                        }}
                        className="text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* MIC */}

                <button
                  type="button"
                  onClick={() => setIsRecording((prev) => !prev)}
                  className={`shrink-0 ${
                    isRecording
                      ? "text-red-500"
                      : "text-gray-500 hover:text-red-500"
                  }`}
                  aria-label="Voice message"
                >
                  <FiMic size={18} />
                </button>

                {/* SEND */}

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    !selectedUser || !messageText.trim() || !isConnected
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                  aria-label="Send message"
                >
                  <FiSend size={16} />
                </button>
              </div>
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
