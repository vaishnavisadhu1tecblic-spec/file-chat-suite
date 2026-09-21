import { useEffect, useState } from "react";
import { updateUser } from "../../api/authApi";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

const DEFAULT_USER = {
  name: "Alina Meyer",
  username: "alina",
  email: "alina@syncspace.io",
};

const DEFAULT_PREFERENCES = {
  emailNotifications: true,
  desktopNotifications: true,
  sharedLinkExpiry: false,
};

function Settings() {
  const [formData, setFormData] = useState(DEFAULT_USER);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      const storedPreferences = JSON.parse(
        localStorage.getItem("preferences") || "{}",
      );

      const storedTheme = localStorage.getItem("theme") || "light";

      setFormData({
        name: storedUser?.name || storedUser?.username || DEFAULT_USER.name,
        username: storedUser?.username || DEFAULT_USER.username,
        email: storedUser?.email || DEFAULT_USER.email,
      });

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...storedPreferences,
      });

      setTheme(storedTheme);
      document.documentElement.dataset.theme = storedTheme;
    } catch (error) {
      console.error("Load settings error:", error);
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setSaved(false);

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (name) => {
    setSaved(false);

    setPreferences((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleThemeToggle = () => {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  };

  const handleSave = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = storedUser?._id;

      if (!userId) {
        setSaveError("Your session is missing. Please log in again.");
        return;
      }

      const updatedUser = {
        ...storedUser,
        name: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
      };

      setIsSaving(true);
      setSaveError("");

      const response = await updateUser(userId, {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
      });

      localStorage.setItem(
        "user",
        JSON.stringify(response.data?.user || updatedUser),
      );

      localStorage.setItem("preferences", JSON.stringify(preferences));
      localStorage.setItem("theme", theme);

      document.documentElement.dataset.theme = theme;

      window.dispatchEvent(new Event("userUpdated"));

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Save settings error:", error);

      setSaveError(
        error.response?.data?.message ||
          "Unable to save your account settings. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[640px]">
            {/* Page Header */}

            <div className="mb-5">
              <h1 className="text-[22px] font-semibold leading-tight text-gray-900">
                Settings
              </h1>

              <p className="mt-1 text-[11px] text-gray-500">
                Manage your account and workspace preferences.
              </p>
            </div>

            {/* Account */}

            <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <h2 className="mb-4 text-[13px] font-semibold text-gray-900">
                Account
              </h2>

              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                {/* Full Name */}

                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-[10px] font-medium text-gray-900"
                  >
                    Full name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="h-[30px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[10px] text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Username */}

                <div>
                  <label
                    htmlFor="username"
                    className="mb-1.5 block text-[10px] font-medium text-gray-900"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    className="h-[30px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[10px] text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>

                {/* Email */}

                <div className="sm:col-span-2">
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-[10px] font-medium text-gray-900"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="h-[30px] w-full rounded-[9px] border border-gray-200 bg-white px-3 text-[10px] text-gray-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Save Changes */}

              <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
                {saved && (
                  <span className="text-[10px] font-medium text-green-600">
                    Changes saved
                  </span>
                )}

                {saveError && (
                  <span className="break-words text-[10px] font-medium text-red-600 sm:max-w-[300px] sm:text-right">
                    {saveError}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full rounded-[10px] bg-[#315EFF] px-4 py-2 text-[10px] font-semibold text-white hover:bg-[#2852e8] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </section>

            {/* Preferences */}

            <section className="mt-4 rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <h2 className="mb-3 text-[13px] font-semibold text-gray-900">
                Preferences
              </h2>

              {/* Email Notifications */}

              <div className="flex min-w-0 items-center justify-between gap-4 border-b border-gray-200 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-900">
                    Email notifications
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-gray-500">
                    Digest of mentions and file activity every morning.
                  </p>
                </div>

                <Toggle
                  enabled={preferences.emailNotifications}
                  onClick={() => handleToggle("emailNotifications")}
                  label="Toggle email notifications"
                />
              </div>

              {/* Desktop Notifications */}

              <div className="flex min-w-0 items-center justify-between gap-4 border-b border-gray-200 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-900">
                    Desktop notifications
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-gray-500">
                    Get notified when someone messages you directly.
                  </p>
                </div>

                <Toggle
                  enabled={preferences.desktopNotifications}
                  onClick={() => handleToggle("desktopNotifications")}
                  label="Toggle desktop notifications"
                />
              </div>

              {/* Shared Link Expiry */}

              <div className="flex min-w-0 items-center justify-between gap-4 border-b border-gray-200 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-900">
                    Shared link expiry
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-gray-500">
                    Automatically expire shared links after 30 days.
                  </p>
                </div>

                <Toggle
                  enabled={preferences.sharedLinkExpiry}
                  onClick={() => handleToggle("sharedLinkExpiry")}
                  label="Toggle shared link expiry"
                />
              </div>

              {/* Dark Mode */}

              <div className="flex min-w-0 items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-gray-900">
                    Dark mode
                  </p>

                  <p className="mt-0.5 text-[9px] leading-4 text-gray-500">
                    Use the dark black and purple theme.
                  </p>
                </div>

                <Toggle
                  enabled={theme === "dark"}
                  onClick={handleThemeToggle}
                  label="Toggle dark mode"
                />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Toggle({ enabled, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`relative h-[14px] w-[25px] shrink-0 rounded-full ${
        enabled ? "bg-[#315EFF]" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow-sm ${
          enabled ? "left-[13px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

export default Settings;
