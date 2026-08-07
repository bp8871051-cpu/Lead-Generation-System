"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Mail, Send, Sparkles, MessageSquare, AlertCircle, Plus, 
  Trash2, Play, Eye, RefreshCcw, Loader2, BarChart2, X, ArrowLeft
} from "lucide-react";
import { emailService } from "@/services/api";

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New campaign modal state
  const [showModal, setShowModal] = useState(false);
  const [campName, setCampName] = useState("");
  const [subjectTemplate, setSubjectTemplate] = useState("");
  const [bodyTemplate, setBodyTemplate] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadPipeline = () => {
    loadCampaigns();
  };

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await emailService.getCampaigns();
      setCampaigns(data || []);
    } catch (err) {
      console.error(err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName.trim()) return;
    setCreating(true);
    try {
      const newCamp = await emailService.createCampaign({
        name: campName,
        subject: subjectTemplate,
        body_template: bodyTemplate
      });
      setCampaigns(prev => [newCamp, ...prev]);
      setShowModal(false);
      setCampName("");
      setSubjectTemplate("");
      setBodyTemplate("");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };


  return (
    <div className="space-y-8 font-sans relative">
      {/* Title & Back to Home */}
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-colors font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Step 2: Outreach Campaigns</h1>
            <p className="text-slate-500 text-sm mt-1">Configure email templates and monitor real-time open and reply rates.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Campaign
            </button>
            <button
              onClick={loadCampaigns}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-sm hover:shadow transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Campaigns Telemetry */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sent Emails</span>
          <div className="mt-3 flex items-center justify-between">
            <h4 className="text-2xl font-black text-slate-950">144</h4>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">SMTP active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Open Rate</span>
          <div className="mt-3 flex items-center justify-between">
            <h4 className="text-2xl font-black text-slate-950">62.4%</h4>
            <span className="text-[9px] bg-blue-50 text-primary px-1.5 py-0.5 rounded font-bold">&ge; industry avg</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Response Reply Rate</span>
          <div className="mt-3 flex items-center justify-between">
            <h4 className="text-2xl font-black text-slate-950">18.2%</h4>
            <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-bold">19 replies</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Click-Through</span>
          <div className="mt-3 flex items-center justify-between">
            <h4 className="text-2xl font-black text-slate-950">35.8%</h4>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Link track</span>
          </div>
        </div>
      </div>

      {/* Main campaigns table list */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-premium flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold">Loading active sequences...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-premium">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">No active campaigns</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Create an outreach campaign above to start sending sequences to your saved directory leads.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">Displaying {campaigns.length} Outreach Campaigns</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/20">
                  <th className="px-6 py-3.5">Campaign Name</th>
                  <th className="px-6 py-3.5">Subject Template</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Sent Count</th>
                  <th className="px-6 py-3.5">Open Rate</th>
                  <th className="px-6 py-3.5">Reply Rate</th>
                  <th className="px-6 py-3.5 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {campaigns.map((camp) => {
                  const openPercent = camp.sent > 0 ? Math.round((camp.opens / camp.sent) * 100) : 0;
                  const replyPercent = camp.sent > 0 ? Math.round((camp.replies / camp.sent) * 100) : 0;
                  
                  let statusBadge = "bg-slate-100 text-slate-600 border-slate-200";
                  if (camp.status === "Active") statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  else if (camp.status === "Paused") statusBadge = "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{camp.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px] max-w-[220px] truncate">{camp.subject}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 border rounded-full text-[9px] font-bold uppercase tracking-wider ${statusBadge}`}>
                          {camp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{camp.sent}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{openPercent}%</span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${openPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{replyPercent}%</span>
                          <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden hidden sm:block">
                            <div className="bg-accent h-full rounded-full" style={{ width: `${replyPercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        {new Date(camp.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Campaign Modal */}
      {showModal && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-2xl shadow-2xl z-50 border border-slate-200 p-6 space-y-5 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-primary" />
                Create Outreach Campaign
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-150 rounded text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  placeholder="e.g. Dentists Mobile Design Outbound"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Subject Line Template (Use variable tag: <code className="text-primary font-mono">{`{business_name}`}</code>)
                </label>
                <input
                  type="text"
                  required
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  placeholder="Website & booking mockups for {business_name}"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Outbound Email Body Template (Variable tags: <code className="text-primary font-mono">{`{business_name}`}</code>, <code className="text-primary font-mono">{`{industry}`}</code>)
                </label>
                <textarea
                  required
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  placeholder="Hi Manager, we audited local {industry} profiles..."
                  className="w-full h-32 p-3 border border-slate-200 rounded-xl focus:outline-none focus:border-primary bg-white shadow-sm font-sans text-slate-900 font-medium"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-sm"
                >
                  {creating ? "Creating Campaign..." : "Launch Campaign"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

    </div>
  );
}
