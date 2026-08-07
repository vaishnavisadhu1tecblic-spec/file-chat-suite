import { useSelector } from "react-redux";
import Welcome from "./components/Welcome";
import Login from "./components/Login";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Register from "./components/Register";

function LoginPage() {
  const showHidepage = useSelector((state) => state.page.showHidePage);

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      {/* Header */}
      <Header />

      <div className="grid grid-cols-2 min-h-[calc(100vh-100px)]">
        {/* Left Side */}
        <div className="flex items-center justify-center px-20">
          <Welcome />
        </div>

        {/* Right Side */}
        <div className="flex items-center justify-center bg-[#fcfbff]">
          {showHidepage ? <Login /> : <Register />}
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default LoginPage;
