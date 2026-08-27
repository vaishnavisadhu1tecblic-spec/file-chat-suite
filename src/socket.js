import { io } from "socket.io-client";

const socket = io("http://localhost:3005", {
  autoConnect: false,
  transports: ["websocket", "polling"],
  auth: {},
});

export default socket;
