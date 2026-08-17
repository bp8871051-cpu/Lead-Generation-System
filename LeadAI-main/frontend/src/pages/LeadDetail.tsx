import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { leadsService, crmService, emailService } from '../api/services';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Globe,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  Send,
  CheckCircle,
  FileText,
  Clock,
  ArrowLeft,
  Edit2,
  Check,
  X
} from 'lucide-react';

export const LeadDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = Number(id);

  const [lead, setLead] = useState<any>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Email Editing state
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [headerEmailInput, setHeaderEmailInput] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');

  // Note & Task Input
  const [noteContent, setNoteContent] = useState('');
  const [taskTitle, setTaskTitle] = useState('');

  // AI Email Generator state
  const [selectedChannel, setSelectedChannel] = useState('Cold Email');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState('');

  const loadLeadProfile = async () => {
    setLoading(true);
    try {
      const [lData, nData, tData] = await Promise.all([
        leadsService.getLeadDetails(leadId),
        crmService.getNotes(leadId),
        crmService.getTasks(leadId)
      ]);
      setLead(lData);
      setNotes(nData || []);
      setTasks(tData || []);
      const currentEmail = lData?.business?.email || '';
      setHeaderEmailInput(currentEmail);
      setRecipientEmail(currentEmail);
    } catch (err) {
      console.error('Failed to load lead profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHeaderEmail = async () => {
    const bizId = lead?.business?.id || lead?.business_id;
    if (!bizId) return;
    try {
      await leadsService.updateBusiness(bizId, { email: headerEmailInput.trim() });
      if (lead.business) lead.business.email = headerEmailInput.trim();
      setRecipientEmail(headerEmailInput.trim());
      setIsEditingEmail(false);
    } catch (err: any) {
      alert(err.message || 'Failed to update email');
    }
  };

  useEffect(() => {
    if (leadId) loadLeadProfile();
  }, [leadId]);

  const handleRunAiAudit = async () => {
    try {
      const updated = await leadsService.analyzeLead(leadId);
      setLead(updated);
    } catch (err: any) {
      alert(err.message || 'AI Audit failed');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      const newNote = await crmService.addNote(leadId, noteContent);
      setNotes([newNote, ...notes]);
      setNoteContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      const newTask = await crmService.addTask(leadId, taskTitle);
      setTasks([...tasks, newTask]);
      setTaskTitle('');
    } catch (err: any) {
      alert(err.message || 'Failed to add task');
    }
  };

  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setEmailStatusMsg('');
    try {
      const draft = await emailService.generateDraft(leadId, selectedChannel);
      setGeneratedDraft(draft.generated_body || '');
      setEmailSubject(draft.subject || `Outreach Opportunity for ${lead?.business?.name}`);
    } catch (err: any) {
      setEmailStatusMsg(`Generation error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!generatedDraft.trim() || !emailSubject.trim()) return;
    const targetRecipient = recipientEmail.trim() || lead?.business?.email || '';
    if (!targetRecipient) {
      alert('Please enter a recipient email address before sending.');
      return;
    }

    setIsSending(true);
    setEmailStatusMsg('');
    try {
      const res = await emailService.sendEmail({
        lead_id: leadId,
        subject: emailSubject,
        body: generatedDraft,
        recipient_email: targetRecipient,
      });
      setEmailStatusMsg(`Result: ${res.message}`);
      loadLeadProfile();
    } catch (err: any) {
      setEmailStatusMsg(`Delivery error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (loading || !lead) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        Loading lead profile & technical audit metrics...
      </div>
    );
  }

  const biz = lead.business || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Back Navigation */}
      <button
        onClick={() => navigate('/dashboard/leads')}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Saved Leads</span>
      </button>

      {/* Main Profile Header Card */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-white">{biz.name}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-bold text-xs border border-purple-500/20">
              {biz.industry || 'Business'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {biz.google_rating || 4.2} ({biz.reviews_count || 0} reviews)
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              {biz.address || 'Address not listed'}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              {biz.phone || 'Phone unavailable'}
            </span>
            {isEditingEmail ? (
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-xl border border-purple-500/30">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <input
                  type="email"
                  value={headerEmailInput}
                  onChange={(e) => setHeaderEmailInput(e.target.value)}
                  placeholder="Enter email address..."
                  className="glass-input px-2 py-0.5 rounded text-xs text-white w-48"
                  autoFocus
                />
                <button
                  onClick={handleSaveHeaderEmail}
                  title="Save Email"
                  className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsEditingEmail(false)}
                  title="Cancel"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="flex items-center gap-1.5 group/email">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-200">{biz.email || 'No email on record'}</span>
                <button
                  onClick={() => { setHeaderEmailInput(biz.email || ''); setIsEditingEmail(true); }}
                  title="Edit Lead Email"
                  className="opacity-70 hover:opacity-100 p-1 text-purple-300 hover:text-purple-200 transition-opacity"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAiAudit}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Re-Run AI SWOT Audit</span>
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Technical Audit & SWOT | Right Notes & AI Email Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Technical Website Health Audit */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Technical & Security Website Audit</span>
              </h2>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Audit Score:</span>
                <span className="text-base font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20">
                  {biz.website_score || lead.website_score || 65}/100
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">SSL Certificate</div>
                <div className="text-xs font-bold text-slate-200 mt-1 flex items-center gap-1">
                  {biz.ssl_enabled ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>{biz.ssl_enabled ? 'HTTPS Active' : 'No SSL (-10 Score)'}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Mobile Viewport</div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {biz.mobile_friendly ? 'Mobile Optimized' : 'Not Responsive'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Tech Stack</div>
                <div className="text-xs font-bold text-purple-400 mt-1 truncate">
                  {biz.tech_stack || 'WordPress'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Analytics Tracking</div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  {biz.has_analytics ? 'Google Tag Detected' : 'Missing Pixel'}
                </div>
              </div>
            </div>

            {biz.meta_title && (
              <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
                <span className="text-slate-400 font-semibold block mb-1">Meta Title Tag:</span>
                <p className="text-slate-200">{biz.meta_title}</p>
              </div>
            )}
          </div>

          {/* AI SWOT Analysis Report */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>AI Strengths, Weaknesses & Sales Pitch Strategy</span>
            </h2>

            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 leading-relaxed">
              <strong>AI Executive Summary:</strong> {lead.ai_summary || 'SWOT Analysis ready.'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Business Strengths</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {lead.ai_strengths || '• High customer satisfaction\n• Solid local reputation'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Digital Weaknesses</h3>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {lead.ai_weaknesses || '• Outdated design\n• Low Google map rankings'}
                </p>
              </div>
            </div>

            {lead.ai_sales_opportunity && (
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">Tailored Sales Pitch Approach</h3>
                <p className="text-xs text-slate-300">{lead.ai_sales_opportunity}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Notes, Tasks & AI Email Dispatcher) */}
        <div className="space-y-6">
          {/* AI Outreach Copy Generator & Email Sender */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" />
              <span>AI Outreach Generator & Email Dispatcher</span>
            </h2>

            <div className="flex items-center gap-2">
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="glass-input px-3 py-2 rounded-xl text-xs flex-1"
              >
                <option value="Cold Email">Cold Outreach Email</option>
                <option value="LinkedIn Message">LinkedIn Direct Message</option>
                <option value="WhatsApp Message">WhatsApp Pitch</option>
                <option value="Follow-Up Email">Follow-Up Note</option>
                <option value="Proposal">Custom Agency Proposal</option>
              </select>

              <button
                onClick={handleGenerateDraft}
                disabled={isGenerating}
                className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md shadow-purple-500/20"
              >
                {isGenerating ? 'Drafting...' : 'Generate Copy'}
              </button>
            </div>

            {emailStatusMsg && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-purple-300">
                {emailStatusMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Recipient Email Address</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Enter lead target email address..."
                className="w-full glass-input px-3 py-2 rounded-xl text-xs mb-3 text-white"
              />

              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Subject Line</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Subject line..."
                className="w-full glass-input px-3 py-2 rounded-xl text-xs mb-3"
              />

              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Outreach Body Copy</label>
              <textarea
                rows={7}
                value={generatedDraft}
                onChange={(e) => setGeneratedDraft(e.target.value)}
                placeholder="Click 'Generate Copy' to draft personalized cold outreach..."
                className="w-full glass-input p-3 rounded-xl text-xs leading-relaxed"
              ></textarea>
            </div>

            <button
              onClick={handleSendEmail}
              disabled={isSending || !generatedDraft.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              {isSending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Outreach Email</span>
                </>
              )}
            </button>
          </div>

          {/* CRM Internal Notes */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 backdrop-blur-md space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Internal CRM Notes Timeline</span>
            </h2>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add team note or call log..."
                className="w-full glass-input p-3 rounded-xl text-xs"
              ></textarea>
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                Post Note
              </button>
            </form>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notes.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <div className="flex justify-between text-[10px] text-slate-500 font-semibold mb-1">
                    <span>{n.author_name || 'Team Member'}</span>
                    <span>{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-300">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
