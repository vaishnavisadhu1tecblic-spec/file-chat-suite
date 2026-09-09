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
    <div className="min-h-screen bg-[#faf8ff]">
      <Header />

      <div className="grid grid-cols-2 min-h-[calc(100vh-100px)]">
        <div className="flex items-center justify-center px-20">
          <Welcome />
        </div>

        <div className="flex items-center justify-center bg-[#fcfbff]">
          {shouldShowRegister ? <Register /> : <Login />}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default LoginPage;
