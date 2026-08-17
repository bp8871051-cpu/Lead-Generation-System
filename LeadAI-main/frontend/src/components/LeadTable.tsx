import React, { useState } from 'react';
import { ExternalLink, Star, ShieldCheck, ShieldAlert, Sparkles, UserCheck, Trash2, ArrowUpRight, Edit2, Check, X, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leadsService } from '../api/services';

interface LeadTableProps {
  leads: any[];
  onSaveLead?: (id: number) => void;
  onAnalyzeLead?: (id: number) => void;
  onDeleteLead?: (id: number) => void;
  isLoading?: boolean;
}

export const LeadTable: React.FC<LeadTableProps> = ({
  leads,
  onSaveLead,
  onAnalyzeLead,
  onDeleteLead,
  isLoading = false
}) => {
  const navigate = useNavigate();
  const [editingBizId, setEditingBizId] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleStartEditEmail = (biz: any) => {
    setEditingBizId(biz.id);
    setEditingEmail(biz.email || '');
  };

  const handleSaveEmail = async (biz: any) => {
    if (!biz.id) return;
    setIsSaving(true);
    try {
      await leadsService.updateBusiness(biz.id, { email: editingEmail.trim() });
      biz.email = editingEmail.trim();
      setEditingBizId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update email address');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full p-12 text-center text-slate-400 text-xs font-medium">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        Fetching business leads from MySQL database...
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="w-full p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
        <div className="text-slate-300 font-bold text-sm mb-1">No Leads Found</div>
        <div className="text-slate-500 text-xs">Run a search scan or adjust your filters to discover high-value business prospects.</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-2xl">
      <table className="w-full text-left text-xs text-slate-300 border-collapse">
        <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
          <tr>
            <th className="py-3.5 px-4">Business Details</th>
            <th className="py-3.5 px-4">Category & Location</th>
            <th className="py-3.5 px-4">Rating & Contact</th>
            <th className="py-3.5 px-4 text-center">Website Audit</th>
            <th className="py-3.5 px-4 text-center">Lead Score</th>
            <th className="py-3.5 px-4 text-center">CRM Status</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {leads.map((item) => {
            const biz = item.business || item;
            const leadId = item.id;
            const isSaved = !!item.business;

            return (
              <tr key={biz.id || item.id} className="hover:bg-slate-800/40 transition-colors group">
                {/* Business Name & Address */}
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-100 group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                    <span>{biz.name}</span>
                    {biz.website && (
                      <a href={biz.website} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-purple-400">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{biz.address || 'Address not listed'}</div>
                </td>

                {/* Industry & City */}
                <td className="py-3.5 px-4">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 font-semibold border border-purple-500/20 text-[11px]">
                    {biz.industry || 'Business'}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1">{biz.city || biz.state || 'Location'}</div>
                </td>

                {/* Rating & Phone/Email */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{biz.google_rating || 4.2}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({biz.reviews_count || 0})</span>
                  </div>

                  {editingBizId === biz.id ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="email"
                        value={editingEmail}
                        onChange={(e) => setEditingEmail(e.target.value)}
                        placeholder="Enter email address..."
                        className="glass-input px-2 py-1 rounded text-[11px] w-36 text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveEmail(biz)}
                        disabled={isSaving}
                        title="Save Email"
                        className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setEditingBizId(null)}
                        title="Cancel"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-0.5 group/email">
                      <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                      <span className="text-[11px] text-slate-200 truncate max-w-[150px]">
                        {biz.email || 'No email added'}
                      </span>
                      <button
                        onClick={() => handleStartEditEmail(biz)}
                        title="Edit Lead Email"
                        className="opacity-60 hover:opacity-100 p-0.5 text-slate-400 hover:text-purple-300 transition-opacity"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </td>

                {/* Technical Website Audit */}
                <td className="py-3.5 px-4 text-center">
                  {biz.website ? (
                    <div className="inline-flex flex-col items-center">
                      <div className="flex items-center gap-1">
                        {biz.ssl_enabled ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span className="font-extrabold text-slate-200">{biz.website_score || 65}/100</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{biz.tech_stack || 'WordPress'}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      No Website (+30 Score)
                    </span>
                  )}
                </td>

                {/* Lead Score */}
                <td className="py-3.5 px-4 text-center">
                  <div className="inline-block px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <div className={`font-black text-xs ${
                      (item.lead_score || 50) >= 75 ? 'text-emerald-400' : (item.lead_score || 50) >= 45 ? 'text-purple-400' : 'text-slate-400'
                    }`}>
                      {item.lead_score || 50}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      {item.priority || 'Medium'}
                    </div>
                  </div>
                </td>

                {/* CRM Status */}
                <td className="py-3.5 px-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                    item.status === 'Won' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
                    item.status === 'Interested' ? 'bg-purple-500/10 text-purple-300 border-purple-500/30' :
                    item.status === 'Contacted' ? 'bg-blue-500/10 text-blue-300 border-blue-500/30' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {item.status || 'Discovered'}
                  </span>
                </td>

                {/* Action Buttons */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {onSaveLead && !isSaved && (
                      <button
                        onClick={() => onSaveLead(biz.id)}
                        className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1 shadow-md shadow-purple-500/20 transition-all"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Save Lead</span>
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/dashboard/leads/${leadId || biz.id}`)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1 transition-all border border-slate-700"
                    >
                      <span>View</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    {onAnalyzeLead && (
                      <button
                        onClick={() => onAnalyzeLead(leadId || biz.id)}
                        title="Run AI SWOT Audit"
                        className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {onDeleteLead && (
                      <button
                        onClick={() => onDeleteLead(leadId)}
                        title="Delete Lead"
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
