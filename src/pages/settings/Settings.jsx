import { useEffect, useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Settings() {
  const [formData, setFormData] = useState({
    name: "Alina Meyer",
    username: "alina",
    email: "alina@syncspace.io",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    desktopNotifications: true,
    sharedLinkExpiry: false,
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    setFormData({
      name: storedUser?.name || storedUser?.username || "Alina Meyer",
      username: storedUser?.username || "alina",
      email: storedUser?.email || "alina@syncspace.io",
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleToggle = (name) => {
    setPreferences((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleSave = () => {
    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

    const updatedUser = {
      ...storedUser,
      name: formData.name,
      username: formData.username,
      email: formData.email,
    };

    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="flex-1 px-8 py-6">
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

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
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
                <div className="col-span-2">
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
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-[10px] bg-[#315EFF] px-4 py-2 text-[10px] font-semibold text-white hover:bg-[#2852e8]"
                >
                  Save changes
                </button>
              </div>
            </section>

            {/* Preferences */}
            <section className="mt-4 rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <h2 className="mb-3 text-[13px] font-semibold text-gray-900">
                Preferences
              </h2>

              {/* Email Notifications */}
              <div className="flex items-center justify-between border-b border-gray-200 py-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-900">
                    Email notifications
                  </p>

                  <p className="mt-0.5 text-[9px] text-gray-500">
                    Digest of mentions and file activity every morning.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle("emailNotifications")}
                  aria-label="Toggle email notifications"
                  className={`relative h-[14px] w-[25px] shrink-0 rounded-full ${
                    preferences.emailNotifications
                      ? "bg-[#315EFF]"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow-sm ${
                      preferences.emailNotifications
                        ? "left-[13px]"
                        : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Desktop Notifications */}
              <div className="flex items-center justify-between border-b border-gray-200 py-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-900">
                    Desktop notifications
                  </p>

                  <p className="mt-0.5 text-[9px] text-gray-500">
                    Get notified when someone messages you directly.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle("desktopNotifications")}
                  aria-label="Toggle desktop notifications"
                  className={`relative h-[14px] w-[25px] shrink-0 rounded-full ${
                    preferences.desktopNotifications
                      ? "bg-[#315EFF]"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow-sm ${
                      preferences.desktopNotifications
                        ? "left-[13px]"
                        : "left-[2px]"
                    }`}
                  />
                </button>
              </div>

              {/* Shared Link Expiry */}
              <div className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-[10px] font-medium text-gray-900">
                    Shared link expiry
                  </p>

                  <p className="mt-0.5 text-[9px] text-gray-500">
                    Automatically expire shared links after 30 days.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle("sharedLinkExpiry")}
                  aria-label="Toggle shared link expiry"
                  className={`relative h-[14px] w-[25px] shrink-0 rounded-full ${
                    preferences.sharedLinkExpiry
                      ? "bg-[#315EFF]"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-[2px] h-[10px] w-[10px] rounded-full bg-white shadow-sm ${
                      preferences.sharedLinkExpiry
                        ? "left-[13px]"
                        : "left-[2px]"
                    }`}
                  />
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;
