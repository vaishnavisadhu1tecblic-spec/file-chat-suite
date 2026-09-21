import { registerUser } from "../../../api/authApi";
import { useDispatch } from "react-redux";
import { showLogin } from "../../../redux/pageSlice";
import { FcGoogle } from "react-icons/fc";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FiUpload } from "react-icons/fi";
import { useState } from "react";

function Register() {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [image, setImage] = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImage = (e) => {
    setImage(e.target.files[0]);
  };

  const handleRegister = async () => {
    try {
      const data = new FormData();

      data.append("name", formData.name);
      data.append("username", formData.username);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("confirmPassword", formData.confirmPassword);

      if (image) {
        data.append("image", image);
      }

      const response = await registerUser(data);

      alert(response.data.message);

      dispatch(showLogin());
    } catch (error) {
      alert(error.response?.data?.message || "Registration Failed");
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl sm:rounded-3xl sm:p-8 md:p-10">
      {/* Heading */}
      <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl md:text-4xl">
        Create your account
      </h1>

      <p className="mt-2 mb-5 text-sm leading-5 text-gray-500 sm:mb-8 sm:text-base">
        Free for teams up to 5 people. No card required.
      </p>

      {/* Upload Image */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-gray-200 p-3 sm:mb-6 sm:gap-4 sm:p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 sm:h-14 sm:w-14">
          AM
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-gray-800 sm:text-base">
            Profile image
          </h3>

          <p className="mb-2 text-xs leading-4 text-gray-500 sm:text-sm">
            PNG or JPG, up to 4 MB
          </p>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-xs transition hover:bg-gray-50 sm:px-4 sm:text-sm">
            <FiUpload />
            Upload
            <input
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={handleImage}
            />
          </label>
        </div>
      </div>

      {/* Full Name & Username */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-gray-700 sm:text-base">
            Full name
          </label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Alina Meyer"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-700 sm:text-base">
            Username
          </label>

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="alina"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="mb-2 block text-sm text-gray-700 sm:text-base">
          Email
        </label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
        />
      </div>

      {/* Passwords */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2">
        {/* Password */}
        <div>
          <label className="mb-2 block text-sm text-gray-700 sm:text-base">
            Password
          </label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-2.5 p-1 text-gray-500 sm:right-3 sm:top-3"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="mb-2 block text-sm text-gray-700 sm:text-base">
            Confirm password
          </label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-2 top-2.5 p-1 text-gray-500 sm:right-3 sm:top-3"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>
        </div>
      </div>

      {/* Register Button */}
      <button
        type="button"
        onClick={handleRegister}
        className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:text-base"
      >
        Create account
      </button>

      {/* Divider */}
      <div className="my-5 flex items-center sm:my-6">
        <div className="h-px flex-1 bg-gray-300" />

        <span className="mx-3 text-xs text-gray-400 sm:mx-4 sm:text-sm">
          or
        </span>

        <div className="h-px flex-1 bg-gray-300" />
      </div>

      {/* Google */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 text-sm transition hover:bg-gray-50 sm:text-base"
      >
        <FcGoogle size={22} />
        Sign up with Google
      </button>

      {/* Bottom */}
      <p className="mt-5 text-center text-xs leading-5 text-gray-500 sm:mt-8 sm:text-sm">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showLogin())}
          className="cursor-pointer font-semibold text-blue-600 hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
