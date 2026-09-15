import { useEffect, useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FiCheck, FiCircle } from "react-icons/fi";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  requestPasswordReset,
  resetPassword,
  validateResetToken,
} from "../../api/authApi";

const passwordRequirements = [
  { label: "At least 8 characters", isValid: (value) => value.length >= 8 },
  { label: "One uppercase letter", isValid: (value) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", isValid: (value) => /[a-z]/.test(value) },
  { label: "One number", isValid: (value) => /\d/.test(value) },
];

function ForgotPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = new URLSearchParams(location.search).get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(Boolean(token));
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      setIsCheckingToken(false);
      setIsTokenValid(false);
      return () => {
        isMounted = false;
      };
    }

    const checkToken = async () => {
      try {
        await validateResetToken(token);

        if (isMounted) {
          setIsTokenValid(true);
          setIsCheckingToken(false);
        }
      } catch (error) {
        console.error("Forgot password token validation failed:", error);

        if (isMounted) {
          setIsTokenValid(false);
          setIsCheckingToken(false);
          setStatus({
            type: "error",
            message:
              error.response?.data?.message ||
              "This reset link is invalid or has expired.",
          });
        }
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const requirementsStatus = passwordRequirements.map((requirement) => ({
    ...requirement,
    valid: requirement.isValid(password),
  }));
  const isPasswordValid = requirementsStatus.every(
    (requirement) => requirement.valid,
  );
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatus({ type: "error", message: "Enter a valid email address." });
      return;
    }

    if (!isPasswordValid) {
      setStatus({
        type: "error",
        message: "Please meet all password requirements.",
      });
      return;
    }

    if (!confirmPassword) {
      setStatus({ type: "error", message: "Confirm your new password." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Passwords do not match." });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      if (!token) {
        const response = await requestPasswordReset(normalizedEmail);
        setPassword("");
        setConfirmPassword("");
        setStatus({
          type: "info",
          message:
            response.data.message ||
            "If an account exists for this email, a password reset link has been sent.",
        });
        return;
      }

      if (!isTokenValid) {
        setStatus({
          type: "error",
          message: "This reset link is invalid or has expired.",
        });
        return;
      }

      const response = await resetPassword(token, {
        email: normalizedEmail,
        password,
        confirmPassword,
      });

      setPassword("");
      setConfirmPassword("");
      setIsTokenValid(false);
      setStatus({
        type: "success",
        message:
          response.data.message || "Your password has been reset successfully.",
      });
    } catch (error) {
      console.error("Forgot password submission failed:", error);
      setStatus({
        type: "error",
        message:
          error.response?.data?.message ||
          "Unable to complete password recovery. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormDisabled =
    isLoading || isCheckingToken || (Boolean(token) && !isTokenValid);

  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-6 py-10">
      <div className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900">Forgot Password?</h1>
        <p className="text-gray-500 mt-2 mb-8">
          Enter your account details to create a new password.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="block text-gray-700 mb-2" htmlFor="reset-email">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600"
            autoComplete="email"
            disabled={status.type === "success"}
          />

          <label
            className="block text-gray-700 mb-2 mt-5"
            htmlFor="new-password"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter new password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 outline-none focus:border-blue-600"
              autoComplete="new-password"
              disabled={isFormDisabled || status.type === "success"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-4 text-gray-500"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">
              Password must contain:
            </p>
            <div className="space-y-1">
              {requirementsStatus.map((requirement) => (
                <div
                  key={requirement.label}
                  className={`flex items-center gap-2 text-xs ${
                    requirement.valid ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {requirement.valid ? <FiCheck /> : <FiCircle />}
                  <span>{requirement.label}</span>
                </div>
              ))}
            </div>
          </div>

          <label
            className="block text-gray-700 mb-2 mt-5"
            htmlFor="confirm-password"
          >
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-10 outline-none focus:border-blue-600"
              autoComplete="new-password"
              disabled={isFormDisabled || status.type === "success"}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-4 text-gray-500"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <FaRegEyeSlash /> : <FaRegEye />}
            </button>
          </div>

          {passwordsMismatch && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              Passwords do not match.
            </p>
          )}

          {isCheckingToken && (
            <p className="mt-3 text-sm text-gray-500" role="status">
              Checking your reset link...
            </p>
          )}

          {status.message && (
            <p
              className={`mt-3 text-sm ${
                status.type === "success"
                  ? "text-green-600"
                  : status.type === "info"
                    ? "text-blue-600"
                    : "text-red-600"
              }`}
              role="status"
            >
              {status.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isFormDisabled || status.type === "success"}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold mt-6 hover:bg-blue-700 disabled:opacity-60"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {status.type === "success" ? (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="w-full text-blue-600 font-semibold mt-6"
          >
            Back to Login
          </button>
        ) : (
          <p className="text-center text-gray-500 mt-8">
            <Link to="/login" className="text-blue-600 font-semibold">
              Back to Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
