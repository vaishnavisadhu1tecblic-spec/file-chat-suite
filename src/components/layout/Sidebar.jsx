import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiGrid,
  FiMessageSquare,
  FiFolder,
  FiUser,
  FiSettings,
  FiLogOut,
  FiX,
} from "react-icons/fi";
import api from "../../api/interceptors";
import { disconnectSocketSession } from "../../socket";

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState("0 KB");
  const [storageQuota, setStorageQuota] = useState("100 GB");
  const [storagePercent, setStoragePercent] = useState(0);

  const menus = [
    { name: "Dashboard", icon: <FiGrid />, path: "/dashboard" },
    { name: "Chat", icon: <FiMessageSquare />, path: "/chat" },
    { name: "Files", icon: <FiFolder />, path: "/files" },
    { name: "Profile", icon: <FiUser />, path: "/profile" },
    { name: "Settings", icon: <FiSettings />, path: "/settings" },
  ];

  // =====================================================
  // MOBILE SIDEBAR EVENTS
  // =====================================================

  useEffect(() => {
    const toggleSidebar = () => {
      setMobileOpen((previous) => !previous);
    };

    const closeSidebar = () => {
      setMobileOpen(false);
    };

    window.addEventListener("syncspace:toggle-sidebar", toggleSidebar);
    window.addEventListener("syncspace:close-sidebar", closeSidebar);

    return () => {
      window.removeEventListener("syncspace:toggle-sidebar", toggleSidebar);
      window.removeEventListener("syncspace:close-sidebar", closeSidebar);
    };
  }, []);

  // Close mobile drawer whenever route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const loadStorageUsage = useCallback(async () => {
    try {
      const response = await api.get("/dashboard");
      const dashboard = response.data?.dashboard || {};

      setStorageUsed(dashboard.storageUsed || "0 KB");
      setStorageQuota(dashboard.storageQuota || "100 GB");
      setStoragePercent(Number(dashboard.storagePercent) || 0);
    } catch (error) {
      console.error("Sidebar storage load failed:", error);
      setStorageUsed("0 KB");
      setStoragePercent(0);
    }
  }, []);

  useEffect(() => {
    loadStorageUsage();

    window.addEventListener("syncspace:files-updated", loadStorageUsage);
    window.addEventListener("syncspace:chat-updated", loadStorageUsage);

    return () => {
      window.removeEventListener("syncspace:files-updated", loadStorageUsage);
      window.removeEventListener("syncspace:chat-updated", loadStorageUsage);
    };
  }, [loadStorageUsage]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocketSession();

    setMobileOpen(false);

    navigate("/");
  };

  const handleMenuClick = () => {
    setMobileOpen(false);
  };

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-gray-200 bg-white md:flex">
        <div>
          {/* Logo */}

          <div className="flex items-center gap-3 px-8 py-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
              S
            </div>

            <h1 className="text-2xl font-bold text-black-600">SyncSpace</h1>
          </div>

          {/* Menu */}

          <div className="space-y-2 px-4">
            {menus.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  location.pathname === item.path
                    ? "bg-blue-50 font-semibold text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}

                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom */}

        <div className="p-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-2 flex justify-between text-xs">
              <span>Storage</span>

              <span>
                {storageUsed} / {storageQuota}
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, Math.max(0, storagePercent))}%` }}
              ></div>
            </div>
          </div>

          <button
            className="mt-6 flex items-center gap-2 text-gray-600 hover:text-red-500"
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* =====================================================
          MOBILE SIDEBAR
      ===================================================== */}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-[100dvh] w-64 flex-col justify-between border-r border-gray-200 bg-white shadow-xl transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          {/* Mobile Logo */}

          <div className="flex items-center justify-between px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 font-bold text-white">
                S
              </div>

              <h1 className="text-2xl font-bold text-black-600">SyncSpace</h1>
            </div>

            <button
              type="button"
              aria-label="Close sidebar"
              className="text-gray-500 hover:text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              <FiX size={21} />
            </button>
          </div>

          {/* Mobile Menu */}

          <div className="space-y-2 px-4">
            {menus.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={handleMenuClick}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  location.pathname === item.path
                    ? "bg-blue-50 font-semibold text-blue-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {item.icon}

                {item.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile Bottom */}

        <div className="p-4">
          <div className="rounded-2xl bg-gray-50 p-4">
            <div className="mb-2 flex justify-between text-xs">
              <span>Storage</span>

              <span>
                {storageUsed} / {storageQuota}
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${Math.min(100, Math.max(0, storagePercent))}%` }}
              ></div>
            </div>
          </div>

          <button
            className="mt-6 flex items-center gap-2 text-gray-600 hover:text-red-500"
            onClick={handleLogout}
          >
            <FiLogOut />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
