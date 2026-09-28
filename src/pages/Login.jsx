import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const Login = () => {
  const [loginMethod, setLoginMethod] = useState("pin"); // "pin" | "otp"
  const [mobile, setMobile] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [step, setStep] = useState("email"); // "email" | "otp"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handlePinLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login-pin", { mobile, pin });
      const { token, ...userData } = res.data;
      login(userData, token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid Mobile Number or PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/auth/request-otp", { email });
      setMessage(res.data.message || "OTP sent");
      setStep("otp");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      const { token, ...userData } = res.data;
      login(userData, token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-farm-50 to-farm-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-farm-600 rounded-xl mx-auto mb-3 flex items-center justify-center text-white text-2xl shadow-md">
            🌾
          </div>
          <h1 className="text-xl font-bold text-gray-800">Farmhouse Management</h1>
          <p className="text-xs text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Tab Selection: Mobile + PIN vs Email OTP */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setLoginMethod("pin"); setError(""); }}
            className={`flex-1 py-2 rounded-lg transition ${loginMethod === "pin" ? "bg-white text-farm-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            📱 Mobile + PIN
          </button>
          <button
            type="button"
            onClick={() => { setLoginMethod("otp"); setError(""); }}
            className={`flex-1 py-2 rounded-lg transition ${loginMethod === "otp" ? "bg-white text-farm-700 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            ✉️ Email OTP
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {message && step === "otp" && loginMethod === "otp" && (
          <div className="mb-4 bg-farm-50 border border-farm-100 text-farm-700 text-xs rounded-lg px-3 py-2">
            {message}
          </div>
        )}

        {loginMethod === "pin" ? (
          <form onSubmit={handlePinLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
              <input
                type="tel"
                required
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">4-Digit Security PIN</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  required
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-sm tracking-[0.3em] font-bold focus:outline-none focus:ring-2 focus:ring-farm-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-base leading-none p-1 focus:outline-none"
                  title={showPin ? "Hide PIN" : "Show PIN"}
                >
                  {showPin ? "👁️" : "🙈"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm mt-2 transition"
            >
              {loading ? "Signing in..." : "Login with PIN"}
            </button>
          </form>
        ) : step === "email" ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength={6}
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm tracking-[0.5em] text-center font-semibold focus:outline-none focus:ring-2 focus:ring-farm-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-farm-600 hover:bg-farm-700 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition"
            >
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-farm-600 text-xs font-medium py-1 hover:underline text-center block"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;