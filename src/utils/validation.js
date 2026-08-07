// import { useState } from "react";

// import {
//   FiSearch,
//   FiPhone,
//   FiVideo,
//   FiMoreVertical,
//   FiPaperclip,
//   FiSmile,
//   FiMic,
//   FiSend,
//   FiFileText,
//   FiPlay,
// } from "react-icons/fi";

// import Sidebar from "../../components/layout/Sidebar";
// import Navbar from "../../components/layout/Navbar";

// function Chat() {
//   const [selectedChat, setSelectedChat] = useState(0);

//   const chats = [
//     {
//       id: 1,
//       name: "Design Guild",
//       avatar: "DG",
//       color: "bg-gray-100",
//       online: true,
//       message: "Tobias: uploaded the new spacing scale",
//       time: "2m",
//     },

//     {
//       id: 2,
//       name: "Priya Raman",
//       avatar: "PR",
//       color: "bg-gray-100",
//       online: true,
//       message: "Can you review the pricing deck?",
//       time: "14m",
//     },

//     {
//       id: 3,
//       name: "Marcus Vale",
//       avatar: "MV",
//       color: "bg-gray-100",
//       online: false,
//       message: "Voice message • 0:24",
//       time: "1h",
//     },

//     {
//       id: 4,
//       name: "Engineering",
//       avatar: "EN",
//       color: "bg-gray-100",
//       online: true,
//       message: "You: shipped to staging 🎉",
//       time: "3h",
//     },

//     {
//       id: 5,
//       name: "Tobias Lund",
//       avatar: "TL",
//       color: "bg-gray-100",
//       online: false,
//       message: "Thanks — that unblocks me.",
//       time: "Yesterday",
//     },
//   ];

//   const messages = [
//     {
//       type: "received",
//       text: "Morning! I pushed the new spacing scale to the design file—get base, everything snaps now.",
//       time: "09:12",
//     },

//     {
//       type: "sent",
//       text: "Beautiful. That fixes the card alignment issue we kept hitting.",
//       time: "09:15",
//     },

//     {
//       type: "voice",
//       duration: "0:24",
//       time: "09:18",
//     },

//     {
//       type: "file",
//       file: "Brand-guidelines-v4.pdf",
//       size: "2.8 MB",
//       time: "09:20",
//     },

//     {
//       type: "sent",
//       text: "Reviewing now — I'll leave comments before standup.",
//       time: "09:30",
//     },
//   ];

//   return (
//     <div className="flex h-screen overflow-hidden bg-[#F7F8FC]">
//       <Sidebar />

//       <div className="flex-1 flex flex-col">
//         <Navbar />

//         <div className="flex flex-1 overflow-hidden">
//           {/* LEFT CHAT LIST */}

//           <div className="w-[340px] bg-white border-r border-gray-200 flex flex-col">
//             {/* Search */}

//             <div className="p-5 border-b">
//               <div className="flex items-center bg-[#F5F7FB] rounded-xl px-4 py-3">
//                 <FiSearch className="text-gray-400 text-lg" />

//                 <input
//                   type="text"
//                   placeholder="Search conversations..."
//                   className="bg-transparent ml-3 flex-1 outline-none text-sm"
//                 />
//               </div>
//             </div>

//             {/* Chat List */}

//             <div className="flex-1 overflow-y-auto">
//               {chats.map((chat, index) => (
//                 <div
//                   key={chat.id}
//                   onClick={() => setSelectedChat(index)}
//                   className={`
//                       cursor-pointer px-5 py-4 border-b
//                       hover:bg-gray-50 transition
//                       ${
//                         selectedChat === index
//                           ? "bg-blue-50 border-l-4 border-blue-600"
//                           : ""
//                       }
//                     `}
//                 >
//                   <div className="flex items-center gap-4">
//                     {/* Avatar */}

//                     <div className="relative">
//                       <div
//                         className={`
//                             w-12 h-12 rounded-full
//                             ${chat.color}
//                             flex items-center justify-center
//                             font-semibold
//                           `}
//                       >
//                         {chat.avatar}
//                       </div>

//                       {chat.online && (
//                         <div
//                           className="
//                               absolute bottom-0 right-0
//                               w-3 h-3 rounded-full
//                               bg-green-500
//                               border-2 border-white
//                               "
//                         ></div>
//                       )}
//                     </div>

//                     {/* Text */}

//                     <div className="flex-1 min-w-0">
//                       <div className="flex justify-between">
//                         <h3 className="font-semibold text-[15px] truncate">
//                           {chat.name}
//                         </h3>

//                         <span className="text-xs text-gray-400">
//                           {chat.time}
//                         </span>
//                       </div>

//                       <p className="text-sm text-gray-500 truncate mt-1">
//                         {chat.message}
//                       </p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           {/* Chat Area */}

//           <div className="flex-1 flex flex-col bg-white">
//             {/* Chat Header */}

//             <div className="h-20 border-b flex items-center justify-between px-8">
//               <div className="flex items-center gap-4">
//                 <div className="relative">
//                   <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-semibold">
//                     DG
//                   </div>

//                   <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
//                 </div>

//                 <div>
//                   <h2 className="font-semibold text-lg">Design Guild</h2>

//                   <p className="text-sm text-green-600">
//                     12 members • 5 online
//                   </p>
//                 </div>
//               </div>

//               <div className="flex items-center gap-5 text-xl text-gray-500">
//                 <FiPhone className="cursor-pointer hover:text-blue-600" />

//                 <FiVideo className="cursor-pointer hover:text-blue-600" />

//                 <FiMoreVertical className="cursor-pointer hover:text-blue-600" />
//               </div>
//             </div>
//             {/* Messages */}

//             <div className="flex-1 overflow-y-auto px-8 py-6 bg-[#F7F8FC]">
//               <div className="text-center text-xs text-gray-400 mb-8">
//                 Today
//               </div>

//               {messages.map((msg, index) => {
//                 if (msg.type === "received") {
//                   return (
//                     <div key={index} className="flex mb-6">
//                       <div className="max-w-[420px] bg-white rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
//                         <p className="text-[15px] leading-7">{msg.text}</p>

//                         <p className="text-xs text-gray-400 mt-2">{msg.time}</p>
//                       </div>
//                     </div>
//                   );
//                 }

//                 if (msg.type === "sent") {
//                   return (
//                     <div key={index} className="flex justify-end mb-6">
//                       <div className="max-w-[420px] bg-blue-600 text-white rounded-2xl rounded-br-md px-5 py-4">
//                         <p className="text-[15px] leading-7">{msg.text}</p>

//                         <p className="text-xs text-blue-100 mt-2">{msg.time}</p>
//                       </div>
//                     </div>
//                   );
//                 }

//                 if (msg.type === "voice") {
//                   return (
//                     <div key={index} className="flex mb-6">
//                       <div className="bg-white rounded-2xl px-5 py-4 shadow-sm w-[330px]">
//                         <div className="flex items-center gap-4">
//                           <button className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
//                             <FiPlay />
//                           </button>

//                           <div className="flex-1">
//                             <div className="h-2 rounded-full bg-gray-200"></div>
//                           </div>

//                           <span className="text-sm text-gray-500">
//                             {msg.duration}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 }

//                 if (msg.type === "file") {
//                   return (
//                     <div key={index} className="flex mb-6">
//                       <div className="bg-white rounded-2xl shadow-sm p-5 w-[360px]">
//                         <div className="flex items-center gap-4">
//                           <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
//                             <FiFileText className="text-blue-600 text-xl" />
//                           </div>

//                           <div>
//                             <h4 className="font-medium">{msg.file}</h4>

//                             <p className="text-sm text-gray-500">{msg.size}</p>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 }

//                 return null;
//               })}
//             </div>
//             {/* Message Input */}

//             <div className="border-t bg-white px-8 py-5">
//               <div className="flex items-center gap-3 bg-[#F5F7FB] rounded-2xl px-5 py-3">
//                 <button className="text-gray-500 hover:text-blue-600">
//                   <FiPaperclip size={20} />
//                 </button>

//                 <input
//                   type="text"
//                   placeholder="Write a message..."
//                   className="flex-1 bg-transparent outline-none text-[15px]"
//                 />

//                 <button className="text-gray-500 hover:text-yellow-500">
//                   <FiSmile size={20} />
//                 </button>

//                 <button className="text-gray-500 hover:text-red-500">
//                   <FiMic size={20} />
//                 </button>

//                 <button className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700">
//                   <FiSend />
//                 </button>
//               </div>
//             </div>
//           </div>

//           {/* Right Sidebar */}

//           <div className="w-[320px] bg-white border-l border-gray-200">
//             <div className="p-6 border-b">
//               <h2 className="font-semibold text-lg">Shared Media</h2>

//               <p className="text-sm text-gray-500 mt-1">
//                 Files and photos shared in this conversation.
//               </p>
//             </div>

//             <div className="p-6">
//               <div className="grid grid-cols-2 gap-3">
//                 {[1, 2, 3, 4, 5, 6].map((item) => (
//                   <div
//                     key={item}
//                     className="aspect-square rounded-2xl bg-gray-200"
//                   />
//                 ))}
//               </div>
//             </div>

//             <div className="px-6">
//               <h3 className="font-semibold mb-4">Recent Files</h3>

//               {[
//                 {
//                   name: "Brand-guidelines-v4.pdf",
//                   size: "2.8 MB",
//                 },
//                 {
//                   name: "Homepage-final.fig",
//                   size: "5.1 MB",
//                 },
//                 {
//                   name: "Marketing-plan.docx",
//                   size: "1.2 MB",
//                 },
//               ].map((file, index) => (
//                 <div
//                   key={index}
//                   className="flex items-center gap-4 py-4 border-b last:border-none"
//                 >
//                   <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
//                     <FiFileText className="text-blue-600" />
//                   </div>

//                   <div>
//                     <h4 className="font-medium text-sm">{file.name}</h4>

//                     <p className="text-xs text-gray-500">{file.size}</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Chat;
