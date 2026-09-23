import { useState } from "react";
import { FiX } from "react-icons/fi";

const getInitials = (name = "") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";

  return parts[0][0]?.toUpperCase() || "U";
};

const getDeterministicColor = (text = "") => {
  const colors = [
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-purple-100", text: "text-purple-700" },
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
    { bg: "bg-teal-100", text: "text-teal-700" },
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const resolveAvatarUrl = (userOrImage, userId) => {
  if (!userOrImage) return null;

  if (typeof userOrImage === "string") {
    if (
      userOrImage.startsWith("http://") ||
      userOrImage.startsWith("https://") ||
      userOrImage.startsWith("data:") ||
      userOrImage.startsWith("blob:")
    ) {
      return userOrImage;
    }
    if (userId) {
      const baseUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3005/api";
      return `${baseUrl}/auth/profile-photo/${userId}`;
    }
    return null;
  }

  const image =
    userOrImage?.image ||
    userOrImage?.avatar ||
    userOrImage?.profilePhoto ||
    userOrImage?.photo ||
    userOrImage?.profileImage ||
    userOrImage?.avatarUrl ||
    userOrImage?.photoUrl ||
    userOrImage?.profilePhotoUrl;

  const uid = userOrImage?._id || userOrImage?.id || userId;

  if (
    image &&
    (image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("data:") ||
      image.startsWith("blob:"))
  ) {
    return image;
  }

  if (image && uid) {
    const baseUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3005/api";
    return `${baseUrl}/auth/profile-photo/${uid}`;
  }

  return null;
};

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl font-bold",
  "2xl": "h-28 w-28 text-3xl font-bold",
};

const dotSizeClasses = {
  xs: "h-2 w-2 border",
  sm: "h-2.5 w-2.5 border-2",
  md: "h-3 w-3 border-2",
  lg: "h-3.5 w-3.5 border-2",
  xl: "h-4 w-4 border-2",
  "2xl": "h-5 w-5 border-2",
};

export default function Avatar({
  user,
  src,
  name,
  size = "md",
  className = "",
  showOnline = false,
  isOnline = false,
  onClick,
  previewable = false,
  alt = "Avatar",
}) {
  const [imgError, setImgError] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const displayName = name || user?.name || user?.username || user?.email || "";
  const avatarUrl = src || resolveAvatarUrl(user);
  const initials = getInitials(displayName);
  const colorScheme = getDeterministicColor(displayName);

  const baseSize = sizeClasses[size] || sizeClasses.md;
  const dotSize = dotSizeClasses[size] || dotSizeClasses.md;

  const handleClick = (e) => {
    if (previewable && avatarUrl && !imgError) {
      e.stopPropagation();
      setShowPreviewModal(true);
    }
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <>
      <div
        className={`relative inline-flex shrink-0 select-none items-center justify-center rounded-full ${baseSize} ${className} ${
          onClick || (previewable && avatarUrl && !imgError)
            ? "cursor-pointer"
            : ""
        }`}
        onClick={handleClick}
      >
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={displayName || alt}
            onError={() => setImgError(true)}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center rounded-full font-semibold ${colorScheme.bg} ${colorScheme.text}`}
          >
            {initials}
          </div>
        )}

        {showOnline && (
          <span
            className={`absolute bottom-0 right-0 rounded-full border-white ${dotSize} ${
              isOnline ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        )}
      </div>

      {showPreviewModal && avatarUrl && !imgError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={(e) => {
            e.stopPropagation();
            setShowPreviewModal(false);
          }}
        >
          <div
            className="relative max-h-[85vh] max-w-[85vw] overflow-hidden rounded-2xl bg-white p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
              aria-label="Close preview"
            >
              <FiX size={18} />
            </button>
            <img
              src={avatarUrl}
              alt={displayName || "Profile Preview"}
              className="max-h-[75vh] max-w-[75vw] rounded-xl object-contain"
            />
            {displayName && (
              <p className="mt-2 text-center text-xs font-semibold text-gray-800">
                {displayName}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
