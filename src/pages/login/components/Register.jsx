import { registerUser } from "../../../api/authApi";
import { useDispatch } from "react-redux";
import { showLogin } from "../../../redux/pageSlice";
import { FcGoogle } from "react-icons/fc";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FiUpload } from "react-icons/fi";
import { useState } from "react";

function Register() {
  const dispatch = useDispatch();
  // const navigate = useNavigate();

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
      data.append("image", image);

      const response = await registerUser(data);

      alert(response.data.message);

      dispatch(showLogin());
    } catch (error) {
      alert(error.response?.data?.message);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl sm:p-8 md:p-10">
      {/* Heading */}
      <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
        Create your account
      </h1>

      <p className="mt-2 mb-6 text-gray-500 sm:mb-8">
        Free for teams up to 5 people. No card required.
      </p>

      {/* Upload Image */}
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-gray-200 p-3 sm:mb-6 sm:gap-4 sm:p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600 sm:h-14 sm:w-14">
          AM
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-gray-800">Profile image</h3>

          <p className="mb-2 text-sm text-gray-500">PNG or JPG, up to 4 MB</p>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 hover:bg-gray-50 sm:px-4">
            <FiUpload />
            Upload
            <input type="file" className="hidden" onChange={handleImage} />
          </label>
        </div>
      </div>

      {/* Full Name & Username */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-gray-700">Full name</label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Alina Meyer"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="mb-2 block text-gray-700">Username</label>

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="alina"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="mb-2 block text-gray-700">Email</label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-600"
        />
      </div>

      {/* Passwords */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:mb-8 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-gray-700">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 outline-none focus:border-blue-600"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-4 text-gray-500"
            >
              {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-gray-700">Confirm password</label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-10 outline-none focus:border-blue-600"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-4 text-gray-500"
            >
              {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>
        </div>
      </div>

      {/* Register Button */}
      <button
        onClick={handleRegister}
        className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
      >
        Create account
      </button>

      {/* Divider */}
      <div className="my-5 flex items-center sm:my-6">
        <div className="h-px flex-1 bg-gray-300"></div>

        <span className="mx-4 text-sm text-gray-400">or</span>

        <div className="h-px flex-1 bg-gray-300"></div>
      </div>

      {/* Google */}
      <button
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 py-3 hover:bg-gray-50"
      >
        <FcGoogle size={22} />
        Sign up with Google
      </button>

      {/* Bottom */}
      <p className="mt-6 text-center text-gray-500 sm:mt-8">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showLogin())}
          className="cursor-pointer font-semibold text-blue-600"
        >
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
