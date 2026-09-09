import { useEffect, useRef, useState } from "react";
import axios from "axios";
import socket from "../../socket";
import { appendUniqueMessage } from "../../utils/chatUtils";

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
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Chat() {
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [selectedChat, setSelectedChat] = useState(0);
  const [messagesByChat, setMessagesByChat] = useState({});

  // =====================================================
  // CURRENT LOGGED-IN USER
  // =====================================================

  const currentUser = JSON.parse(localStorage.getItem("user") || "null");

  const currentUserId = String(currentUser?._id || "");

  // =====================================================
  // FIXED MONGODB USER IDS
  // =====================================================

  const VAISHNAVI_ID = "6a71071b1ef2b200bcfa4180";
  const PRIYA_ID = "6a71de99ac67efe5d9d4ded5";
  const MARCUS_ID = "6a74180d07bce4f712ac0d4c";
  const TOBIAS_ID = "6a74196907bce4f712ac0d4d";

  // =====================================================
  // CONTACT IDS
  // =====================================================

  const priyaReceiverId = currentUserId === PRIYA_ID ? VAISHNAVI_ID : PRIYA_ID;

  const marcusReceiverId =
    currentUserId === MARCUS_ID ? VAISHNAVI_ID : MARCUS_ID;

  const tobiasReceiverId =
    currentUserId === TOBIAS_ID ? VAISHNAVI_ID : TOBIAS_ID;

  console.log("=================================");
  console.log("CURRENT USER ID:", currentUserId);
  console.log("CURRENT USER:", currentUser);
  console.log("PRIYA RECEIVER ID:", priyaReceiverId);
  console.log("MARCUS RECEIVER ID:", marcusReceiverId);
  console.log("TOBIAS RECEIVER ID:", tobiasReceiverId);
  console.log("=================================");

  // =====================================================
  // CHAT LIST
  // =====================================================

  const chats = [
    {
      id: 1,
      name: "Design Guild",
      avatar: "DG",
      online: true,
      members: "12 Members • 5 Online",
      message: "Tobias: uploaded the new spacing scale",
      time: "2m",
      type: "group",
      receiverId: null,
    },

    {
      id: 2,
      name: "Priya Raman",
      avatar: "PR",
      online: true,
      members: "Online",
      message: "Can you review the pricing deck?",
      time: "14m",
      type: "private",
      receiverId: priyaReceiverId,
    },

    {
      id: 3,
      name: "Marcus Vale",
      avatar: "MV",
      online: false,
      members: "Offline",
      message: "Voice message • 0:24",
      time: "1h",
      type: "private",
      receiverId: marcusReceiverId,
    },

    {
      id: 4,
      name: "Engineering",
      avatar: "EN",
      online: true,
      members: "18 Members • 7 Online",
      message: "You: shipped to staging 🎉",
      time: "3h",
      type: "group",
      receiverId: null,
    },

    {
      id: 5,
      name: "Tobias Lund",
      avatar: "TL",
      online: false,
      members: "Offline",
      message: "Thanks — that unblocks me.",
      time: "Yesterday",
      type: "private",
      receiverId: tobiasReceiverId,
    },
  ];

  // =====================================================
  // SELECTED CHAT
  // =====================================================

  const selectedUser = chats[selectedChat];

  // =====================================================
  // PRIVATE CHAT ID
  // =====================================================

  const activeChatId =
    selectedUser?.type === "private" &&
    selectedUser?.receiverId &&
    currentUserId
      ? [currentUserId, String(selectedUser.receiverId)].sort().join("_")
      : String(selectedUser?.id || "");

  console.log("=================================");
  console.log("SELECTED CHAT:", selectedUser);
  console.log("ACTIVE CHAT ID:", activeChatId);
  console.log("=================================");

  // =====================================================
  // CURRENT MESSAGES
  // =====================================================

  const currentMessages = messagesByChat[activeChatId] || [];

  // =====================================================
  // FILTER CHATS
  // =====================================================

  const filteredChats = chats.filter((chat) =>
    chat.name.toLowerCase().includes(searchText.toLowerCase()),
  );

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
    if (!activeChatId) {
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
          `http://localhost:3005/api/messages/${activeChatId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const messages = response.data?.messages || [];

        console.log("CHAT HISTORY:", messages);

        // =================================================
        // IMPORTANT
        //
        // For private messages:
        //
        // receiverId === currentUserId
        // => RECEIVED
        //
        // receiverId !== currentUserId
        // => SENT
        //
        // This is more reliable than checking senderId.
        // =================================================

        const formattedMessages = messages.map((message) => {
          let type = "received";

          if (selectedUser?.type === "private") {
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
            type,
          };
        });

        console.log("FORMATTED HISTORY:", formattedMessages);

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
  }, [activeChatId, currentUserId, selectedUser?.type]);

  // =====================================================
  // JOIN CURRENT CHAT
  // =====================================================

  useEffect(() => {
    if (!isConnected || !selectedUser) {
      return;
    }

    // ===================================================
    // PRIVATE CHAT
    // ===================================================

    if (selectedUser.type === "private" && selectedUser.receiverId) {
      console.log("=================================");
      console.log("JOINING PRIVATE CHAT");
      console.log("CHAT:", selectedUser.name);
      console.log("MY ID:", currentUserId);
      console.log("RECEIVER ID:", selectedUser.receiverId);
      console.log("ROOM:", activeChatId);
      console.log("=================================");

      socket.emit("join_private_chat", String(selectedUser.receiverId));

      return;
    }

    // ===================================================
    // GROUP CHAT
    // ===================================================

    if (selectedUser.type === "group") {
      const groupRoom = `group_${String(selectedUser.id)}`;

      console.log("JOINING GROUP:", groupRoom);

      socket.emit("join_chat", selectedUser.id);
    }
  }, [
    isConnected,
    selectedChat,
    selectedUser?.receiverId,
    selectedUser?.type,
    selectedUser?.id,
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
      console.log("=================================");
      console.log("PRIVATE MESSAGE RECEIVED");
      console.log("MESSAGE:", message);
      console.log("MESSAGE TYPE FROM SERVER:", message?.type);
      console.log("MESSAGE CHAT ID:", message?.chatId);
      console.log("CURRENT CHAT ID:", activeChatId);
      console.log("CURRENT USER:", currentUserId);
      console.log("=================================");

      if (!message?.chatId) {
        return;
      }

      setMessagesByChat((prev) => {
        const existingMessages = prev[message.chatId] || [];

        // =================================================
        // IMPORTANT
        //
        // Backend now explicitly sends:
        //
        // Sender:
        // type = sent
        //
        // Receiver:
        // type = received
        //
        // We trust backend for live messages.
        // =================================================

        const messageType = message.type === "received" ? "received" : "sent";

        const newMessage = {
          ...message,

          _id: message._id ? String(message._id) : undefined,

          senderId: String(message.senderId || ""),

          receiverId: message.receiverId ? String(message.receiverId) : null,

          type: messageType,
        };

        console.log("FINAL MESSAGE TYPE:", newMessage.type);

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
      console.log("RECEIVED GROUP MESSAGE:", message);

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
  // AUTO SCROLL
  // =====================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messagesByChat, selectedChat]);

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

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const localId = `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    console.log("=================================");
    console.log("SEND MESSAGE");
    console.log("FROM:", currentUserId);
    console.log("TO:", selectedUser.receiverId);
    console.log("CHAT ID:", activeChatId);
    console.log("TEXT:", text);
    console.log("=================================");

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
        senderId: currentUserId,
        receiverId: String(selectedUser.receiverId),
        text,
        time,
        type: "sent",
        _id: localId,
      };

      console.log("SENDING PRIVATE MESSAGE:", privateMessage);

      if (socket.connected) {
        socket.emit("send_private_message", privateMessage);
      } else {
        console.log("SOCKET IS NOT CONNECTED - MESSAGE SAVED LOCALLY");
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
        type: "sent",
        _id: localId,
      };

      console.log("SENDING GROUP MESSAGE:", groupMessage);

      if (socket.connected) {
        socket.emit("send_message", groupMessage);
      } else {
        console.log("SOCKET IS NOT CONNECTED - MESSAGE SAVED LOCALLY");
        addMessageToChat(activeChatId, groupMessage);
      }
    }

    setMessageText("");
    setShowEmoji(false);
  };

  // =====================================================
  // FILE
  // =====================================================

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const size = `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const fileMessage = {
      _id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type: "file",
      file: file.name,
      size,
      text: file.name,
      time,
      senderId: currentUserId,
      receiverId:
        selectedUser?.type === "private" ? selectedUser.receiverId : null,
    };

    if (selectedUser?.type === "private") {
      fileMessage.chatId = activeChatId;
      fileMessage.receiverId = String(selectedUser.receiverId);
      fileMessage.type = "file";
    } else {
      fileMessage.chatId = selectedUser?.id;
      fileMessage.type = "file";
    }

    addMessageToChat(activeChatId, fileMessage);

    console.log("Selected file:", file.name, size);

    event.target.value = "";
  };

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
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search conversations..."
                  className="ml-3 min-w-0 flex-1 bg-transparent text-xs outline-none"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {filteredChats.map((chat) => {
                const index = chats.findIndex((item) => item.id === chat.id);

                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChat(index)}
                    className={`cursor-pointer border-b border-gray-100 px-4 py-3 transition ${
                      selectedChat === index
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
                          {chat.message}
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
            <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-gray-200 px-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                    {selectedUser.avatar}
                  </div>

                  {selectedUser.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                  )}
                </div>

                <div>
                  <h2 className="text-[13px] font-semibold text-gray-900">
                    {selectedUser.name}
                  </h2>

                  <p className="text-[9px] text-green-600">
                    {selectedUser.members}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button className="hover:text-blue-600">
                  <FiPhone />
                </button>

                <button className="hover:text-blue-600">
                  <FiVideo />
                </button>

                <button className="hover:text-blue-600">
                  <FiMoreVertical />
                </button>
              </div>
            </div>

            {/* ================================================= */}
            {/* MESSAGES */}
            {/* ================================================= */}

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FC] px-7 py-5">
              <div className="mb-7 text-center text-[10px] text-gray-400">
                Today
              </div>

              {currentMessages.map((msg, index) => {
                // =================================================
                // RECEIVED
                // =================================================

                if (msg.type === "received") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="mb-4 flex"
                    >
                      <div className="max-w-[400px] rounded-xl rounded-tl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[12px] leading-5">{msg.text}</p>

                        <p className="mt-2 text-[9px] text-gray-400">
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  );
                }

                // =================================================
                // SENT
                // =================================================

                if (msg.type === "sent") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="mb-4 flex justify-end"
                    >
                      <div className="max-w-[400px] rounded-xl rounded-br-md bg-blue-600 px-4 py-3 text-white">
                        <p className="text-[12px] leading-5">{msg.text}</p>

                        <p className="mt-2 text-[9px] text-blue-100">
                          {msg.time}
                        </p>
                      </div>
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
                      className="mb-4 flex"
                    >
                      <div className="flex w-[250px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
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
                    </div>
                  );
                }

                // =================================================
                // FILE
                // =================================================

                if (msg.type === "file") {
                  return (
                    <div
                      key={`${msg._id || index}-${msg.time}`}
                      className="mb-4 flex"
                    >
                      <div className="flex w-[270px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                          <FiFileText className="text-blue-600" />
                        </div>

                        <div className="min-w-0">
                          <h4 className="truncate text-[11px] font-medium">
                            {msg.file}
                          </h4>

                          <p className="text-[10px] text-gray-500">
                            {msg.size}
                          </p>
                        </div>
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

            <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3">
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
                  className="hidden"
                  onChange={handleFileChange}
                />

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
                  placeholder={`Message ${selectedUser.name}...`}
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
                  disabled={!messageText.trim() || !isConnected}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <FiSend size={16} />
                </button>
              </div>
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

            <div className="p-4">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Images
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="aspect-square rounded-xl bg-[#E5E7EB]"
                  />
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <h3 className="mb-3 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                Videos
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map((item) => (
                  <div
                    key={item}
                    className="flex aspect-square items-center justify-center rounded-xl bg-[#E5E7EB]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
                      <FiPlay className="text-gray-500" size={12} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4">
              <h3 className="mb-3 text-[12px] font-semibold">Recent Files</h3>

              {[
                {
                  name: "Brand-guidelines-v4.pdf",
                  size: "2.8 MB",
                },
                {
                  name: "Homepage-final.fig",
                  size: "5.1 MB",
                },
                {
                  name: "Marketing-plan.docx",
                  size: "1.2 MB",
                },
              ].map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-gray-200 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <FiFileText className="text-blue-600" size={15} />
                  </div>

                  <div className="min-w-0">
                    <h4 className="truncate text-[10px] font-medium">
                      {file.name}
                    </h4>

                    <p className="text-[9px] text-gray-500">{file.size}</p>
                  </div>
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
