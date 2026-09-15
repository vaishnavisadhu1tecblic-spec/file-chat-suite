import { useEffect, useState } from "react";
import {
  FiLock,
  FiEdit2,
  FiUploadCloud,
  FiShare2,
  FiHardDrive,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";

const DEFAULT_USER = {
  name: "Alina Meyer",
  username: "alina",
  email: "alina@syncspace.io",
};

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(DEFAULT_USER);

  // =====================================================
  // LOAD USER
  // =====================================================

  const loadUser = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      setUser({
        name: storedUser?.name || storedUser?.username || DEFAULT_USER.name,

        username: storedUser?.username || DEFAULT_USER.username,

        email: storedUser?.email || DEFAULT_USER.email,
      });
    } catch (error) {
      console.error("Load profile user error:", error);

      setUser(DEFAULT_USER);
    }
  };

  // =====================================================
  // INITIAL LOAD + SETTINGS UPDATE
  // =====================================================

  useEffect(() => {
    loadUser();

    const handleUserUpdated = () => {
      loadUser();
    };

    window.addEventListener("userUpdated", handleUserUpdated);

    return () => {
      window.removeEventListener("userUpdated", handleUserUpdated);
    };
  }, []);

  const displayName = user.name;
  const email = user.email;
  const username = user.username;

  const firstLetter = String(displayName).trim().charAt(0).toUpperCase() || "A";

  // =====================================================
  // RECENT UPLOADS
  // =====================================================

  const uploads = [
    {
      name: "Brand-guidelines-v4.pdf",
      size: "8.2 MB · Jul 28, 2028",
      owner: "Alina Meyer",
    },
    {
      name: "Onboarding-walkthrough.mp4",
      size: "146 MB · Jul 27, 2026",
      owner: "Tobias Lund",
    },
    {
      name: "Homepage-hero-final.png",
      size: "3.4 MB · Jul 27, 2026",
      owner: "Alina Meyer",
    },
    {
      name: "Standup-recap.m4a",
      size: "12.1 MB · Jul 26, 2026",
      owner: "Priya Raman",
    },
  ];

  // =====================================================
  // SHARED FILES
  // =====================================================

  const sharedFiles = [
    {
      name: "Q3-roadmap.docx",
      size: "820 KB · Jul 25, 2026",
      owner: "Marcus Vale",
    },
    {
      name: "Mobile-shots.zip",
      size: "54 MB · Jul 24, 2026",
      owner: "Tobias Lund",
    },
    {
      name: "Pricing-experiment.pdf",
      size: "1.9 MB · Jul 23, 2026",
      owner: "Priya Raman",
    },
  ];

  // =====================================================
  // SKILLS
  // =====================================================

  const skills = [
    "Product Design",
    "Design Systems",
    "Prototyping",
    "User Research",
    "Figma",
    "Accessibility",
    "Motion",
  ];

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />

        <main className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto w-full max-w-[800px]">
            {/* PAGE HEADING */}

            <div className="mb-5">
              <h1 className="text-[22px] font-bold tracking-tight text-gray-900">
                Profile
              </h1>

              <p className="mt-1 text-[11px] text-gray-500">
                How your teammates see you in SyncSpace.
              </p>
            </div>

            {/* PROFILE HEADER */}

            <section className="overflow-hidden rounded-[14px] border border-gray-200 bg-white shadow-sm">
              {/* COVER */}

              <div className="h-[150px] bg-gradient-to-r from-[#f4f7fa] via-[#edf2f6] to-[#e3e9ef]" />

              {/* PROFILE INFORMATION */}

              <div className="relative flex min-h-[73px] items-center justify-between px-5 pb-3 pt-3">
                <div className="flex min-w-0 items-center gap-3">
                  {/* AVATAR */}

                  <div className="-mt-[67px] flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2 border-white bg-[#edf3ff] text-[17px] font-semibold text-[#315eff] shadow-sm">
                    {firstLetter}
                  </div>

                  {/* USER DETAILS */}

                  <div className="min-w-0">
                    <h2 className="text-[14px] font-semibold leading-tight text-gray-900">
                      {displayName}
                    </h2>

                    <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-500">
                      <span>@{username}</span>
                      <span>·</span>
                      <span>Product Designer</span>
                      <span>·</span>
                      <span>Northwind Studio</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-[9px] text-gray-500">
                      <span>{email}</span>
                      <span>·</span>
                      <span>Berlin, Germany</span>
                      <span>·</span>
                      <span>alinameyer.design</span>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="flex h-[27px] items-center gap-1 rounded-[8px] border border-gray-300 bg-white px-3 text-[9px] font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    <FiLock size={10} />
                    Change Password
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/settings")}
                    className="flex h-[27px] items-center gap-1 rounded-[8px] bg-[#315eff] px-3 text-[9px] font-semibold text-white transition hover:bg-[#2853e6]"
                  >
                    <FiEdit2 size={10} />
                    Edit Profile
                  </button>
                </div>
              </div>
            </section>

            {/* MAIN CONTENT */}

            <section className="mt-4 grid grid-cols-[1fr_250px] gap-4">
              {/* LEFT COLUMN */}

              <div className="min-w-0 space-y-4">
                {/* ABOUT */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    About
                  </h3>

                  <p className="mt-2 text-[9px] leading-[1.55] text-gray-600">
                    Product designer focused on calm, systematic interfaces. I
                    lead the design system at Northwind Studio and spend most of
                    my week between component audits, prototyping, and helping
                    engineers ship pixel-honest UI. Previously at Fieldnote and
                    Arc Labs.
                  </p>
                </section>

                {/* SKILLS */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    Skills
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-[7px] border border-gray-200 bg-[#f5f7fa] px-2.5 py-1 text-[8px] font-medium text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>

                {/* RECENT UPLOADS */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    Recent Uploads
                  </h3>

                  <div className="mt-3 space-y-2">
                    {uploads.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between rounded-[9px] bg-[#f8fafc] px-2.5 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                            <FiUploadCloud size={11} />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-[9px] font-semibold text-gray-900">
                              {file.name}
                            </p>

                            <p className="mt-0.5 text-[7px] text-gray-500">
                              {file.size}
                            </p>
                          </div>
                        </div>

                        <span className="ml-3 shrink-0 text-[8px] font-medium text-gray-600">
                          {file.owner}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* SHARED FILES */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <h3 className="text-[11px] font-semibold text-gray-900">
                    Shared Files
                  </h3>

                  <div className="mt-3 space-y-2">
                    {sharedFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between rounded-[9px] bg-[#f8fafc] px-2.5 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
                            <FiUploadCloud size={11} />
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-[9px] font-semibold text-gray-900">
                              {file.name}
                            </p>

                            <p className="mt-0.5 text-[7px] text-gray-500">
                              {file.size}
                            </p>
                          </div>
                        </div>

                        <span className="ml-3 shrink-0 text-[8px] font-medium text-gray-600">
                          {file.owner}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN */}

              <aside className="space-y-4">
                {/* TOTAL UPLOADS */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Total Uploads
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        342
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        +12 this month
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiUploadCloud size={13} />
                    </span>
                  </div>
                </section>

                {/* TOTAL SHARED FILES */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Total Shared Files
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        98
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        18 with external guests
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiShare2 size={13} />
                    </span>
                  </div>
                </section>

                {/* STORAGE USED */}

                <section className="rounded-[14px] border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-[9px] font-medium text-gray-500">
                        Storage Used
                      </h3>

                      <p className="mt-1.5 text-[25px] font-bold leading-none text-gray-900">
                        42.6 GB
                      </p>

                      <p className="mt-2 text-[8px] text-gray-500">
                        43% of 100 GB
                      </p>
                    </div>

                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#edf3ff] text-[#315eff]">
                      <FiHardDrive size={13} />
                    </span>
                  </div>
                </section>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Profile;
