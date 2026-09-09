import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Profile() {
  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="p-8">
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm p-8">
            <div className="flex items-center gap-6">
              <div className="h-24 w-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold">
                S
              </div>
              <div>
                <h1 className="text-[34px] font-bold tracking-tight">
                  SyncSpace User
                </h1>
                <p className="text-gray-500 mt-2">
                  Product team · Workspace owner
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="rounded-2xl bg-gray-50 p-5">
                <span className="text-sm text-gray-500">Full name</span>
                <p className="font-semibold mt-2">SyncSpace User</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-5">
                <span className="text-sm text-gray-500">Email</span>
                <p className="font-semibold mt-2">team@syncspace.io</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-5">
                <span className="text-sm text-gray-500">Workspace</span>
                <p className="font-semibold mt-2">SyncSpace</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-5">
                <span className="text-sm text-gray-500">Role</span>
                <p className="font-semibold mt-2">Admin</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;
