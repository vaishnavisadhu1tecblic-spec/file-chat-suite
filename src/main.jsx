import { Provider } from "react-redux";
import { store } from "./redux/store";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Apply saved theme before React renders
const savedTheme = localStorage.getItem("theme") || "light";

document.documentElement.dataset.theme = savedTheme;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
