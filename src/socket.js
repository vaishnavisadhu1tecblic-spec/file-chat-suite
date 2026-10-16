import { io } from "socket.io-client";

const getSocketURL = () => {
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (typeof window !== "undefined") {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.");
    if (isLocal && (!envUrl || envUrl.includes("trycloudflare.com"))) {
      return `http://${window.location.hostname}:3005`;
    }
  }
  return envUrl || "http://localhost:3005";
};

const socket = io(getSocketURL(), {
  autoConnect: false,
  transports: ["websocket", "polling"],
  auth: {},
});

export const disconnectSocketSession = () => {
  socket.auth = {};
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;

