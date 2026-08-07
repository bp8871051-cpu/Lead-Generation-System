"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard for single-company internal use
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 font-sans relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/80 border border-slate-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl text-center space-y-6"
      >
        <div className="w-16 h-16 bg-gradient-to-tr from-primary to-accent rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
          <Zap className="w-8 h-8 text-white" />
        </div>

        <div>
          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Internal Company CRM
          </span>
          <h1 className="text-2xl font-black tracking-tight mt-3 text-white">BLUEBOXX.DA PRIVATE LIMITED</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Enterprise B2B Prospecting, Lead Generation & Official Outreach System.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <Link 
            href="/dashboard"
            className="w-full py-3.5 px-6 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold text-xs shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 group"
          >
            Launch Internal Dashboard
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <Link 
            href="/login"
            className="w-full py-3 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-semibold text-xs transition-all block"
          >
            Admin Sign In
          </Link>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1"><Target className="w-3 h-3 text-emerald-400" /> Single Company Mode</span>
          <span>•</span>
          <span>Server `.env` Secured</span>
        </div>
      </motion.div>
    </div>
  );
}
