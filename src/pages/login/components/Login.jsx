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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const [showPassword, setShowPassword] = useState(false);
  //const API_URL = "http://localhost:3005";
  const API_URL = import.meta.env.VITE_BACKEND_URL;

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
    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-8 md:p-10">
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
        Welcome back
      </h1>

      <p className="mt-2 mb-6 text-gray-500 sm:mb-8">
        Sign in to continue to your SyncSpace workspace.
      </p>

      {/* Email */}
      <div className="mb-5 sm:mb-6">
        <label className="mb-2 block text-gray-700">Email</label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full border-b border-gray-300 py-3 outline-none focus:border-violet-600"
        />
      </div>

      {/* Password */}
      <div className="mb-5 sm:mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-gray-700">Password</label>

          <Link
            to="/forgot-password"
            className="shrink-0 text-sm text-blue-600"
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
            className="w-full border-b border-gray-300 py-3 pr-10 outline-none focus:border-violet-600"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-3 text-gray-500"
          >
            {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
          </button>
        </div>
      </div>

      {/* Checkbox */}
      <div className="mb-8 flex items-center sm:mb-10">
        <input type="checkbox" className="mr-2 rounded-xl bg-blue" />

        <span className="text-gray-500">Keep me signed in</span>
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:opacity-90"
      >
        Login
      </button>

      <div className="my-5 text-center text-gray-400 sm:my-6">or</div>

      {/* Google Button */}
      <button
        type="button"
        onClick={() => googleLogin()}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 hover:bg-gray-100"
      >
        <FcGoogle size={22} />
        Continue with Google
      </button>

      {/* 
      <button
        type="button"
        onClick={() => alert("Google")}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 hover:bg-gray-100"
      >
        <FcGoogle size={22} />
        Continue with Google
      </button> */}

      {/* Bottom */}
      <p className="mt-6 text-center text-gray-500 sm:mt-8">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showRegister())}
          className="cursor-pointer font-semibold text-blue-600"
        >
          {" "}
          Create Account
        </button>
      </p>
    </div>
  );
}

export default Login;
