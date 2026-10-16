import axios from "axios";

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.");
    if (isLocal && (!envUrl || envUrl.includes("trycloudflare.com"))) {
      return `http://${window.location.hostname}:3005/api`;
    }
  }
  return envUrl || "http://localhost:3005/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;

