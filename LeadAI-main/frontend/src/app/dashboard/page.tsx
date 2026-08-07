"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp, Users, Mail, MessageSquare, Calendar,
  Search, Zap, ChevronRight, Send, X, Link as LinkIcon, ListTodo, Target
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { analyticsService } from "@/services/api";
import Logo from "@/components/Logo";

// ── Inline SVG Area Chart ─────────────────────────────────────────────────────
function AreaChart() {
  const labels = ["May 4", "May 11", "May 18", "May 25", "Jun 1"];

  // Paths for four series (Leads Found, Emails Sent, Replies, Meetings)
  const series = [
    {
      label: "Leads Found",
      color: "#6366F1", // Indigo
      fill: "rgba(99,102,241,0.12)",
      points: [600, 900, 1100, 1600, 2000],
    },
    {
      label: "Emails Sent",
      color: "#14B8A6", // Teal
      fill: "rgba(20,184,166,0.10)",
      points: [400, 700, 850, 1200, 1500],
    },
    {
      label: "Replies",
      color: "#3B82F6", // Blue
      fill: "rgba(59,130,246,0.08)",
      points: [200, 350, 450, 700, 900],
    },
    {
      label: "Meetings",
      color: "#8B5CF6", // Violet
      fill: "rgba(139,92,246,0.07)",
      points: [50, 100, 150, 280, 400],
    },
  ];

  const W = 560;
  const H = 140;
  const PAD_L = 40;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 32;
  const maxVal = 2200;

  const xStep = (W - PAD_L - PAD_R) / (labels.length - 1);

  const toSVG = (points: number[]) =>
    points.map((v, i) => ({
      x: PAD_L + i * xStep,
      y: PAD_T + (H - PAD_T - PAD_B) * (1 - v / maxVal),
    }));

  const pathD = (pts: { x: number; y: number }[], closed = false) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cp1x} ${pts[i - 1].y}, ${cp1x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    if (closed) {
      const last = pts[pts.length - 1];
      const first = pts[0];
      d += ` L ${last.x} ${H - PAD_B} L ${first.x} ${H - PAD_B} Z`;
    }
    return d;
  };

  const yTicks = [0, 500, 1000, 1500, 2000];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        {series.map((s) => {
          const id = `grad-${s.label.replace(/\s+/g, '-')}`;
          return (
            <linearGradient key={s.label + "-g"} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Y-grid lines */}
      {yTicks.map((t) => {
        const y = PAD_T + (H - PAD_T - PAD_B) * (1 - t / maxVal);
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#E2E8F0" strokeWidth="0.8" strokeDasharray="3 3" />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize="8" fill="#94A3B8">{t === 0 ? "0" : t >= 1000 ? `${t / 1000}K` : t}</text>
          </g>
        );
      })}

      {/* X-labels */}
      {labels.map((l, i) => (
        <text key={l} x={PAD_L + i * xStep} y={H - PAD_B + 14} textAnchor="middle" fontSize="8" fill="#94A3B8">{l}</text>
      ))}

      {/* Fill areas (back to front) */}
      {[...series].reverse().map((s) => {
        const pts = toSVG(s.points);
        const id = `grad-${s.label.replace(/\s+/g, '-')}`;
        return (
          <path key={s.label + "-fill"} d={pathD(pts, true)} fill={`url(#${id})`} />
        );
      })}

      {/* Lines */}
      {series.map((s) => {
        const pts = toSVG(s.points);
        return (
          <path key={s.label + "-line"} d={pathD(pts)} fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
        );
      })}
    </svg>
  );
}

// ── Inline SVG Donut Chart ────────────────────────────────────────────────────
function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const R = 54;
  const r = 34;
  const cx = 70;
  const cy = 70;

  let cumAngle = -Math.PI / 2;
  const slices = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const startA = cumAngle;
    cumAngle += angle;
    return { ...seg, startA, endA: cumAngle, angle };
  });

  const arc = (sa: number, ea: number, large: boolean) => {
    const x1o = cx + R * Math.cos(sa);
    const y1o = cy + R * Math.sin(sa);
    const x2o = cx + R * Math.cos(ea);
    const y2o = cy + R * Math.sin(ea);
    const x1i = cx + r * Math.cos(ea);
    const y1i = cy + r * Math.sin(ea);
    const x2i = cx + r * Math.cos(sa);
    const y2i = cy + r * Math.sin(sa);
    const f = large ? 1 : 0;
    return `M ${x1o} ${y1o} A ${R} ${R} 0 ${f} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${r} ${r} 0 ${f} 0 ${x2i} ${y2i} Z`;
  };

  return (
    <svg viewBox="0 0 140 140" className="w-28 h-28 shrink-0">
      {slices.map((s) => (
        <path
          key={s.label}
          d={arc(s.startA, s.endA, s.angle > Math.PI)}
          fill={s.color}
          className="hover:opacity-80 transition-opacity cursor-pointer"
        />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="14" fontWeight="900" fill="#0F172A">{total.toLocaleString()}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#94A3B8">Total Leads</text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CAMPAIGNS: any[] = [];

const INDUSTRIES: any[] = [];

const ACTIVITY: any[] = [];

const DONUT_SEGMENTS: any[] = [];

const ONBOARDING_STEPS = [
  {
    title: "Welcome to LeadAI",
    desc: "Your new command center for outbound sales. Let's take a quick tour of how you can start generating high-quality leads in minutes.",
    icon: Target,
    color: "text-primary"
  },
  {
    title: "Step 1: Scan Directories",
    desc: "Head over to the 'Search Leads' page. Enter a city and category, and our AI will scan Google Maps to find hundreds of local businesses instantly.",
    icon: Search,
    color: "text-violet-500"
  },
  {
    title: "Step 2: Deep Scrape Links",
    desc: "Have a specific directory like GIDC? Use the 'Custom Scraper' to paste the URL, and our AI will crawl the inner pages to extract hidden contact info.",
    icon: LinkIcon,
    color: "text-accent"
  },
  {
    title: "Step 3: Manage & Export",
    desc: "All your found businesses go to 'My Leads'. From there, you can view their AI-generated SWOT analysis, select the best ones, and export them.",
    icon: ListTodo,
    color: "text-emerald-500"
  }
];

function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) setStep(step + 1);
    else onClose();
  };

  const curr = ONBOARDING_STEPS[step];
  const Icon = curr.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>
        
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors z-10">
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pt-10 text-center flex-1">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <div className={`w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 shadow-sm border border-slate-100`}>
              {step === 0 ? <Logo size={40} /> : <Icon className={`w-8 h-8 ${curr.color}`} />}
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-3">{curr.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed max-w-[280px]">{curr.desc}</p>
          </motion.div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-1.5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-primary" : "w-1.5 bg-slate-200"}`} />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm transition-all hover:scale-[1.02]"
          >
            {step === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next Step"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  const handleCloseWelcome = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("leadai_welcome_seen", "true");
    }
    setShowWelcome(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await analyticsService.getDashboardStats();
        setStats(data);
        const hasSeenWelcome = typeof window !== "undefined" && localStorage.getItem("leadai_welcome_seen");
        if (data.total_leads === 0 && !hasSeenWelcome) {
          setShowWelcome(true);
        }
      } catch {
        setStats({ total_leads: 0, today_leads: 0, unique_leads: 0, duplicate_count: 0, website_missing: 0, avg_website_score: 0, high_priority_leads: 0, average_rating: 4.2 });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const isEmpty = stats?.total_leads === 0;

  return (
    <div className="space-y-6 font-sans">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Prospecting &amp; Campaign Hub</h1>
          <p className="text-sm text-slate-500 mt-0.5">Find, connect and convert high-quality leads with AI-powered automation.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href="/dashboard/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-xl shadow-sm shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            Scan Directory
          </Link>
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-semibold rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Zap className="w-4 h-4 text-slate-400" />
            Bulk Actions
          </Link>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Total Scraped Leads</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{isEmpty ? 0 : (stats?.total_leads || 0).toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] flex items-center gap-1 text-emerald-600 font-semibold">
            {isEmpty ? "Ready to run" : <><TrendingUp className="w-3 h-3" /> {stats?.today_leads || 0} scraped today</>}
          </p>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Unique Leads (Deduplicated)</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{isEmpty ? 0 : (stats?.unique_leads || stats?.total_leads || 0).toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-emerald-600 font-semibold">
            ✓ {stats?.duplicate_count || 0} duplicates automatically purged
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold">Website Missing / Poor</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{isEmpty ? 0 : (stats?.website_missing || 0)}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
            Avg Website Health: <span className="font-extrabold text-indigo-600">{stats?.avg_website_score || 0}/100</span>
          </p>
        </div>

        {/* Card 4 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-400 font-semibold">High Priority Leads</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{isEmpty ? 0 : (stats?.high_priority_leads || stats?.hot_leads || 0)}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] flex items-center gap-1 text-slate-500 font-semibold">
            Avg Rating: <span className="text-amber-500 font-bold">★ {stats?.average_rating || 4.2}</span>
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-sm text-center flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">Your workspace is empty!</h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            You haven't run any searches or saved any leads yet. Let's find your first batch of high-quality local business prospects.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/search"
              className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all hover:scale-105"
            >
              Run Your First Search
            </Link>
            <Link
              href="/dashboard/scraper"
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all hover:scale-105"
            >
              Scrape a Directory
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* ── Row 2: Area Chart + Active Campaigns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Lead Performance Overview</h2>
            <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md font-semibold">Last 30 Days ▾</span>
          </div>
          <div className="h-[140px]">
            <AreaChart />
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {[
              { label: "Leads Found", color: "#6366F1" },
              { label: "Emails Sent", color: "#14B8A6" },
              { label: "Replies", color: "#3B82F6" },
              { label: "Meetings", color: "#8B5CF6" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Active Campaigns</h2>
            <Link href="/dashboard/emails" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {CAMPAIGNS.length > 0 ? CAMPAIGNS.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                    <Send className={`w-4 h-4 ${c.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{c.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{c.opens}% Opens · {c.replies}% Replies</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-black text-slate-900">{c.leads}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{c.status}</span>
                </div>
              </div>
            )) : (
              <div className="text-xs text-slate-400 text-center py-6">No campaigns yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Donut + Industries + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Lead Status Donut */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Lead Status Distribution</h2>
          <div className="flex items-center gap-4">
            {DONUT_SEGMENTS.length > 0 ? (
              <>
                <DonutChart segments={DONUT_SEGMENTS} />
                <div className="space-y-2 flex-1">
                  {DONUT_SEGMENTS.map((seg) => {
                    const total = DONUT_SEGMENTS.reduce((s, x) => s + x.value, 0);
                    const pct = ((seg.value / total) * 100).toFixed(1);
                    return (
                      <div key={seg.label} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-slate-700 truncate">{seg.label}</p>
                          <p className="text-[10px] text-slate-400">{seg.value.toLocaleString()} ({pct}%)</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400 text-center py-6 w-full">No leads saved yet.</div>
            )}
          </div>
        </div>

        {/* Top Industries */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Top Industries</h2>
            <Link href="/dashboard/leads" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {INDUSTRIES.length > 0 ? INDUSTRIES.map((ind) => (
              <div key={ind.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-700 font-medium">
                    <span>{ind.icon}</span>
                    {ind.name}
                  </span>
                  <span className="font-bold text-slate-900">{ind.pct}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${ind.pct}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="text-xs text-slate-400 text-center py-6 w-full">No industries data.</div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Recent Activity</h2>
            <Link href="/dashboard/leads" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-3">
            {ACTIVITY.length > 0 ? ACTIVITY.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">{a.label}</p>
                    <p className="text-[10px] text-slate-400 truncate">{a.sub}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">{a.time}</span>
                </div>
              );
            }) : (
              <div className="text-xs text-slate-400 text-center py-6 w-full">No recent activity.</div>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      <AnimatePresence>
        {showWelcome && <WelcomeModal onClose={handleCloseWelcome} />}
      </AnimatePresence>
    </div>
  );
}
