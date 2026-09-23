import { FiBell, FiMenu, FiSearch } from "react-icons/fi";
import useAuth from "../../hooks/useAuth";
import Avatar from "../common/Avatar";

function Navbar() {
  const { user } = useAuth();

  const handleMenuClick = () => {
    window.dispatchEvent(new Event("syncspace:toggle-sidebar"));
  };

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 sm:px-6 lg:px-8">
      {/* =====================================================
          LEFT
      ===================================================== */}

      <div className="flex min-w-0 flex-1 items-center gap-3">
        {/* Mobile Menu Button */}

        <button
          type="button"
          aria-label="Open sidebar"
          className="flex shrink-0 items-center justify-center text-gray-600 hover:text-blue-600 md:hidden"
          onClick={handleMenuClick}
        >
          <FiMenu size={22} />
        </button>

        {/* Search */}

        <div className="relative min-w-0 flex-1 md:flex-none">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

          <input
            type="text"
            placeholder="Search files, people..."
            className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 text-sm outline-none md:w-[420px]"
          />
        </div>
      </div>

      {/* =====================================================
          RIGHT
      ===================================================== */}

      <div className="ml-3 flex shrink-0 items-center gap-3 sm:gap-5">
        <button className="relative" aria-label="Notifications">
          <FiBell className="text-xl text-gray-500 sm:text-2xl" />

          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500"></span>
        </button>

        <Avatar user={user} size="sm" previewable />
      </div>
    </header>
  );
}

export default Navbar;
