import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Settings() {
  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm p-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-6">
              <div>
                <h1 className="text-[34px] font-bold tracking-tight">
                  Settings
                </h1>
                <p className="text-gray-500 mt-2">Workspace preferences</p>
              </div>
              <button className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white">
                Save changes
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="rounded-2xl bg-gray-50 p-6">
                <label className="block text-sm text-gray-500">
                  Workspace name
                </label>
                <input
                  className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3"
                  value="SyncSpace"
                />
              </div>
              <div className="rounded-2xl bg-gray-50 p-6">
                <label className="block text-sm text-gray-500">
                  Workspace URL
                </label>
                <input
                  className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3"
                  value="syncspace.app"
                />
              </div>
              <div className="rounded-2xl bg-gray-50 p-6">
                <label className="block text-sm text-gray-500">
                  Notifications
                </label>
                <select className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3">
                  <option>All updates</option>
                  <option>Only mentions</option>
                </select>
              </div>
              <div className="rounded-2xl bg-gray-50 p-6">
                <label className="block text-sm text-gray-500">
                  Storage limit
                </label>
                <input
                  className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3"
                  value="100 GB"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Settings;
