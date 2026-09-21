import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Register from "./components/Register";

function LoginPage() {
  const showHidepage = useSelector((state) => state.page.showHidePage);
  const location = useLocation();

  const isRegisterPath = location.pathname === "/register";
  const shouldShowRegister = isRegisterPath ? true : !showHidepage;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#faf8ff]">
      <Header />

      <div className="grid min-h-[calc(100vh-100px)] grid-cols-1 lg:grid-cols-2">
        {/* Welcome Section */}
        <div className="flex items-center justify-center px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12 xl:px-20">
          <Welcome />
        </div>

        {/* Login / Register Section */}
        <div className="flex items-center justify-center bg-[#fcfbff] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="w-full max-w-md">
            {shouldShowRegister ? <Register /> : <Login />}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default LoginPage;
