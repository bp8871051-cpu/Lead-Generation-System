"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, KeyRound, AlertCircle, ArrowRight, ShieldCheck, Eye, EyeOff, Building2, X, Check, Loader2 } from "lucide-react";
import { authService } from "@/services/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("admin@company.internal");
  const [password, setPassword] = useState("adminpassword123");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("admin@company.internal");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<{ message: string; resetUrl?: string } | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await authService.login({ email, password });
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res: any = await authService.forgotPassword(forgotEmail);
      setForgotSuccess({
        message: res.message || `Password reset link generated for ${forgotEmail}.`,
        resetUrl: res.reset_url
      });
    } catch (err: any) {
      setForgotError(err.message || "Admin account not found.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/25">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider rounded-full inline-flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Internal Company Portal
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">Company LeadAI Admin</h1>
          <p className="text-xs text-slate-400">Sign in to access your internal lead generation pipeline.</p>
        </div>

        {resetSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex gap-2 items-center">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Password updated successfully. Please sign in with your new password.</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2 items-center">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@company.internal"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary shadow-sm font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                Admin Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(true);
                  setForgotError(null);
                  setForgotSuccess(null);
                }}
                className="text-[11px] text-primary hover:text-primary-light font-bold transition-colors"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary shadow-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-xs mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Lead Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800/80 text-center">
          <p className="text-[10.5px] text-slate-500">
            Internal Tool Only • Strictly Confidential Company Access
          </p>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-xs relative"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>

              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider">
                  Admin Account Recovery
                </span>
                <h3 className="text-xl font-extrabold text-white mt-2">Forgot Admin Password?</h3>
                <p className="text-slate-400 text-xs mt-1">
                  Enter your company admin email address to receive a 15-minute secure password reset link.
                </p>
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{forgotSuccess.message}</span>
                  </div>
                  {forgotSuccess.resetUrl && (
                    <div className="pt-2 border-t border-emerald-500/20">
                      <p className="text-[10.5px] text-slate-300">Direct Link (Server SMTP Auto Sent):</p>
                      <Link 
                        href={forgotSuccess.resetUrl}
                        onClick={() => setShowForgotModal(false)}
                        className="text-[11px] text-sky-400 hover:underline break-all block font-mono mt-1"
                      >
                        {forgotSuccess.resetUrl}
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSendResetLink} className="space-y-4 font-semibold">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5">
                    Company Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@company.internal"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary shadow-sm font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-md shadow-primary/20 transition-all flex items-center gap-2"
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-6 text-white text-xs font-bold flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Admin Portal...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

