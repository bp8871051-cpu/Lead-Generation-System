"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Search, Link as LinkIcon, Download, Play, Loader, Check, 
  AlertTriangle, Globe, Phone, Mail, ArrowLeft, PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchService, leadsService } from "@/services/api";

export default function ScraperPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [savedLeadIds, setSavedLeadIds] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const handleScrapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setBusinesses([]);

    try {
      const results = await searchService.scrapeLink(url);
      setBusinesses(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to scrape the provided link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (biz: any) => {
    try {
      const savedLead = await leadsService.saveLead(biz.id);
      setSavedLeadIds(prev => ({ ...prev, [biz.id]: savedLead.id }));
    } catch (err) {
      console.error(err);
      setError("Failed to save lead.");
    }
  };

  const exportToCsv = () => {
    if (businesses.length === 0) return;

    // Build CSV headers
    const headers = ["Company Name", "Address", "Phone", "Email", "Website Status"];
    
    // Map rows
    const rows = businesses.map(biz => [
      `"${(biz.name || "").replace(/"/g, '""')}"`,
      `"${(biz.address || "").replace(/"/g, '""')}"`,
      `"${biz.phone || ""}"`,
      `"${biz.email || ""}"`,
      `"${biz.website ? 'Has Website' : 'No Website'}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "scraped_leads.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Title & Back */}
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-all font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <LinkIcon className="w-8 h-8 text-primary" />
            Custom Link Scraper
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Paste any directory link (like GIDC lists) and our AI will extract companies with no website or low-quality digital presence.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scraper Input */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-premium"
          >
            <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">Paste Target URL</h3>
            <form onSubmit={handleScrapeSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Directory Link
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Globe className="w-4 h-4" />
                  </span>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/directory"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-semibold placeholder:text-slate-400"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || !url}
                className="w-full py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white text-xs font-bold rounded-2xl shadow-md shadow-primary/10 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                    AI is parsing text...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    Start AI Scrape
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </div>

        {/* Results Desk */}
        <div className="lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-premium flex flex-col items-center justify-center gap-4"
              >
                <Loader className="w-10 h-10 text-primary animate-spin" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-800">Reading Website Content...</h3>
                  <p className="text-xs text-primary font-bold animate-pulse">Extracting unstructured leads using GPT-4</p>
                </div>
              </motion.div>
            ) : error ? (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2 items-start"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error occurred.</p>
                  <p className="mt-0.5">{error}</p>
                </div>
              </motion.div>
            ) : businesses.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-premium"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <LinkIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No scraped prospects yet</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                  Paste a link to any public list, directory, or forum to extract companies with missing or poor websites.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Results Found ({businesses.length})</h3>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={exportToCsv}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 rounded-xl text-[10px] font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export to Spreadsheet (CSV)
                  </motion.button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/20">
                        <th className="px-6 py-3.5">Company Details</th>
                        <th className="px-6 py-3.5">Contact Methods</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {businesses.map((biz) => {
                        const isSaved = !!savedLeadIds[biz.id];
                        return (
                          <tr key={biz.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              <div>
                                <p className="font-bold">{biz.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate font-normal">{biz.address || "No address provided"}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {biz.website ? (
                                  <a 
                                    href={biz.website} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                    Has website
                                  </a>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-xl text-[10px] font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    No website
                                  </span>
                                )}
                                <p className="text-slate-500 text-[10px] flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {biz.phone || "Missing Phone"}
                                </p>
                                <p className="text-slate-500 text-[10px] flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {biz.email || "Missing Email"}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {isSaved ? (
                                <button
                                  disabled
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 rounded-xl text-xs font-bold shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Saved
                                </button>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => handleSaveLead(biz)}
                                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-2xl text-[11px] font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                >
                                  <PlusCircle className="w-3.5 h-3.5" />
                                  Save Lead
                                </motion.button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
