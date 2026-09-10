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
    <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
      {/* Heading */}
      <h1 className="text-4xl font-bold text-gray-900">Create your account</h1>

      <p className="text-gray-500 mt-2 mb-8">
        Free for teams up to 5 people. No card required.
      </p>

      {/* Upload Image */}
      <div className="border border-gray-200 rounded-2xl p-4 flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
          AM
        </div>

        <div className="flex-1">
          <h3 className="font-medium text-gray-800">Profile image</h3>

          <p className="text-sm text-gray-500 mb-2">PNG or JPG, up to 4 MB</p>

          <label className="inline-flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-50">
            <FiUpload />
            Upload
            <input type="file" className="hidden" onChange={handleImage} />
          </label>
        </div>
      </div>

      {/* Full Name & Username */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-gray-700 mb-2">Full name</label>

          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Alina Meyer"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">Username</label>

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="alina"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2">Email</label>

        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
        />
      </div>

      {/* Passwords */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <label className="block text-gray-700 mb-2">Password</label>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 outline-none focus:border-blue-600"
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
          <label className="block text-gray-700 mb-2">Confirm password</label>

          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 outline-none focus:border-blue-600"
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
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
      >
        Create account
      </button>

      {/* Divider */}
      <div className="flex items-center my-6">
        <div className="flex-1 h-px bg-gray-300"></div>

        <span className="mx-4 text-gray-400 text-sm">or</span>

        <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      {/* Google */}
      <button
        type="button"
        className="w-full border border-gray-300 rounded-xl py-3 flex items-center justify-center gap-3 hover:bg-gray-50"
      >
        <FcGoogle size={22} />
        Sign up with Google
      </button>

      {/* Bottom */}
      <p className="text-center text-gray-500 mt-8">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => dispatch(showLogin())}
          className="text-blue-600 font-semibold cursor-pointer"
        >
          Login
        </button>
      </p>
    </div>
  );
}

export default Register;
