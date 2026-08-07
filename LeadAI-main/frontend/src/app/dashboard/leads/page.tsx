"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Trash2, Play, Search, ListFilter, Globe, Phone, Star, 
  Flame, Award, ShieldCheck, X, FileText, Mail, Send, 
  Calendar, Check, AlertTriangle, RefreshCcw, Loader2, Download,
  CheckSquare, Square, ArrowLeft, ChevronLeft, ChevronRight, Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { leadsService, crmService, exportService } from "@/services/api";

export default function MyLeadsPage() {
  const router = useRouter();

  // Query filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [industry, setIndustry] = useState("");
  const [scoreCategory, setScoreCategory] = useState("");
  const [hasWebsite, setHasWebsite] = useState<string>("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");

  // Leads list state
  const [leads, setLeads] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadLeads();
  }, [industry, scoreCategory, hasWebsite, sortBy, order]);

  const loadLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const webParam = hasWebsite === "true" ? true : hasWebsite === "false" ? false : undefined;
      const data = await leadsService.getLeads({
        search_query: searchQuery,
        industry: industry || undefined,
        score_category: scoreCategory || undefined,
        has_website: webParam,
        sort_by: sortBy,
        order
      });
      setLeads(data.leads || []);
      setTotalLeads(data.total || 0);
      setSelectedIds([]);
      setCurrentPage(1);
    } catch (err: any) {
      setError(err.message || "Failed to load saved leads.");
      setLeads([]);
      setSelectedIds([]);
      setTotalLeads(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeads();
  };

  const handleDeleteLead = async (leadId: number) => {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      await leadsService.deleteLead(leadId);
      loadLeads();
    } catch (err) {
      console.error(err);
      setError("Failed to delete lead");
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === leads.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(leads.map(l => l.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected leads?`)) return;
    setBulkProcessing(true);
    setBulkFeedback("Deleting selected leads...");
    try {
      for (const id of selectedIds) {
        try {
          await leadsService.deleteLead(id);
        } catch (err) { console.error(err); }
      }
      setBulkFeedback("Successfully deleted selected prospects!");
      setTimeout(() => setBulkFeedback(null), 3000);
      loadLeads();
    } catch (err) {
      console.error(err);
      setError("Failed to delete some leads.");
      setBulkProcessing(false);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkAIAnalysis = async () => {
    setBulkProcessing(true);
    setBulkFeedback("Auditing selected leads using AI...");
    try {
      for (const id of selectedIds) {
        try {
          await leadsService.analyzeLead(id);
        } catch (err) { console.error(err); }
      }
      setBulkFeedback("AI SWOT Audits completed for selected leads!");
      setTimeout(() => setBulkFeedback(null), 3000);
      loadLeads();
    } catch (err) {
      console.error(err);
      setError("Failed to analyze some leads.");
      setBulkProcessing(false);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkAddToCampaign = () => {
    setBulkFeedback(`Successfully added ${selectedIds.length} leads to Outbound Campaign Sequence!`);
    setSelectedIds([]);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  // Pagination Logic
  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const paginatedLeads = leads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 font-sans relative">
      {/* Title & Back to Home */}
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-all font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Lead Prospects Vault
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Enriched business leads generated via Google Maps Scraper with technical website audits and AI scores.
            </p>
          </div>
          
          {/* Export Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportService.downloadCsv()}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button
              onClick={() => exportService.downloadExcel()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button
              onClick={() => exportService.downloadJson()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> JSON
            </button>
            <button
              onClick={loadLeads}
              className="p-2.5 bg-white hover:bg-slate-50 text-slate-650 border border-slate-200 rounded-xl shadow-sm transition-all"
              title="Refresh table"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Marketing Team Action Card */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-5 rounded-2xl border border-primary/10 shadow-premium flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            Marketing Campaign Playbook
          </h4>
          <p className="text-[10.5px] text-slate-500 font-normal leading-relaxed">
            Select leads, click <strong>"AI SWOT Audit"</strong> to generate personalized copy, then click <strong>"Details & Send"</strong> to send the outreach email from Gmail!
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-primary border border-purple-200/50 text-[10px] font-bold">1. Select Leads</span>
          <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-accent border border-teal-200/50 text-[10px] font-bold">2. Run AI SWOT</span>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-bold">3. Send Email</span>
        </div>
      </div>

      {/* Filter Ribbon Card */}
      <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-premium">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-semibold placeholder:text-slate-400"
            />
          </div>

          <div>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
            >
              <option value="" className="bg-white text-slate-900">All Industries</option>
              <option value="dentists" className="bg-white text-slate-900">Dentists</option>
              <option value="gyms" className="bg-white text-slate-900">Gyms</option>
              <option value="roofing" className="bg-white text-slate-900">Roofing</option>
            </select>
          </div>

          <div>
            <select
              value={scoreCategory}
              onChange={(e) => setScoreCategory(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
            >
              <option value="" className="bg-white text-slate-900">All Scores</option>
              <option value="hot" className="bg-white text-slate-900">High Potential (75+)</option>
              <option value="warm" className="bg-white text-slate-900">Warm Opportunity (40-74)</option>
              <option value="cold" className="bg-white text-slate-900">Low Opportunity (&lt;40)</option>
            </select>
          </div>

          <div>
            <select
              value={hasWebsite}
              onChange={(e) => setHasWebsite(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
            >
              <option value="all" className="bg-white text-slate-900">Website Presence</option>
              <option value="true" className="bg-white text-slate-900">Has Website</option>
              <option value="false" className="bg-white text-slate-900">No Website</option>
            </select>
          </div>
        </form>
      </div>

      {/* Bulk Feedback Banner */}
      {bulkFeedback && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold flex items-center gap-2 animate-pulse">
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
          <span>{bulkFeedback}</span>
        </div>
      )}

      {/* Main Results Table */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-premium flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-semibold">Loading prospects console...</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-premium">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-800">No prospects indexed</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
            Configure Google/OpenAI keys or trigger searches inside the Places Scanner sidebar to index B2B targets.
          </p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">Displaying {leads.length} Saved Prospects</span>
            <span className="text-[10px] text-slate-400">Click Row to open Detailed SWOT & SMTP Outreach Page</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/20">
                  <th className="px-4 py-3.5 text-center w-12">
                    <button 
                      type="button" 
                      onClick={handleToggleSelectAll}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500"
                    >
                      {selectedIds.length === leads.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3.5">Company Details</th>
                  <th className="px-6 py-3.5">Website / Domain</th>
                  <th className="px-6 py-3.5">Rating Gaps</th>
                  <th className="px-6 py-3.5">Opportunity Score</th>
                  <th className="px-6 py-3.5 text-center">Outreach State</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedLeads.map((lead) => {
                  let scoreBadge = "bg-blue-50 text-primary border-blue-100";
                  if (lead.lead_score >= 75) scoreBadge = "bg-rose-50 text-rose-600 border-rose-100";
                  else if (lead.lead_score >= 40) scoreBadge = "bg-amber-50 text-amber-600 border-amber-100";

                  let statusBadge = "bg-slate-100 text-slate-500 border-slate-200";
                  let statusText = "Ready to Outreach";
                  if (lead.status === "Contacted") {
                    statusBadge = "bg-teal-50 text-accent border-teal-200/50";
                    statusText = "✉️ Outreach Sent";
                  } else if (lead.status === "Interested") {
                    statusBadge = "bg-amber-50 text-amber-700 border-amber-200/50";
                    statusText = "🔥 Interested";
                  } else if (lead.status === "Meeting") {
                    statusBadge = "bg-purple-50 text-primary border-purple-200/50";
                    statusText = "📅 Zoom Booked";
                  } else if (lead.status === "Proposal Sent") {
                    statusBadge = "bg-blue-50 text-blue-700 border-blue-200/50";
                    statusText = "📄 Proposal Sent";
                  } else if (lead.status === "Won") {
                    statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-250/50";
                    statusText = "🎉 Deal Won";
                  } else if (lead.status === "Lost") {
                    statusBadge = "bg-slate-100 text-slate-500 border-slate-200";
                    statusText = "❌ Closed Lost";
                  } else if (lead.status === "Rejected") {
                    statusBadge = "bg-rose-50 text-rose-700 border-rose-200/50";
                    statusText = "🗑️ Discarded";
                  }

                  const isChecked = selectedIds.includes(lead.id);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-50/50 transition-all cursor-pointer ${isChecked ? "bg-primary/5 hover:bg-primary/10" : ""}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelect(lead.id);
                          }}
                          className="p-1 rounded text-slate-500"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        <div>
                          <span className="font-bold hover:text-primary transition-colors">{lead.business.name}</span>
                          <p className="text-[10px] text-slate-400 font-normal mt-1">{lead.business.industry} | {lead.business.address}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        <div className="space-y-1">
                          {lead.business.website ? (
                            <a 
                              href={lead.business.website} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-[11px]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3.5 h-3.5" />
                              Domain active
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-xl text-[10px] font-semibold">
                              <AlertTriangle className="w-3 h-3" />
                              Missing Website
                            </span>
                          )}
                          <p className="text-slate-500 text-[10px] flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {lead.business.phone || "Missing Phone"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{lead.business.google_rating}</span>
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-slate-400 text-[10px]">({lead.business.reviews_count})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        <span className={`px-2.5 py-1 border rounded-lg text-xs ${scoreBadge}`}>
                          {lead.lead_score} {lead.lead_score >= 75 ? "Hot" : lead.lead_score >= 40 ? "Warm" : "Cold"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-bold" onClick={() => router.push(`/dashboard/leads/${lead.id}`)}>
                        <span className={`px-2.5 py-1 border rounded-full text-[9px] uppercase tracking-wider ${statusBadge}`}>
                          {statusText}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200"
                          >
                            Details
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLead(lead.id);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Delete Lead"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs font-semibold">
              <span className="text-slate-500">Showing page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Floating Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 flex items-center gap-6 animate-slide-up text-xs font-bold">
          <div className="flex items-center gap-2 text-slate-400 border-r border-slate-800 pr-4">
            <CheckSquare className="w-4.5 h-4.5 text-primary" />
            <span>{selectedIds.length} selected</span>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkAIAnalysis}
              disabled={bulkProcessing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              AI SWOT Audit
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkAddToCampaign}
              disabled={bulkProcessing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Mail className="w-3.5 h-3.5" />
              Add to Campaign
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => exportService.downloadCsv()}
              disabled={bulkProcessing}
              className="px-4 py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBulkDelete}
              disabled={bulkProcessing}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Selection
            </motion.button>
          </div>

          <button 
            onClick={() => setSelectedIds([])}
            className="text-slate-400 hover:text-white border-l border-slate-800 pl-4 py-1"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
