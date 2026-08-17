import React, { useState, useEffect } from 'react';
import { emailService, adminService } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Mail, Send, CheckCircle, AlertCircle, RefreshCw, Plus, ShieldCheck } from 'lucide-react';

export const EmailOutreach: React.FC = () => {
  const { user } = useAuth();
  const [senders, setSenders] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New campaign modal state
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignBody, setCampaignBody] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const loadOutreachData = async () => {
    setLoading(true);
    try {
      const [sData, cData] = await Promise.all([
        emailService.getActiveSenders(),
        emailService.getCampaigns()
      ]);
      setSenders(sData || []);
      setCampaigns(cData || []);
    } catch (err: any) {
      console.error('Failed to load outreach data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOutreachData();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;
    try {
      await emailService.createCampaign({
        name: campaignName,
        subject: campaignSubject,
        body_template: campaignBody
      });
      setStatusMsg('Campaign created successfully!');
      setCampaignName('');
      setCampaignSubject('');
      setCampaignBody('');
      loadOutreachData();
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Outreach & Email Campaigns</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure active employee senders, draft campaigns, and dispatch transactional outreach emails via standard SMTP.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs">
          {statusMsg}
        </div>
      )}

      {/* Active Sender Accounts & SMTP Status */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Active Employee Email Senders</span>
          </h2>
          <button
            onClick={loadOutreachData}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {senders.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
            No employee email accounts currently active. Configure your SMTP credentials in Admin Settings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {senders.map((s) => (
              <div key={s.employee_id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">{s.sender_name}</div>
                  <div className="text-[11px] text-slate-400">{s.email}</div>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 mt-1">
                    {s.provider}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  Active Sender
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Campaigns Grid & Create Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Campaign Form */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Create New Email Campaign</span>
          </h2>

          <form onSubmit={handleCreateCampaign} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Campaign Name</label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q3 Website Redesign Outreach"
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email Subject</label>
              <input
                type="text"
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full glass-input px-3 py-2 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Body Template</label>
              <textarea
                rows={5}
                value={campaignBody}
                onChange={(e) => setCampaignBody(e.target.value)}
                placeholder="Campaign email body text..."
                className="w-full glass-input p-3 rounded-xl text-xs"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all"
            >
              Save Campaign
            </button>
          </form>
        </div>

        {/* Existing Campaigns List */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-400" />
            <span>Active & Draft Campaigns</span>
          </h2>

          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-200">{c.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{c.subject || 'No Subject'}</div>
                  <div className="text-[10px] text-slate-500 mt-1">Created: {new Date(c.created_at).toLocaleDateString()}</div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-bold">
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
