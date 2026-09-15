import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiMessageSquare,
  FiFolder,
  FiUser,
  FiSettings,
  FiLogOut,
} from "react-icons/fi";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarZoom, setSidebarZoom] = useState(1);

  useEffect(() => {
    const initialDevicePixelRatio = window.devicePixelRatio || 1;

    const updateSidebarZoom = () => {
      const currentDevicePixelRatio = window.devicePixelRatio || 1;
      const zoomRatio = currentDevicePixelRatio / initialDevicePixelRatio;

      setSidebarZoom(Math.max(0.6, Math.min(1, 1 / zoomRatio)));
    };

    window.addEventListener("resize", updateSidebarZoom);

    return () => {
      window.removeEventListener("resize", updateSidebarZoom);
    };
  }, []);

  const menus = [
    { name: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
    { name: "Chat", icon: <FiMessageSquare />, path: "/chat" },
    { name: "Files", icon: <FiFolder />, path: "/files" },
    { name: "Profile", icon: <FiUser />, path: "/profile" },
    { name: "Settings", icon: <FiSettings />, path: "/settings" },
  ];

  return (
    <div
      className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col justify-between"
      style={{ zoom: sidebarZoom }}
    >
      <div>
        {/* Logo */}

        <div className="px-8 py-8 flex items-center gap-3">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
            S
          </div>

          <h1 className="text-2xl font-bold text-black-600">SyncSpace</h1>
        </div>

        {/* Menu */}

        <div className="px-4 space-y-2">
          {menus.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition
              ${
                location.pathname === item.path
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                {item.icon}
              </span>

              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom */}

      <div className="p-4">
        <div className="bg-gray-50 rounded-2xl p-4">
          <div className="flex justify-between text-xs mb-2">
            <span>Storage</span>

            <span>42.6 / 100 GB</span>
          </div>

          <div className="w-full h-2 rounded-full bg-gray-200">
            <div className="w-[43%] h-2 rounded-full bg-blue-600"></div>
          </div>
        </div>

        <button
          className="flex items-center gap-2 mt-6 text-gray-600 hover:text-red-500"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/");
          }}
        >
          <FiLogOut />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
