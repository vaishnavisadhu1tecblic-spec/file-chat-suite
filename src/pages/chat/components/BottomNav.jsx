import {
  FiMessageSquare,
  FiUsers,
  FiCircle,
  FiPhoneCall,
} from "react-icons/fi";

export default function BottomNav({
  activeTab = "chat",
  onSelectTab,
  unreadChatCount = 0,
  unreadGroupCount = 0,
  unseenStatusCount = 0,
  missedCallCount = 0,
}) {
  const tabs = [
    {
      id: "chat",
      label: "Chat",
      icon: <FiMessageSquare size={18} />,
      badge: unreadChatCount,
    },
    {
      id: "groups",
      label: "Groups",
      icon: <FiUsers size={18} />,
      badge: unreadGroupCount,
    },
    {
      id: "status",
      label: "Status",
      icon: <FiCircle size={18} />,
      badge: unseenStatusCount,
    },
    {
      id: "calls",
      label: "Calls",
      icon: <FiPhoneCall size={18} />,
      badge: missedCallCount,
    },
  ];

  return (
    <nav
      aria-label="Chat Navigation"
      className="sticky bottom-0 z-30 flex h-14 w-full shrink-0 items-center justify-around border-t border-gray-200 bg-white/95 px-2 backdrop-blur-xs select-none"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`relative flex flex-1 flex-col items-center justify-center py-1 transition ${
              isActive
                ? "font-semibold text-blue-600"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <div className="relative">
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition ${
                  isActive ? "bg-blue-50" : "bg-transparent"
                }`}
              >
                {tab.icon}
              </div>

              {tab.badge > 0 && (
                <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-xs">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </div>

            <span className="mt-0.5 text-[10px] leading-tight">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
