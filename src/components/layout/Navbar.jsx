import { FiBell, FiSearch } from "react-icons/fi";
import useAuth from "../../hooks/useAuth";

function Navbar() {
  const { user } = useAuth();
  const avatarLetter = (user?.name || user?.username || "U")
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8">
      {/* Search */}

      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />

        <input
          type="text"
          placeholder="Search files, people..."
          className="w-[420px] h-11 bg-gray-50 rounded-xl pl-11 pr-4 text-sm border border-gray-200 outline-none"
        />
      </div>

      {/* Right */}

      <div className="flex items-center gap-5">
        <button className="relative">
          <FiBell className="text-2xl text-gray-500" />

          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
        </button>

        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
          {avatarLetter}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
