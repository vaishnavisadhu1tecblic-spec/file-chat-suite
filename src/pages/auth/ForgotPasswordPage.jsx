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

  const [status, setStatus] = useState({
    type: "",
    message: "",
  });

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
      setStatus({
        type: "error",
        message: "Enter a valid email address.",
      });
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
      setStatus({
        type: "error",
        message: "Confirm your new password.",
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({
        type: "error",
        message: "Passwords do not match.",
      });
      return;
    }

    setIsLoading(true);
    setStatus({
      type: "",
      message: "",
    });

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
    <div className="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#faf8ff] px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-8 md:p-10">
        {/* Heading */}
        <h1 className="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
          Forgot Password?
        </h1>

        <p className="mt-2 mb-6 text-sm leading-5 text-gray-500 sm:mb-8 sm:text-base">
          Enter your account details to create a new password.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <label
            className="mb-2 block text-sm text-gray-700 sm:text-base"
            htmlFor="reset-email"
          >
            Email
          </label>

          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
            autoComplete="email"
            disabled={status.type === "success"}
          />

          {/* New Password */}
          <label
            className="mt-5 mb-2 block text-sm text-gray-700 sm:text-base"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
              autoComplete="new-password"
              disabled={isFormDisabled || status.type === "success"}
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

          {/* Password Requirements */}
          <div className="mt-3 rounded-xl bg-gray-50 p-3 sm:p-4">
            <p className="mb-2 text-xs font-semibold text-gray-700 sm:text-sm">
              Password must contain:
            </p>

            <div className="space-y-1.5">
              {requirementsStatus.map((requirement) => (
                <div
                  key={requirement.label}
                  className={`flex items-center gap-2 text-xs sm:text-sm ${
                    requirement.valid ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {requirement.valid ? <FiCheck /> : <FiCircle />}

                  <span>{requirement.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <label
            className="mt-5 mb-2 block text-sm text-gray-700 sm:text-base"
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
              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-blue-600 sm:px-4 sm:py-3 sm:text-base"
              autoComplete="new-password"
              disabled={isFormDisabled || status.type === "success"}
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

          {/* Password mismatch */}
          {passwordsMismatch && (
            <p className="mt-2 text-xs text-red-600 sm:text-sm" role="alert">
              Passwords do not match.
            </p>
          )}

          {/* Token checking */}
          {isCheckingToken && (
            <p className="mt-3 text-xs text-gray-500 sm:text-sm" role="status">
              Checking your reset link...
            </p>
          )}

          {/* Status */}
          {status.message && (
            <p
              className={`mt-3 text-xs leading-5 sm:text-sm ${
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

          {/* Submit */}
          <button
            type="submit"
            disabled={isFormDisabled || status.type === "success"}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
          >
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {/* Back to Login */}
        {status.type === "success" ? (
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="mt-5 w-full text-sm font-semibold text-blue-600 hover:underline sm:mt-6 sm:text-base"
          >
            Back to Login
          </button>
        ) : (
          <p className="mt-6 text-center text-xs text-gray-500 sm:mt-8 sm:text-sm">
            <Link
              to="/login"
              className="font-semibold text-blue-600 hover:underline"
            >
              Back to Login
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
