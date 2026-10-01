import { FiBell, FiMenu, FiSearch } from "react-icons/fi";
import useAuth from "../../hooks/useAuth";
import Avatar from "../common/Avatar";

function Navbar() {
  const { user } = useAuth();

  const handleMenuClick = () => {
    window.dispatchEvent(new Event("syncspace:toggle-sidebar"));
  };

  return (
    <header className="flex h-16 sm:h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-3 sm:px-6 lg:px-8">
      {/* =====================================================
          LEFT
      ===================================================== */}

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {/* Mobile Menu Button */}

        <button
          type="button"
          aria-label="Open sidebar"
          className="flex shrink-0 items-center justify-center text-gray-600 hover:text-blue-600 md:hidden"
          onClick={handleMenuClick}
        >
          <FiMenu size={20} className="sm:text-[22px]" />
        </button>

        {/* Search */}

        <div className="relative min-w-0 flex-1 md:flex-none">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:left-4" size={16} />

          <input
            type="text"
            placeholder="Search files, people..."
            className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-xs outline-none sm:h-11 sm:pl-11 sm:pr-4 sm:text-sm md:w-[420px]"
          />
        </div>
      </div>

      {/* =====================================================
          RIGHT
      ===================================================== */}

      <div className="ml-2 flex shrink-0 items-center gap-2.5 sm:ml-3 sm:gap-5">
        <button className="relative" aria-label="Notifications">
          <FiBell className="text-lg text-gray-500 sm:text-2xl" />

          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
        </button>

        <Avatar user={user} size="sm" previewable />
      </div>
    </header>
  );
}

export default Navbar;
