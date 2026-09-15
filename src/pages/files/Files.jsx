import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiUploadCloud,
  FiSearch,
  FiFolderPlus,
  FiFileText,
  FiPlay,
  FiMoreHorizontal,
  FiHeadphones,
} from "react-icons/fi";

import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import api from "../../api/interceptors";

const BACKEND_BASE = "http://localhost:3005";

function Files() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);

  const [selectedFolder, setSelectedFolder] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [folderLoading, setFolderLoading] = useState(false);

  const uploadInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  // =====================================================
  // LOAD FOLDERS
  // =====================================================

  const loadFolders = useCallback(async () => {
    try {
      setFolderLoading(true);

      const response = await api.get("/files/folders");

      const loadedFolders = response.data?.folders || [];

      setFolders(loadedFolders);
    } catch (error) {
      console.error("Load folders error:", error);

      console.error(
        "GET /api/files/folders:",
        error?.response?.data || error?.message || error,
      );
    } finally {
      setFolderLoading(false);
    }
  }, []);

  // =====================================================
  // LOAD FILES
  // =====================================================

  const loadFiles = useCallback(async (folderId, search) => {
    try {
      setLoading(true);

      const response = await api.get("/files", {
        params: {
          folderId: folderId || "all",
          search: search?.trim() || "",
        },
      });

      const loadedFiles = response.data?.files || [];

      setFiles(loadedFiles);
    } catch (error) {
      console.error("Load files error:", error);

      console.error(
        "GET /api/files:",
        error?.response?.data || error?.message || error,
      );

      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    loadFolders();
    loadFiles("all", "");
  }, [loadFolders, loadFiles]);

  // =====================================================
  // CREATE FOLDER
  // =====================================================

  const handleCreateFolder = async () => {
    const folderName = window.prompt("Folder name");

    if (!folderName || !folderName.trim()) {
      return;
    }

    const trimmedName = folderName.trim();

    try {
      setFolderLoading(true);

      const payload = {
        name: trimmedName,
      };

      // If a folder is selected, create the new folder inside it.
      if (selectedFolder !== "all") {
        payload.parentFolder = selectedFolder;
      }

      const response = await api.post("/files/folders", payload);

      console.log("Folder created:", response.data);

      await loadFolders();

      alert("Folder created successfully");
    } catch (error) {
      console.error("Create folder error:", error);

      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create folder",
      );
    } finally {
      setFolderLoading(false);
    }
  };

  // =====================================================
  // UPLOAD FILE
  // =====================================================

  const handleUpload = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login again.");

      event.target.value = "";

      return;
    }

    const formData = new FormData();

    // IMPORTANT:
    // Backend multer expects the field name "file".
    formData.append("file", selectedFile);

    // Upload into selected folder.
    if (selectedFolder !== "all") {
      formData.append("folderId", selectedFolder);
    }

    try {
      setUploading(true);
      setLoading(true);

      const response = await fetch(`${BACKEND_BASE}/api/files/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Upload failed");
      }

      console.log("File uploaded successfully:", data);

      // Reset input so the same file can be selected again.
      event.target.value = "";

      // Clear search after successful upload.
      setSearchTerm("");

      // Reload folders and files.
      await Promise.all([loadFolders(), loadFiles(selectedFolder, "")]);

      alert("File uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);

      alert(error?.message || "Upload failed");

      event.target.value = "";
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const handleSearch = (event) => {
    const value = event.target.value;

    setSearchTerm(value);

    // Prevent an old search request from being fired.
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    // Small debounce so backend is not called for every single key.
    searchTimerRef.current = setTimeout(() => {
      loadFiles(selectedFolder, value);
    }, 300);
  };

  // =====================================================
  // CLEAN SEARCH TIMER
  // =====================================================

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  // =====================================================
  // SELECT FOLDER
  // =====================================================

  const handleFolderSelect = (folderId) => {
    setSelectedFolder(folderId);

    loadFiles(folderId, searchTerm);
  };

  // =====================================================
  // DOWNLOAD
  // =====================================================

  const handleDownload = async (file) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        alert("Please login again.");
        return;
      }

      if (!file?._id) {
        alert("Invalid file.");
        return;
      }

      const response = await fetch(
        `${BACKEND_BASE}/api/files/${file._id}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData?.message || "Download failed");
      }

      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);

      const anchor = document.createElement("a");

      anchor.href = downloadUrl;

      anchor.download = file.originalName || file.name || "download";

      document.body.appendChild(anchor);

      anchor.click();

      anchor.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download error:", error);

      alert(error?.message || "Download failed");
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (fileId) => {
    if (!fileId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this file?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      await api.delete(`/files/${fileId}`);

      // Refresh current folder/search.
      await loadFiles(selectedFolder, searchTerm);

      alert("File deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);

      alert(
        error?.response?.data?.message || error?.message || "Delete failed",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // EMPTY FOLDER STATE
  // =====================================================

  const showFolderLoading = folderLoading && folders.length === 0;

  return (
    <div className="flex min-h-screen bg-[#F5F7FB]">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <Navbar />

        <main className="flex-1 p-8">
          <div className="mx-auto max-w-5xl">
            {/* PAGE HEADER */}

            <div className="mb-6">
              <h1 className="text-[34px] font-bold tracking-tight text-gray-900">
                Files
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Everything your team has uploaded, in one place.
              </p>
            </div>

            {/* SEARCH + ACTIONS */}

            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 flex-1 items-center rounded-xl border border-gray-200 bg-white px-4 shadow-sm">
                <FiSearch className="mr-3 text-gray-400" size={16} />

                <input
                  type="text"
                  placeholder="Search files and folders"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </div>

              <button
                type="button"
                disabled={folderLoading || uploading}
                className="flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleCreateFolder}
              >
                <FiFolderPlus size={15} />

                {folderLoading ? "Creating..." : "New Folder"}
              </button>

              <input
                type="file"
                ref={uploadInputRef}
                className="hidden"
                onChange={handleUpload}
              />

              <button
                type="button"
                disabled={loading || uploading}
                className="flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => uploadInputRef.current?.click()}
              >
                <FiUploadCloud size={15} />

                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>

            {/* FOLDERS */}

            <section className="mb-7">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                Folders
              </h2>

              <div className="flex min-h-[202px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-5">
                {showFolderLoading ? (
                  <div className="text-sm text-gray-500">
                    Loading folders...
                  </div>
                ) : folders.length === 0 ? (
                  <>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                      <FiFolderPlus size={18} />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-gray-900">
                      No folders yet
                    </p>

                    <p className="mt-1 max-w-[300px] text-center text-xs leading-5 text-gray-500">
                      Group related files together so your team always knows
                      where to look.
                    </p>

                    <button
                      type="button"
                      disabled={folderLoading}
                      className="mt-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleCreateFolder}
                    >
                      <FiFolderPlus size={13} />
                      New Folder
                    </button>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                        selectedFolder === "all"
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-gray-200 bg-white text-gray-700"
                      }`}
                      onClick={() => handleFolderSelect("all")}
                    >
                      All files
                    </button>

                    {folders.map((folder) => (
                      <button
                        type="button"
                        key={folder._id}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
                          selectedFolder === folder._id
                            ? "border-blue-600 bg-blue-50 text-blue-600"
                            : "border-gray-200 bg-white text-gray-700"
                        }`}
                        onClick={() => handleFolderSelect(folder._id)}
                      >
                        <span className="flex items-center gap-1">
                          <FiFolderPlus size={12} />

                          {folder.name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* ALL FILES */}

            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                All files
              </h2>

              <div className="grid grid-cols-4 gap-3">
                {loading && files.length === 0 ? (
                  <div className="col-span-4 rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    Loading files...
                  </div>
                ) : files.length === 0 ? (
                  <div className="col-span-4 rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                    {searchTerm
                      ? `No files found for "${searchTerm}"`
                      : selectedFolder !== "all"
                        ? "No files in this folder"
                        : "No files found"}
                  </div>
                ) : (
                  files.map((file) => (
                    <FileCard
                      key={file._id}
                      file={file}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// =====================================================
// FILE CARD
// =====================================================

function FileCard({ file, onDownload, onDelete }) {
  const [openMenu, setOpenMenu] = useState(false);

  const fileType = file?.type || "document";

  const imagePreviewUrl =
    fileType === "image" && file?.storedName
      ? `${BACKEND_BASE}/uploads/${file.storedName}`
      : "";

  // =====================================================
  // CLOSE MENU WHEN CLICKING OUTSIDE
  // =====================================================

  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false);
      }
    };

    if (openMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openMenu]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* PREVIEW */}

      <div className="relative flex h-[96px] items-center justify-center bg-[#F3F4F7]">
        {fileType === "document" && (
          <div className="flex h-11 w-9 flex-col rounded-md bg-white p-2 shadow-sm">
            <div className="mb-1 h-[3px] rounded bg-gray-200" />

            <div className="mb-1 h-[3px] rounded bg-gray-200" />

            <div className="h-[3px] w-6 rounded bg-gray-200" />
          </div>
        )}

        {fileType === "video" && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm">
            <FiPlay className="ml-0.5 text-gray-700" size={13} />
          </div>
        )}

        {fileType === "image" &&
          (imagePreviewUrl ? (
            <img
              src={imagePreviewUrl}
              alt={file.originalName || file.name || "Uploaded file"}
              className="h-20 w-28 rounded-md object-cover shadow-sm"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-12 w-20 items-center justify-center rounded-md bg-gray-200 text-xs text-gray-500">
              Image
            </div>
          ))}

        {fileType === "audio" && (
          <div className="flex items-center gap-[2px]">
            {[14, 20, 28, 18, 25, 34, 21, 30, 17, 24, 13, 27].map(
              (height, index) => (
                <span
                  key={index}
                  className="w-[2px] rounded-full bg-gray-300"
                  style={{
                    height: `${height}px`,
                  }}
                />
              ),
            )}
          </div>
        )}

        {fileType === "archive" && (
          <div className="flex h-11 w-12 items-center justify-center rounded-md bg-gray-200">
            <span className="text-xs font-bold text-gray-500">ZIP</span>
          </div>
        )}

        {fileType === "design" && (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white shadow-sm">
            <span className="text-xs font-bold text-gray-500">FIG</span>
          </div>
        )}

        {/* MENU */}

        <div ref={menuRef}>
          {openMenu && (
            <div className="absolute right-2 top-2 z-20 w-36 rounded-xl border border-gray-200 bg-white shadow-lg">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setOpenMenu(false);
                  onDownload(file);
                }}
              >
                Download
              </button>

              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-gray-50"
                onClick={() => {
                  setOpenMenu(false);
                  onDelete(file._id);
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FILE INFORMATION */}

      <div className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-blue-600">
            {fileType === "audio" ? (
              <FiHeadphones size={13} />
            ) : fileType === "video" ? (
              <FiPlay size={13} />
            ) : (
              <FiFileText size={13} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-semibold text-gray-900"
              title={file.originalName || file.name || "File"}
            >
              {file.originalName || file.name || "File"}
            </p>

            <p className="mt-1 text-[10px] text-gray-500">
              {file.sizeLabel || file.size || "Unknown size"} ·{" "}
              {file.createdDate || file.date || "Unknown date"}
            </p>
          </div>

          <button
            type="button"
            className="shrink-0 text-gray-500 hover:text-gray-900"
            onClick={() => setOpenMenu((previous) => !previous)}
          >
            <FiMoreHorizontal size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Files;
