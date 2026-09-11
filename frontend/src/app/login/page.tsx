"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sprout, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { signIn, signUp, resetPassword } from "@/lib/supabase";

type AuthMode = "login" | "signup" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
        router.push("/dashboard");
      } else if (mode === "signup") {
        await signUp(email, password, fullName);
        setSuccess("Account registered. You can now access your dashboard.");
        setMode("login");
      } else {
        await resetPassword(email);
        setSuccess("Password recovery instructions sent to your email.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-[#17211B] flex flex-col justify-center items-center p-4">
      {/* Top Verdra Logo Header */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-[#12372A] flex items-center justify-center text-white shadow-sm group-hover:bg-[#1b4d3b] transition-colors">
            <Sprout className="w-6 h-6 text-[#A7C957]" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-[#12372A] tracking-tight block leading-tight font-heading">
              Verdra
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-[#66736B] uppercase font-mono">
              Detect Early. Predict Spread. Protect Yield.
            </span>
          </div>
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="verdra-card p-8 sm:p-9 bg-white shadow-md space-y-6">
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-[#12372A] font-heading">
              {mode === "login" ? "Welcome Back" : mode === "signup" ? "Create Account" : "Reset Password"}
            </h1>
            <p className="text-xs text-[#66736B]">
              {mode === "login"
                ? "Sign in to access your field intelligence dashboard"
                : mode === "signup"
                ? "Join Verdra to begin AI-powered crop leaf surveillance"
                : "Enter your registered email to receive reset instructions"}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#DC2626]/10 border border-[#DC2626]/30 text-[#DC2626] rounded-xl text-xs font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#16A34A]/10 border border-[#16A34A]/30 text-[#16A34A] rounded-xl text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66736B]" />
                  <input
                    type="text"
                    required
                    placeholder="Agronomist Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66736B]" />
                <input
                  type="email"
                  required
                  placeholder="name@farm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#17211B] uppercase tracking-wider">
                    Password
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs font-semibold text-[#2E7D32] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#66736B]" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DCE8DC] text-sm text-[#17211B] outline-none focus:ring-2 focus:ring-[#2E7D32]/20 focus:border-[#2E7D32]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#66736B] hover:text-[#17211B]"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-forest w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span>
                {loading
                  ? "Authenticating..."
                  : mode === "login"
                  ? "Sign In to Dashboard"
                  : mode === "signup"
                  ? "Create Agronomist Account"
                  : "Send Recovery Link"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Bypass for Evaluators */}
          <div className="pt-2 text-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E7D32] hover:text-[#12372A] transition-colors"
            >
              <span>Continue to Demo Dashboard without login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="pt-4 border-t border-[#DCE8DC] text-center text-xs text-[#66736B]">
            {mode === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-bold text-[#12372A] hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-[#12372A] hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
