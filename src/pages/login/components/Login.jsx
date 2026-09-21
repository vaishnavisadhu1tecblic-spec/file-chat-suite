import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../../../api/authApi";
import { useDispatch } from "react-redux";
import { showRegister } from "../../../redux/pageSlice";
import { FcGoogle } from "react-icons/fc";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useState } from "react";

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  // const API_URL = "http://localhost:3005";
  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const googleLogin = useGoogleLogin({
    flow: "implicit",

    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post(`${API_URL}/auth/google`, {
          access_token: tokenResponse.access_token,
        });

        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        navigate("/dashboard");
      } catch (err) {
        console.log(err);
      }
    },

    onError: () => {
      alert("Google Login Failed");
    },
  });

  const handleLogin = async () => {
    try {
      const response = await loginUser(formData);

      console.log(response.data);

      alert(response.data.message);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/dashboard");
    } catch (error) {
      console.log(error);
      alert(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl sm:rounded-3xl sm:p-8 md:p-10">
      {/* Heading */}
      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl md:text-4xl">
        Welcome back
      </h1>

      <p className="mt-2 mb-5 text-sm leading-5 text-gray-500 sm:mb-8 sm:text-base">
        Sign in to continue to your SyncSpace workspace.
      </p>

      {/* Email */}
      <div className="mb-5 sm:mb-6">
        <label className="mb-2 block text-sm text-gray-700 sm:text-base">
          Email
        </label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full border-b border-gray-300 py-2.5 text-sm outline-none transition focus:border-violet-600 sm:py-3 sm:text-base"
        />
      </div>

      {/* Password */}
      <div className="mb-5 sm:mb-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="text-sm text-gray-700 sm:text-base">Password</label>

          <Link
            to="/forgot-password"
            className="shrink-0 text-xs text-blue-600 hover:underline sm:text-sm"
          >
            Forgot password?
          </Link>
        </div>

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            className="w-full border-b border-gray-300 py-2.5 pr-10 text-sm outline-none transition focus:border-violet-600 sm:py-3 sm:text-base"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-1 top-2.5 p-1 text-gray-500 sm:top-3"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
          </button>
        </div>
      </div>

      {/* Checkbox */}
      <div className="mb-6 flex items-center sm:mb-10">
        <input type="checkbox" className="mr-2 h-4 w-4 rounded bg-blue-600" />

        <span className="text-xs text-gray-500 sm:text-sm">
          Keep me signed in
        </span>
      </div>

      {/* Login Button */}
      <button
        type="button"
        onClick={handleLogin}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:text-base"
      >
        Login
      </button>

      {/* Divider */}
      <div className="my-5 text-center text-sm text-gray-400 sm:my-6">or</div>

      {/* Google Button */}
      <button
        type="button"
        onClick={() => googleLogin()}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 text-sm transition hover:bg-gray-100 sm:text-base"
      >
        <FcGoogle size={22} />
        Continue with Google
      </button>

      {/* Bottom */}
      <p className="mt-5 text-center text-xs leading-5 text-gray-500 sm:mt-8 sm:text-sm">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showRegister())}
          className="cursor-pointer font-semibold text-blue-600 hover:underline"
        >
          Create Account
        </button>
      </p>
    </div>
  );
}

export default Login;
