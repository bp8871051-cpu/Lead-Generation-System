"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ShieldCheck, Eye, EyeOff, Check, X, AlertCircle, ArrowRight, Loader2, Lock } from "lucide-react";
import { authService } from "@/services/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token provided. Please request a new password reset link.");
    }
  }, [token]);

  // Live Password Rules Checklist
  const rules = {
    minLength: newPassword.length >= 12,
    hasUpper: /[A-Z]/.test(newPassword),
    hasLower: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    passwordsMatch: newPassword.length > 0 && newPassword === confirmPassword,
  };

  const validCount = Object.values(rules).filter(Boolean).length;
  const strengthPercent = (validCount / 6) * 100;

  let strengthColor = "bg-rose-500";
  let strengthLabel = "Weak";
  if (strengthPercent >= 100) {
    strengthColor = "bg-emerald-500";
    strengthLabel = "Strong (Production Ready)";
  } else if (strengthPercent >= 60) {
    strengthColor = "bg-amber-500";
    strengthLabel = "Moderate";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!rules.minLength || !rules.hasUpper || !rules.hasLower || !rules.hasNumber || !rules.hasSpecial) {
      setError("Please ensure your new password satisfies all security rules.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword({ token, new_password: newPassword });
      authService.logout();
      router.push("/login?reset=success");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/25">
          <Lock className="w-7 h-7 text-white" />
        </div>
        <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-extrabold uppercase tracking-wider rounded-full inline-flex items-center gap-1 mt-2">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin Security Reset
        </span>
        <h1 className="text-2xl font-black tracking-tight text-white mt-1">Set New Admin Password</h1>
        <p className="text-xs text-slate-400">Enforce strong company security standards for your internal account.</p>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex gap-2 items-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
        {/* New Password */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5">
            New Admin Password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
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

        {/* Confirm Password */}
        <div>
          <label className="block text-[10px] uppercase font-extrabold text-slate-400 tracking-wider mb-1.5">
            Confirm Admin Password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-primary shadow-sm font-medium"
            />
          </div>
        </div>

        {/* Live Strength Meter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            <span>Password Strength:</span>
            <span className={strengthPercent >= 100 ? "text-emerald-400" : strengthPercent >= 60 ? "text-amber-400" : "text-rose-400"}>
              {strengthLabel}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full transition-all duration-300 ${strengthColor}`} 
              style={{ width: `${strengthPercent}%` }} 
            />
          </div>
        </div>

        {/* Rules Checklist */}
        <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-2 text-[11px]">
          <p className="font-extrabold uppercase text-[9.5px] text-slate-400 tracking-wider mb-1">Security Criteria</p>
          <div className="grid grid-cols-1 gap-1.5">
            <div className={`flex items-center gap-2 ${rules.minLength ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.minLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>At least 12 characters long</span>
            </div>
            <div className={`flex items-center gap-2 ${rules.hasUpper ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.hasUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>At least one uppercase letter (A-Z)</span>
            </div>
            <div className={`flex items-center gap-2 ${rules.hasLower ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.hasLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>At least one lowercase letter (a-z)</span>
            </div>
            <div className={`flex items-center gap-2 ${rules.hasNumber ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>At least one number (0-9)</span>
            </div>
            <div className={`flex items-center gap-2 ${rules.hasSpecial ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.hasSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>At least one special character (!@#$%^&*)</span>
            </div>
            <div className={`flex items-center gap-2 ${rules.passwordsMatch ? "text-emerald-400" : "text-slate-500"}`}>
              {rules.passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              <span>Passwords match</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || strengthPercent < 100}
          className="w-full py-3.5 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-xs mt-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Admin Password"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="pt-4 border-t border-slate-800/80 text-center">
        <Link href="/login" className="text-[11px] text-slate-400 hover:text-white transition-colors font-semibold">
          &larr; Back to Admin Sign In
        </Link>
      </div>
    </motion.div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans p-6 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <Suspense fallback={
        <div className="text-white text-xs font-bold flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading Password Reset Portal...
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
