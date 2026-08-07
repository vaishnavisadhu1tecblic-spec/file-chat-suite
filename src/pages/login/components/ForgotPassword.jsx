function ForgotPassword({ setPage }) {
  return (
    <div className="bg-white p-8 rounded-2xl">
      <h2 className="text-3xl font-bold text-black mb-5">Forgot Password</h2>

      <input
        placeholder="Enter Email"
        className="w-full border p-3 rounded-lg mb-4"
      />

      <button className="w-full bg-blue-600 text-white p-3 rounded-lg">
        Send Link
      </button>

      <p className="text-center mt-4 text-black">
        Back to
        <span
          onClick={() => setPage("login")}
          className="text-blue-600 cursor-pointer"
        >
          Login
        </span>
      </p>
    </div>
  );
}

export default ForgotPassword;
