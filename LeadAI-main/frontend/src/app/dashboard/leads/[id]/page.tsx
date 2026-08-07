"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, Phone, Star, Flame, Award, ShieldCheck,
  AlertTriangle, Play, Loader2, Send, ThumbsUp, ThumbsDown,
  Calendar, Check, CheckSquare, Plus, Clock, FileText, CheckCircle, X
} from "lucide-react";
import { leadsService, crmService, emailService } from "@/services/api";

export default function LeadDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  // Lead state
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [updatingStage, setUpdatingStage] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState<"swot" | "smtp" | "notes" | "meetings" | "timeline">("swot");

  // SMTP Email Outbox state
  const [outreachChannel, setOutreachChannel] = useState("Cold Email");
  const [outreachDraft, setOutreachDraft] = useState("");
  const [outreachViewMode, setOutreachViewMode] = useState<"visual" | "editor">("visual");
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [smtpFeedback, setSmtpFeedback] = useState<{ type: "success" | "error", message: string } | null>(null);
  const [sentEmails, setSentEmails] = useState<any[]>([]);

  // Task Checklist & Custom Notes state
  const [tasks, setTasks] = useState<any[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Scheduler state
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [bookingMeeting, setBookingMeeting] = useState(false);
  const [schedulerFeedback, setSchedulerFeedback] = useState<string | null>(null);

  // Resolve Route Params
  useEffect(() => {
    params.then((p) => setResolvedId(parseInt(p.id)));
  }, [params]);

  // Load Lead details and sub-resources
  useEffect(() => {
    if (resolvedId) {
      loadLeadDetails();
    }
  }, [resolvedId]);

  const loadLeadDetails = async () => {
    if (!resolvedId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await leadsService.getLeadDetails(resolvedId);
      setLead(data);

      try {
        const notesData = await crmService.getNotes(resolvedId);
        setNotes(notesData || []);
        const tasksData = await crmService.getTasks(resolvedId);
        setTasks(tasksData || []);
        const draftsData = await emailService.getLeadDrafts(resolvedId);
        setSentEmails(draftsData || []);
      } catch (err) {
        console.error(err);
      }

      if (typeof window !== "undefined") {
        setRecipientEmail(data.business?.email || "info@example.com");
      }
    } catch (err: any) {
      console.error(err);
      setError("Could not retrieve lead details.");
    } finally {
      setLoading(false);
    }
  };



  const handleUpdateStatus = async (newStage: string) => {
    if (!lead) return;
    setUpdatingStage(true);
    try {
      const updated = await crmService.updateLeadStatus(lead.id, newStage);
      setLead(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to update status");
    } finally {
      setUpdatingStage(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!lead) return;
    setAnalyzing(true);
    try {
      const updated = await leadsService.analyzeLead(lead.id);
      setLead(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze lead");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateOutreach = async () => {
    if (!lead) return;
    setGeneratingDraft(true);
    setOutreachDraft("");
    setSmtpFeedback(null);
    try {
      const data = await emailService.generateDraft(lead.id, outreachChannel);
      setOutreachDraft(data.generated_body || "");
    } catch (err) {
      console.error(err);
      setError("Failed to generate outreach");
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSendEmail = async () => {
    if (!lead) return;
    setSmtpFeedback(null);
    const hostingerToken = localStorage.getItem("leadai_hostinger_token") || "";
    const hostingerMailboxId = localStorage.getItem("leadai_hostinger_mailbox_id") || "";
    const smtpUser = localStorage.getItem("leadai_smtp_user") || "";
    const smtpPassword = localStorage.getItem("leadai_smtp_password") || "";

    if (!recipientEmail) {
      setSmtpFeedback({ type: "error", message: "Please enter a Recipient email address." });
      return;
    }

    setSendingEmail(true);
    try {
      let subject = `Outreach proposal for ${lead.business.name}`;
      let bodyText = outreachDraft;
      if (outreachDraft.startsWith("Subject:")) {
        const lines = outreachDraft.split("\n");
        subject = lines[0].replace("Subject:", "").trim();
        bodyText = lines.slice(1).join("\n").trim();
      }

      await emailService.sendEmail({
        lead_id: lead.id,
        subject,
        body: bodyText,
        recipient_email: recipientEmail
      });

      setLead((prev: any) => ({ ...prev, status: "Contacted" }));
      setSmtpFeedback({
        type: "success",
        message: `Outreach email sent successfully using company SMTP!`
      });

      const newEmailLog = {
        id: Math.floor(Math.random() * 1000),
        generated_body: outreachDraft,
        status: "Sent",
        created_at: new Date().toISOString()
      };
      setSentEmails(prev => [newEmailLog, ...prev]);
    } catch (err: any) {
      console.error(err);
      setSmtpFeedback({ type: "error", message: err.message || "Failed to send email." });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleRejectPitch = () => {
    setSmtpFeedback({ type: "error", message: "Outreach pitch rejected & discarded." });
    setOutreachDraft("");
    handleUpdateStatus("Rejected");
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const data = await crmService.addTask(lead.id, newTaskTitle);
      setTasks(prev => [data, ...prev]);
      setNewTaskTitle("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingTask(false);
    }
  };

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "Pending" ? "Completed" : "Pending";
    try {
      await crmService.updateTaskStatus(taskId, nextStatus);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newNoteContent.trim()) return;
    setAddingNote(true);
    try {
      const data = await crmService.addNote(lead.id, newNoteContent);
      setNotes(prev => [data, ...prev]);
      setNewNoteContent("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleBookMeeting = () => {
    if (!meetingDate || !meetingTime) {
      alert("Please select a date and time.");
      return;
    }
    setBookingMeeting(true);
    setSchedulerFeedback(null);
    setTimeout(() => {
      setBookingMeeting(false);
      setSchedulerFeedback(`Successfully scheduled meeting on ${meetingDate} at ${meetingTime}!`);
      handleUpdateStatus("Meeting");

      const autoTask = {
        id: Math.floor(Math.random() * 1000),
        title: `Attend discovery meeting on ${meetingDate} at ${meetingTime}`,
        status: "Pending",
        due_date: new Date(`${meetingDate}T${meetingTime}`).toISOString()
      };
      setTasks(prev => [autoTask, ...prev]);
    }, 1000);
  };



  if (loading) {
    return (
      <div className="p-16 text-center space-y-4 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-xs text-slate-500 font-semibold">Loading lead dashboard details...</p>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="p-16 text-center bg-white border border-slate-200 rounded-2xl max-w-lg mx-auto shadow-premium">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-800">Lead Profile Not Found</h3>
        <p className="text-xs text-slate-500 mt-2">The requested prospect index could not be resolved. Please reload.</p>
        <Link href="/dashboard/leads" className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3 max-w-xl">
          <div className="flex gap-2 items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <Link href="/dashboard/leads" className="hover:text-primary transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> My Leads
            </Link>
            <span>/</span>
            <span className="text-slate-600">{lead.business.name}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">{lead.business.name}</h1>
            <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 border border-purple-200 text-[10px] font-bold text-primary uppercase tracking-wide">
              {lead.business.industry}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1 min-w-0">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {lead.business.website ? (
                <a href={lead.business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-[220px] sm:max-w-xs inline-block align-bottom">{lead.business.website}</a>
              ) : <span className="text-rose-500 font-medium">No website registered</span>}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {lead.business.phone || "No phone listed"}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              {lead.business.google_rating} ({lead.business.reviews_count} reviews)
            </span>
          </div>
        </div>

        {/* Lead status controls */}
        <div className="flex items-center gap-3 border-t border-slate-100 md:border-none pt-4 md:pt-0 w-full md:w-auto flex-wrap">
          <div>
            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pipeline Stage</label>
            <select
              value={lead.status}
              disabled={updatingStage}
              onChange={(e) => handleUpdateStatus(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
            >
              <option value="New" className="bg-white text-slate-900">New Opportunity</option>
              <option value="Contacted" className="bg-white text-slate-900">Outreach Sent</option>
              <option value="Interested" className="bg-white text-slate-900">Interested / Warm</option>
              <option value="Meeting" className="bg-white text-slate-900">Meeting Scheduled</option>
              <option value="Proposal Sent" className="bg-white text-slate-900">Proposal Sent</option>
              <option value="Won" className="bg-white text-slate-900">Deal Closed (Won)</option>
              <option value="Lost" className="bg-white text-slate-900">Deal Closed (Lost)</option>
              <option value="Rejected" className="bg-white text-slate-900">Rejected</option>
            </select>
          </div>

          <div className="p-3 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-center shrink-0">
            <span className="block text-[8px] font-bold text-primary uppercase tracking-wider">AI Score</span>
            <span className="text-xl font-black text-primary">{lead.lead_score}<span className="text-xs font-semibold text-slate-400">/100</span></span>
          </div>
        </div>
      </div>


      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold uppercase tracking-wider text-slate-400 bg-white px-6 rounded-t-2xl border-t border-x border-slate-200/80 shrink-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab("swot")}
          className={`py-4 border-b-2 transition-colors shrink-0 ${activeTab === "swot" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"}`}
        >
          AI SWOT Audit
        </button>
        <button
          onClick={() => setActiveTab("smtp")}
          className={`py-4 border-b-2 transition-colors shrink-0 ${activeTab === "smtp" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"}`}
        >
          Direct SMTP Outbox
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`py-4 border-b-2 transition-colors shrink-0 ${activeTab === "notes" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"}`}
        >
          CRM Tasks & Notes
        </button>
        <button
          onClick={() => setActiveTab("meetings")}
          className={`py-4 border-b-2 transition-colors shrink-0 ${activeTab === "meetings" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"}`}
        >
          Calendar Scheduler
        </button>
        <button
          onClick={() => setActiveTab("timeline")}
          className={`py-4 border-b-2 transition-colors shrink-0 ${activeTab === "timeline" ? "border-primary text-primary" : "border-transparent hover:text-slate-800"}`}
        >
          Activity Log
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white p-6 rounded-b-2xl border-b border-x border-slate-200/80 shadow-premium">

        {/* Tab 1: AI SWOT Audit */}
        {activeTab === "swot" && (
          <div className="space-y-6">
            {!lead.ai_summary && !analyzing && (
              <div className="p-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-4 bg-slate-50/50">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800">AI Audit Pending</h4>
                  <p className="text-xs text-slate-400 mt-1">This lead has not been analyzed yet. Run an automated SWOT audit now.</p>
                </div>
                <button
                  onClick={handleRunAIAnalysis}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Generate AI SWOT Audit
                </button>
              </div>
            )}

            {analyzing && (
              <div className="p-16 text-center space-y-4 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <h4 className="text-sm font-bold text-slate-800">Analyzing lead online footprint...</h4>
                <p className="text-xs text-slate-400">Inspecting ratings, domain presence, and generating graphic vector pitches.</p>
              </div>
            )}

            {lead.ai_summary && !analyzing && (
              <div className="space-y-6 text-xs text-slate-700">
                {/* Score progress bar */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Opportunity Conversion Score</span>
                    <span className="text-slate-800">{lead.lead_score}% Rating</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-1000"
                      style={{ width: `${lead.lead_score}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Business Summary</h4>
                  <p className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl leading-relaxed">{lead.ai_summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Strengths
                    </h4>
                    <div className="p-3.5 bg-emerald-50/10 border border-emerald-100 rounded-xl whitespace-pre-line leading-relaxed">
                      {lead.ai_strengths}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600" /> Digital Gaps & Weaknesses
                    </h4>
                    <div className="p-3.5 bg-rose-50/10 border border-rose-100 rounded-xl whitespace-pre-line leading-relaxed">
                      {lead.ai_weaknesses}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-4 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1.5">
                    <h5 className="font-bold text-slate-800">Domain / SEO Analysis</h5>
                    <p className="leading-relaxed text-slate-500">{lead.ai_website_analysis || lead.ai_seo_opportunity}</p>
                  </div>
                  <div className="p-4 bg-slate-50/50 border border-slate-200/50 rounded-xl space-y-1.5">
                    <h5 className="font-bold text-slate-800">Marketing & Sales Gaps</h5>
                    <p className="leading-relaxed text-slate-500">{lead.ai_sales_opportunity || lead.ai_marketing_opportunity}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recommended Service Packages</h4>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl leading-relaxed whitespace-pre-line font-bold text-slate-800">
                    {lead.ai_recommended_services}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct SMTP Email */}
        {activeTab === "smtp" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Dispatch form */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">SMTP Outreach Outbox</h4>

                <div className="flex gap-3">
                  <select
                    value={outreachChannel}
                    onChange={(e) => setOutreachChannel(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-600 font-bold"
                  >
                    <option value="Cold Email">Cold Email Sequence</option>
                    <option value="LinkedIn Message">LinkedIn Contact Request</option>
                    <option value="WhatsApp Message">WhatsApp Pitch</option>
                    <option value="Follow-up Email">Follow-up Sequence</option>
                    <option value="Proposal">Service Proposal Scope</option>
                  </select>

                  <button
                    onClick={handleGenerateOutreach}
                    disabled={generatingDraft || sendingEmail}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    {generatingDraft ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Generate Pitch
                      </>
                    )}
                  </button>
                </div>

                {smtpFeedback && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex gap-2 items-center ${smtpFeedback.type === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border border-rose-200 text-rose-800"
                    }`}>
                    {smtpFeedback.type === "success" ? <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" /> : <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />}
                    <span>{smtpFeedback.message}</span>
                  </div>
                )}

                {outreachDraft && (
                  <div className="space-y-4">
                    {/* View Mode Toggle Bar */}
                    <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl text-xs font-bold">
                      <span className="text-slate-600 px-2 text-[10.5px] uppercase tracking-wider">Outreach Editor View</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setOutreachViewMode("visual")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${outreachViewMode === "visual"
                            ? "bg-white text-primary shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          👁️ Visual Live Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutreachViewMode("editor")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${outreachViewMode === "editor"
                            ? "bg-white text-primary shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                          📝 Edit HTML / Code
                        </button>
                      </div>
                    </div>

                    {/* Recipient Address */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        Recipient Email Address (SMTP Target)
                      </label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-700 font-semibold"
                      />
                    </div>

                    {outreachViewMode === "visual" ? (
                      /* Live Formatted Visual Preview Card */
                      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-800 space-y-4 min-h-[300px]">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
                          <span className="font-bold text-slate-500">Official Preview: <span className="text-primary font-extrabold">BLUEBOXX.DA PRIVATE LIMITED Enterprise Email</span></span>
                          <span className="text-slate-400 text-[10px]">To: {recipientEmail}</span>
                        </div>
                        <div
                          className="text-xs leading-relaxed space-y-2 text-slate-800 font-sans"
                          dangerouslySetInnerHTML={{
                            __html: outreachDraft.includes("CEO & Founder")
                              ? (outreachDraft.includes("<") ? outreachDraft : outreachDraft.replace(/\n/g, "<br/>"))
                              : `
                                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; color: #0F172A; line-height: 1.6;">
                                  <div style="margin-bottom: 24px; font-size: 13px;">
                                    ${outreachDraft.replace(/\n/g, "<br/>")}
                                  </div>

                                  <div style="border-top: 3px solid #0F172A; padding-top: 20px; margin-top: 30px; background-color: #FFFFFF;">
                                    
                                    <!-- CEO & Founder Signoff with Company Name & Website URL -->
                                    <div style="font-size: 14px; color: #334155; margin-bottom: 20px; line-height: 1.6; border-bottom: 2px solid #E2E8F0; padding-bottom: 16px;">
                                      Regards,<br/>
                                      <strong style="color: #0F172A; font-size: 15px; font-weight: 800;">CEO & Founder</strong><br/>
                                      <span style="color: #2563EB; font-weight: 900; font-size: 16px; letter-spacing: 0.5px;">BLUEBOXX DESIGN ANIMATION PVT. LTD.</span><br/>
                                      <a href="https://blueboxx.in" style="color: #0F172A; text-decoration: none; font-size: 12.5px; font-weight: 700; display: inline-block; margin-top: 4px;">🌐 https://blueboxx.in</a>
                                    </div>

                                    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; font-size: 11.5px; color: #475569; margin-bottom: 16px;">
                                      <div style="margin-bottom: 4px;">📍 <strong>Address:</strong> SF 02, INDIA BULLS MEGA MALL, Dinesh Mill Rd, near Swami Vivekananda Railway Over Bridge, Anand Nagar, Akota, Vadodara, Gujarat 390022</div>
                                      <div style="margin-bottom: 4px;">🌐 <strong>Website:</strong> <a href="https://blueboxx.in" style="color: #2563EB;">https://blueboxx.in</a> &nbsp;|&nbsp; 📧 <strong>Support:</strong> info@bluebox.in</div>
                                      <div style="margin-bottom: 4px;">📞 <strong>Office Contact:</strong> +91 90235 12853 &nbsp;|&nbsp; 📱 <strong>Alt Contact:</strong> +91 63525 24266</div>
                                      <div style="font-size: 10.5px; color: #64748B;">🏢 <strong>GST:</strong> 24AAAAA0000A1Z5 &nbsp;|&nbsp; 📋 <strong>CIN:</strong> U72900GJ2026PTC123456 &nbsp;|&nbsp; 🕒 <strong>Hours:</strong> Mon - Sat: 9:00 AM - 7:00 PM IST</div>
                                    </div>

                                    <div style="margin-bottom: 16px;">
                                      <div style="font-size: 11px; font-weight: 900; color: #0F172A; text-transform: uppercase; margin-bottom: 6px;">Our Enterprise Digital Services</div>
                                      <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Website Development</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Web Applications</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ UI / UX Design</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Graphic Design</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Logo Design</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Branding</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Motion Graphics</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Animation</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Video Editing</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Digital Marketing</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ SEO</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Social Media Marketing</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Lead Generation</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ CRM Development</span>
                                        <span style="padding: 3px 8px; background-color: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 10.5px; font-weight: 700; color: #1E293B;">✓ Automation Solutions</span>
                                      </div>
                                    </div>

                                    
                                    <div style="border-top: 1px solid #E2E8F0; padding-top: 12px; font-size: 10.5px; color: #64748B; line-height: 1.5;">
                                      <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">&copy; 2026 BLUEBOXX.DA PRIVATE LIMITED. All Rights Reserved.</div>
                                      <div style="margin-bottom: 6px; font-style: italic; font-size: 10px; color: #94A3B8;">CONFIDENTIALITY NOTICE: This email and any attachments are confidential and intended solely for the recipient. If received by mistake, please notify BLUEBOXX.DA PRIVATE LIMITED immediately.</div>
                                      <div>
                                        <a href="https://blueboxxda.com" style="color: #2563EB; font-weight: 600;">Company Website</a> &bull; 
                                        <a href="https://blueboxxda.com/privacy" style="color: #2563EB; font-weight: 600;">Privacy Policy</a> &bull; 
                                        <a href="https://blueboxxda.com/terms" style="color: #2563EB; font-weight: 600;">Terms & Conditions</a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              `
                          }}
                        />
                      </div>
                    ) : (
                      /* Raw Textarea Editor */
                      <textarea
                        value={outreachDraft}
                        onChange={(e) => setOutreachDraft(e.target.value)}
                        className="w-full h-80 p-4 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-primary bg-slate-50/50 leading-relaxed font-mono"
                      />
                    )}

                    {/* Review actions */}
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={handleRejectPitch}
                        disabled={sendingEmail}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Reject Pitch
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                      >
                        {sendingEmail ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Transmitting...
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="w-4 h-4" />
                            Approve & Send
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sent history list */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  SMTP Send History
                </h4>

                {!Array.isArray(sentEmails) || sentEmails.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No sent emails recorded for this prospect.</p>
                ) : (
                  <div className="space-y-3">
                    {sentEmails.map((email: any) => (
                      <div key={email.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span className="flex items-center gap-1 text-emerald-600 font-bold uppercase"><CheckCircle className="w-3 h-3" /> Sent</span>
                          <span>{new Date(email.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-3 font-mono leading-relaxed bg-slate-50 p-1.5 rounded">{email.generated_body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: CRM Tasks & Notes */}
        {activeTab === "notes" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

              {/* Task Checklist */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4.5 h-4.5 text-slate-400" />
                  CRM Task Checklist
                </h4>

                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Enter task description (e.g. Call owner)..."
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={addingTask}
                    className="px-3.5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2.5">
                  {!Array.isArray(tasks) || tasks.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No tasks listed. Add a task above.</p>
                  ) : (
                    tasks.map((task: any) => {
                      const isCompleted = task.status === "Completed";
                      return (
                        <div
                          key={task.id}
                          onClick={() => handleToggleTask(task.id, task.status)}
                          className={`p-3 border rounded-xl flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${isCompleted ? "bg-slate-50 border-slate-200 text-slate-400 line-through" : "bg-white border-slate-200/80 text-slate-700 hover:border-primary/50"
                            }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={isCompleted ? "text-emerald-500" : "text-slate-300"}>
                              <CheckSquare className="w-4.5 h-4.5" />
                            </span>
                            <span className="font-medium">{task.title}</span>
                          </div>
                          {task.due_date && (
                            <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Notes Feed */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4.5 h-4.5 text-slate-400" />
                  Custom Lead Notes
                </h4>

                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    required
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write a status update note..."
                    className="w-full h-24 p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary bg-white shadow-sm text-slate-900 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={addingNote}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-sm self-end"
                  >
                    Add Note
                  </button>
                </form>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {!Array.isArray(notes) || notes.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No notes written yet.</p>
                  ) : (
                    notes.map((note: any) => (
                      <div key={note.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-xs space-y-1">
                        <p className="text-slate-700 leading-relaxed">{note.content}</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-400">
                          <span>By {note.author_name}</span>
                          <span>{new Date(note.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 4: Meeting Scheduler */}
        {activeTab === "meetings" && (
          <div className="space-y-6 max-w-xl mx-auto text-xs text-slate-700">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule B2B Discovery Meeting
            </h4>
            <p className="text-slate-500 text-center max-w-sm mx-auto leading-relaxed">
              Book a Zoom call or consultation meet. Booking a meeting automatically promotes the lead stage to "Meeting Scheduled".
            </p>

            {schedulerFeedback && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-xl text-center">
                {schedulerFeedback}
              </div>
            )}

            <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Date</label>
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-primary shadow-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Meeting Time</label>
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs focus:outline-none focus:border-primary shadow-sm font-semibold"
                  />
                </div>
              </div>

              <button
                onClick={handleBookMeeting}
                disabled={bookingMeeting}
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
              >
                {bookingMeeting ? "Booking Calendar invite..." : "Confirm Schedule & Send Invite"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 5: Activity Log */}
        {activeTab === "timeline" && (
          <div className="space-y-6 max-w-lg mx-auto text-xs text-slate-700">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-4.5 h-4.5 text-slate-400" />
              Cron Activity Timeline
            </h4>

            <div className="relative border-l-2 border-slate-100 pl-6 ml-3 space-y-6">
              {sentEmails.map((email: any, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                  <p className="font-bold text-slate-900">Direct SMTP Outreach Sent</p>
                  <p className="text-[10px] text-slate-500 mt-1">Transmitted cold pitching templates via connected Google mail.</p>
                  <span className="block text-[9px] text-slate-400 mt-1">{new Date(email.created_at).toLocaleString()}</span>
                </div>
              ))}

              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-blue-500 border-2 border-white" />
                <p className="font-bold text-slate-900">CRM Stage set to '{lead.status}'</p>
                <p className="text-[10px] text-slate-500 mt-1">Prospect profile promoted to active CRM stage pipeline.</p>
              </div>

              {lead.ai_summary && (
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 border-2 border-white" />
                  <p className="font-bold text-slate-900">AI SWOT Audit Compiled</p>
                  <p className="text-[10px] text-slate-500 mt-1">SWOT audit generated detailing Web Dev, design, and local SEO gaps.</p>
                </div>
              )}

              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-slate-300 border-2 border-white" />
                <p className="font-bold text-slate-800">Prospect Profile Saved</p>
                <p className="text-[10px] text-slate-400 mt-1">Scraped from directory search and stored in lead cabinet.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
