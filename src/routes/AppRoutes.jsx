import { BrowserRouter, Routes, Route } from "react-router-dom";

import LoginPage from "../pages/login/LoginPage";
import Dashboard from "../pages/dashboard/Dashboard";
import Chat from "../pages/chat/Chat";
import Files from "../pages/files/Files";
import Profile from "../pages/profile/Profile";
import Settings from "../pages/settings/Settings";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/files" element={<Files />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
