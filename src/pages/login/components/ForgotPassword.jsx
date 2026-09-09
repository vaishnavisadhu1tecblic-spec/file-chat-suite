import { useState } from "react";

function ForgotPassword({ setPage }) {
  const [email, setEmail] = useState("");

  const handleSendLink = () => {
    if (!email.trim()) {
      alert("Enter your email to reset the password.");
      return;
    }

    alert("Password reset link sent to your email.");
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md">
      <h2 className="text-3xl font-bold text-black mb-5">Forgot Password</h2>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter Email"
        className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-600 mb-4"
      />

      <button
        type="button"
        onClick={handleSendLink}
        className="w-full bg-blue-600 text-white p-3 rounded-xl font-semibold"
      >
        Send Link
      </button>

      <p className="text-center mt-4 text-black">
        Back to
        <span
          onClick={() => setPage("login")}
          className="text-blue-600 cursor-pointer ml-2"
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default ForgotPassword;
