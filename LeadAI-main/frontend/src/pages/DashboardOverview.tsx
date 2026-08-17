import React, { useState, useEffect } from 'react';
import { analyticsService, leadsService } from '../api/services';
import { StatCard } from '../components/StatCard';
import { LeadTable } from '../components/LeadTable';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Globe,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  RefreshCw,
  Mail,
  Download
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [sData, lData] = await Promise.all([
        analyticsService.getDashboardStats(),
        leadsService.getLeads({ limit: 5, sort_by: 'created_at', order: 'desc' })
      ]);
      setStats(sData);
      setRecentLeads(lData.leads || []);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none"></div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Lead Intelligence Engine Active</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Lead Generation & Audit Dashboard
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Real-time business lead discovery, website technical security audits, automated deduplication, and AI cold email outreach.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={loadDashboard}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/dashboard/search')}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Start Discovery Scan</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads Discovered"
          value={stats?.total_leads || 0}
          icon={Users}
          change="+18%"
          color="purple"
          subtext={`${stats?.today_leads || 0} discovered today`}
        />
        <StatCard
          title="Unique Verified Leads"
          value={stats?.unique_leads || 0}
          icon={ShieldCheck}
          color="blue"
          subtext={`${stats?.duplicate_count || 0} duplicates auto-filtered`}
        />
        <StatCard
          title="Missing Website Leads"
          value={stats?.website_missing || 0}
          icon={Globe}
          color="amber"
          subtext="High Priority Web Build Prospects"
        />
        <StatCard
          title="Pipeline Conversion Rate"
          value={`${stats?.conversion_rate || 0}%`}
          icon={TrendingUp}
          color="emerald"
          subtext={`${stats?.hot_leads || 0} Hot Lead Opportunities`}
        />
      </div>

      {/* Analytics Charts & Distributions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Lead Growth Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>7-Day Business Lead Discovery Trend</span>
              </h2>
              <p className="text-[11px] text-slate-400">Daily volume of newly scraped business leads</p>
            </div>
            <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
              Live Scraper Metrics
            </span>
          </div>

          <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2">
            {stats?.daily_leads?.map((day: any, idx: number) => {
              const maxVal = Math.max(...(stats?.daily_leads?.map((d: any) => d.count) || [1]), 10);
              const heightPct = Math.max(15, (day.count / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.count}
                  </div>
                  <div className="w-full bg-slate-800/80 rounded-xl relative overflow-hidden flex items-end h-32">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-purple-600 via-indigo-600 to-cyan-400 rounded-xl transition-all duration-500 group-hover:brightness-125"
                    ></div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lead Score & Industry Distribution */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Lead Quality Score Distribution</span>
            </h2>

            <div className="space-y-3">
              {stats?.score_distribution?.map((item: any, idx: number) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-300">{item.range}</span>
                    <span className="text-purple-400 font-bold">{item.count}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (item.count / Math.max(stats.total_leads || 1, 1)) * 100)}%` }}
                      className={`h-full rounded-full ${
                        idx === 4 ? 'bg-emerald-400' : idx === 3 ? 'bg-purple-400' : idx === 2 ? 'bg-blue-400' : 'bg-slate-600'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Average Website Score</span>
              <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {stats?.avg_website_score || 65}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Discovered Leads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-tight">Recent High-Value Prospects</h2>
            <p className="text-xs text-slate-400">Top businesses discovered by the automated lead engine</p>
          </div>

          <button
            onClick={() => navigate('/dashboard/leads')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Saved Leads</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <LeadTable leads={recentLeads} isLoading={loading} />
      </div>
    </div>
  );
};
