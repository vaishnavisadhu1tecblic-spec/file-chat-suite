import { useState, useEffect, useRef } from "react";

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
  const [selectedChat, setSelectedChat] = useState(0);
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef(null);

  const chats = [
    {
      id: 1,
      name: "Design Guild",
      avatar: "DG",
      online: true,
      message: "Tobias: uploaded the new spacing scale",
      time: "2m",
    },

    {
      id: 2,
      name: "Priya Raman",
      avatar: "PR",
      online: true,
      message: "Can you review the pricing deck?",
      time: "14m",
    },

    {
      id: 3,
      name: "Marcus Vale",
      avatar: "MV",
      online: false,
      message: "Voice message • 0:24",
      time: "1h",
    },

    {
      id: 4,
      name: "Engineering",
      avatar: "EN",
      online: true,
      message: "You: shipped to staging 🎉",
      time: "3h",
    },

    {
      id: 5,
      name: "Tobias Lund",
      avatar: "TL",
      online: false,
      message: "Thanks — that unblocks me.",
      time: "Yesterday",
    },
  ];

  const [messages, setMessages] = useState([
    {
      type: "received",
      text: "Morning! I pushed the new spacing scale to the design file—everything snaps now.",
      time: "09:12",
    },

    {
      type: "sent",
      text: "Beautiful. That fixes the card alignment issue.",
      time: "09:15",
    },

    {
      type: "voice",
      duration: "0:24",
      time: "09:18",
    },
    {
      type: "file",
      file: "Brand-guidelines-v4.pdf",
      size: "2.8 MB",
      time: "09:20",
    },

    {
      type: "sent",
      text: "Reviewing now — I'll leave comments before standup.",
      time: "09:30",
    },
  ]);

  const sendMessage = () => {
    const text = messageText.trim();

    if (!text) return;

    const newMessage = {
      type: "sent",
      text: text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageText("");
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  return (
    <div className="flex h-screen bg-[#F7F8FC] overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <div className="flex flex-1 overflow-hidden">
          {/* Left Chat List */}
          <div className="w-[220px] shrink-0 bg-white border-r border-gray-200 flex flex-col">
            {" "}
            {/* Search */}
            <div className="p-4 border-b">
              <div className="flex items-center bg-[#F5F7FB] rounded-lg px-3 py-2.5">
                {" "}
                <FiSearch className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  className="bg-transparent flex-1 ml-2 outline-none text-[12px]"
                />
              </div>
            </div>
            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
              {chats.map((chat, index) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(index)}
                  className={`cursor-pointer px-3 py-3 border-b border-gray-100 transition
                  ${
                    selectedChat === index
                      ? "bg-blue-50 border-l-4 border-blue-600"
                      : "hover:bg-gray-50"
                  }

                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-xs">
                        {" "}
                        {chat.avatar}
                      </div>

                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <h3 className="font-semibold text-[12px] truncate">
                          {chat.name}
                        </h3>

                        <span className="text-[9px] text-gray-400 ml-2">
                          {" "}
                          {chat.time}
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-500 truncate mt-1">
                        {" "}
                        {chat.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ================= CHAT AREA ================= */}

          <div className="flex-1 flex flex-col bg-white">
            {/* Header */}

            <div className="h-[54px] shrink-0 border-b border-gray-200 flex items-center justify-between px-4">
              {" "}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700 text-[11px]">
                    {" "}
                    DG
                  </div>

                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></span>
                </div>

                <div>
                  <h2 className="font-semibold text-[13px]">Design Guild</h2>
                  <p className="text-[9px] text-green-600">
                    {" "}
                    12 Members • 5 Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {" "}
                <FiPhone className="cursor-pointer hover:text-blue-600" />
                <FiVideo className="cursor-pointer hover:text-blue-600" />
                <FiMoreVertical className="cursor-pointer hover:text-blue-600" />
              </div>
            </div>

            {/* Messages */}

            <div
              ref={messagesEndRef}
              className="flex-1 min-h-0 overflow-y-auto bg-[#F7F8FC] px-5 py-5"
            >
              {" "}
              <div className="text-center text-xs text-gray-400 mb-8">
                Today
              </div>
              {messages.map((msg, index) => {
                if (msg.type === "received") {
                  return (
                    <div key={index} className="flex mb-4">
                      <div className="max-w-[380px] bg-white rounded-xl rounded-tl-md border border-gray-200 px-4 py-3">
                        {" "}
                        <p className="text-[15px] leading-7">{msg.text}</p>
                        <p className="text-xs text-gray-400 mt-2">{msg.time}</p>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "sent") {
                  return (
                    <div key={index} className="flex justify-end mb-4">
                      <div className="max-w-[380px] bg-blue-600 text-white rounded-xl rounded-br-md px-4 py-3">
                        {" "}
                        <p className="text-[11px] leading-7">{msg.text}</p>
                        <p className="text-xs text-blue-100 mt-2">{msg.time}</p>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "voice") {
                  return (
                    <div key={index} className="flex mb-6">
                      <div className="bg-white rounded-2xl shadow-sm px-5 py-4 w-[330px]">
                        <div className="flex items-center gap-4">
                          <button className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <FiPlay />
                          </button>

                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-gray-200"></div>
                          </div>

                          <span className="text-sm text-gray-500">
                            {msg.duration}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (msg.type === "file") {
                  return (
                    <div key={index} className="flex mb-6">
                      <div className="bg-white rounded-2xl shadow-sm p-5 w-[360px]">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FiFileText className="text-blue-600 text-xl" />
                          </div>

                          <div>
                            <h4 className="font-medium">{msg.file}</h4>

                            <p className="text-sm text-gray-500">{msg.size}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
            {/* Message Input */}

            <div className="border-t bg-white px-5 py-3">
              <div className="flex items-center gap-2 bg-[#F5F7FB] border border-gray-100 rounded-xl px-3 py-2">
                {" "}
                <button className="text-gray-500 hover:text-blue-600">
                  <FiPaperclip size={20} />
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      sendMessage();
                    }
                  }}
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent outline-none text-[13px]"
                />
                <button className="text-gray-500 hover:text-yellow-500">
                  <FiSmile size={20} />
                </button>
                <button className="text-gray-500 hover:text-red-500">
                  <FiMic size={20} />
                </button>
                <button
                  onClick={sendMessage}
                  className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition"
                >
                  <FiSend />
                </button>
              </div>
            </div>
          </div>

          {/* ================= RIGHT SIDEBAR ================= */}

          <div className="w-[210px] shrink-0 bg-white border-l border-gray-200">
            {" "}
            <div className="p-4 border-b">
              <h2 className="font-semibold text-[13px]">Shared Media</h2>

              <p className="text-[9px] text-gray-500 mt-1 leading-4">
                {" "}
                Files and photos shared in this conversation.
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="aspect-square rounded-xl bg-gray-200"
                  />
                ))}
              </div>
            </div>
            <div className="px-6">
              <h3 className="font-semibold mb-4">Recent Files</h3>

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
                  className="flex items-center gap-4 py-4 border-b last:border-none"
                >
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                    <FiFileText className="text-blue-600" />
                  </div>

                  <div>
                    <h4 className="font-medium text-sm">{file.name}</h4>

                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
