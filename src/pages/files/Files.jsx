import {
  FiUploadCloud,
  FiSearch,
  FiGrid,
  FiFolder,
  FiClock,
  FiDownload,
  FiMoreHorizontal,
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

function Files() {
  const files = [
    {
      name: "Brand-guidelines-v4.pdf",
      owner: "Alina Meyer",
      folder: "Marketing",
      size: "8.2 MB",
      date: "Jul 28, 2026",
      type: "PDF",
    },
    {
      name: "Homepage-hero-final.png",
      owner: "Tobias Lund",
      folder: "Creative",
      size: "3.4 MB",
      date: "Jul 27, 2026",
      type: "PNG",
    },
    {
      name: "Product-launch-plan.docx",
      owner: "Priya Raman",
      folder: "Operations",
      size: "420 KB",
      date: "Jul 26, 2026",
      type: "DOCX",
    },
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <Navbar />

        <main className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-[34px] font-bold tracking-tight">Files</h1>
              <p className="text-gray-500 mt-2">Your workspace file library.</p>
            </div>

            <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              <FiUploadCloud />
              Upload File
            </button>
          </div>

          <section className="grid grid-cols-4 gap-6 mb-8">
            <StatCard icon={<FiFolder />} title="Total files" value="128" />
            <StatCard icon={<FiGrid />} title="Folders" value="14" />
            <StatCard icon={<FiClock />} title="Recently added" value="23" />
            <StatCard
              icon={<FiDownload />}
              title="Storage used"
              value="42.6 GB"
            />
          </section>

          <section className="bg-white rounded-3xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <FiSearch className="text-gray-400" />
                <span className="font-semibold text-gray-900">All Files</span>
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  Type
                </button>
                <button className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  Recent
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-7 py-5"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <FiFolder size={22} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {file.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {file.owner} · {file.folder} · {file.size}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                      {file.type}
                    </span>

                    <span className="text-sm text-gray-500">{file.date}</span>

                    <button className="text-gray-500 hover:text-blue-600">
                      <FiMoreHorizontal />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <span className="text-xs text-gray-400">Live</span>
      </div>
      <div className="mt-6">
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className="mt-2 text-3xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );
}

export default Files;
