import {
  FiUploadCloud,
  FiMessageSquare,
  FiHardDrive,
  FiShare2,
  FiFileText,
  FiClock,
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Dashboard() {
  const uploads = [
    {
      name: "Brand-guidelines-v4.pdf",
      owner: "Alina Meyer",
      size: "8.2 MB",
      date: "Jul 28, 2026",
    },
    {
      name: "Onboarding-walkthrough.mp4",
      owner: "Tobias Lund",
      size: "146 MB",
      date: "Jul 27, 2026",
    },
    {
      name: "Homepage-hero-final.png",
      owner: "Alina Meyer",
      size: "3.4 MB",
      date: "Jul 27, 2026",
    },
    {
      name: "Standup-recap.m4a",
      owner: "Priya Raman",
      size: "12.1 MB",
      date: "Jul 26, 2026",
    },
    {
      name: "Q3-roadmap.docx",
      owner: "Marcus Vale",
      size: "820 KB",
      date: "Jul 25, 2026",
    },
  ];
  const chats = [
    {
      name: "Design Guild",
      message: "Tobias: uploaded the new spacing scale",
      time: "2m",
      avatar: "DG",
      online: true,
    },
    {
      name: "Priya Raman",
      message: "Can you review the pricing deck?",
      time: "14m",
      avatar: "PR",
      online: true,
    },
    {
      name: "Marcus Vale",
      message: "Voice message • 0:24",
      time: "1h",
      avatar: "MV",
      online: false,
    },
    {
      name: "Engineering",
      message: "You: shipped to staging 🎉",
      time: "3h",
      avatar: "EN",
      online: true,
    },
    {
      name: "Tobias Lund",
      message: "Thanks — that unblocks me.",
      time: "Yesterday",
      avatar: "TL",
      online: false,
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight">
                Dashboard
              </h1>

              <p className="text-gray-500 mt-2">
                Here's what's moving in your workspace today.
              </p>
            </div>

            {/* <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition">
              + Upload File
            </button> */}
          </div>

          {/* Cards */}

          <div className="grid grid-cols-4 gap-8 mb-8">
            <Card
              title="Files Uploaded"
              value="1,284"
              subtitle="+38 this week"
              icon={<FiUploadCloud />}
            />

            <Card
              title="Messages"
              value="9,412"
              subtitle="+512 this week"
              icon={<FiMessageSquare />}
            />

            <Card
              title="Storage Used"
              value="42.6 GB"
              subtitle="43% of 100 GB"
              icon={<FiHardDrive />}
            />

            <Card
              title="Shared Files"
              value="376"
              subtitle="24 shared externally"
              icon={<FiShare2 />}
            />
          </div>

          {/* Bottom */}

          <div className="grid grid-cols-2 gap-8">
            {/* Uploads */}
            <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition">
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <h2 className="font-semibold text-lg">Recent Uploads</h2>

                <button className="text-sm text-gray-700 flex items-center gap-1">
                  View all ↗
                </button>
              </div>

              {uploads.map((file, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center px-6 py-4 border-b border-gray-100 last:border-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <FiFileText size={18} className="text-gray-500" />
                    </div>

                    <div>
                      <h3 className="font-medium text-[15px]">{file.name}</h3>

                      <p className="text-sm text-gray-500">
                        {file.owner} · {file.size}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm text-gray-400">{file.date}</span>
                </div>
              ))}
            </div>

            {/* Chats */}

            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100">
                <h2 className="font-semibold text-lg">Recent Chats</h2>

                <button className="text-sm text-gray-700">Open ↗</button>
              </div>

              {chats.map((chat, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center px-6 py-4 border-b border-gray-100 last:border-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {chat.avatar}
                      </div>

                      {chat.online && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    <div>
                      <h3 className="font-medium text-[15px]">{chat.name}</h3>

                      <p className="text-sm text-gray-500">{chat.message}</p>
                    </div>
                  </div>

                  <span className="text-sm text-gray-400">{chat.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, subtitle, icon }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <h2 className="text-3xl font-bold mt-2">{value}</h2>

          <p className="text-sm text-gray-400 mt-3">{subtitle}</p>
        </div>

        <div className="w-10 h-10 rounded-xl bg-[#EEF4FF] flex items-center justify-center text-blue-600 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
