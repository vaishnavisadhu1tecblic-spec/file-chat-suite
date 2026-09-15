import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { Link } from "react-router-dom";

import { loginUser } from "../../../api/authApi";
import { useDispatch } from "react-redux";
import { showRegister } from "../../../redux/pageSlice";
import { FcGoogle } from "react-icons/fc";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { useState } from "react";

import { useNavigate } from "react-router-dom";

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

  const googleLogin = useGoogleLogin({
    flow: "implicit",

    onSuccess: async (tokenResponse) => {
      try {
        const res = await axios.post("http://localhost:3005/api/auth/google", {
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
    <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
      <h1 className="text-4xl font-bold text-gray-900">Welcome back</h1>

      <p className="text-gray-500 mt-2 mb-8">
        Sign in to continue to your SyncSpace workspace.
      </p>

      {/* Email */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Email</label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full border-b border-gray-300 outline-none py-3 focus:border-violet-600"
        />
      </div>

      {/* Password */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <label className="text-gray-700">Password</label>

          <Link to="/forgot-password" className="text-blue-600 text-sm">
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
            className="w-full border-b border-gray-300 outline-none py-3 pr-10 focus:border-violet-600"
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
      <div className="flex items-center mb-10">
        <input type="checkbox" className="mr-2 rounded-xl bg-blue" />

        <span className="text-gray-500">Keep me signed in</span>
      </div>

      {/* Login Button */}
      <button
        onClick={handleLogin}
        className="w-full bg-blue-600 from-violet-600 to-fuchsia-600 text-white py-3 rounded-xl font-semibold hover:opacity-90"
      >
        Login
      </button>

      <div className="my-6 text-center text-gray-400">or</div>

      {/* Google Button */}
      <button
        type="button"
        onClick={() => googleLogin()}
        className="w-full border border-gray-300 rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-gray-100"
      >
        <FcGoogle size={22} />
        Continue with Google
      </button>
      {/* 
      <button
        type="button"
        onClick={() => alert("Google")}
        className="w-full border border-gray-300 rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-gray-100"
      >
        <FcGoogle size={22} />
        Continue with Google
      </button> */}

      {/* Bottom */}
      <p className="text-center text-gray-500 mt-8">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showRegister())}
          className=" cursor-pointer text-blue-600 font-semibold"
        >
          {" "}
          Create Account
        </button>
      </p>
    </div>
  );
}

export default Login;
