"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, MapPin, Compass, ListFilter, Play, Loader, Check, 
  AlertTriangle, Globe, Phone, Star, History, ArrowRight, ArrowLeft,
  ChevronLeft, ChevronRight, Mail, Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { searchService, leadsService } from "@/services/api";

export default function SearchLeadsPage() {
  // Inputs
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("");
  const [radius, setRadius] = useState(5000);
  const [maxResults, setMaxResults] = useState(25);
  const [multiCategory, setMultiCategory] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(true);

  // States
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [savedLeadIds, setSavedLeadIds] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await searchService.getHistory();
      setHistory(data);
    } catch (err: any) {
      console.error(err);
      setHistory([]);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBusinesses([]);
    setCurrentPage(1);
    setProgressPercent(5);

    const steps = [
      { text: "Fetching... Querying Google Maps Scraper Actor", percent: 20 },
      { text: "Analysing... Auditing Website SSL, Speed & Tech Stack", percent: 45 },
      { text: "Removing Duplicates... Checking Place ID, Phone & Website", percent: 70 },
      { text: "Saving... Storing Enriched Business & AI Lead Profiles", percent: 90 },
      { text: "Completed! Finalizing Lead Opportunities Table", percent: 100 }
    ];

    let currentStepIdx = 0;
    setLoadingStep(steps[0].text);
    setProgressPercent(steps[0].percent);

    const stepInterval = setInterval(() => {
      if (currentStepIdx < steps.length - 1) {
        currentStepIdx++;
        setLoadingStep(steps[currentStepIdx].text);
        setProgressPercent(steps[currentStepIdx].percent);
      }
    }, 1100);

    try {
      const results = await searchService.runSearch({
        category,
        location,
        radius,
        max_results: maxResults,
        multi_category: multiCategory,
        force_refresh: forceRefresh
      });
      setBusinesses(results);
      clearInterval(stepInterval);
      setProgressPercent(100);
      setLoadingStep("Completed!");
      loadHistory();
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || "Failed to scan Google Maps businesses. Please try again.");
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingStep("");
        setProgressPercent(0);
      }, 600);
    }
  };

  const handleSaveLead = async (biz: any) => {
    try {
      const savedLead = await leadsService.saveLead(biz.id);
      setSavedLeadIds(prev => ({ ...prev, [biz.google_place_id]: savedLead.id }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save lead.");
    }
  };



  const handleLoadPastScan = async (hist: any) => {
    setCategory(hist.category);
    setLocation(hist.location);
    setRadius(hist.radius);
    setMaxResults(hist.max_results);
    setLoading(true);
    setError(null);
    try {
      const bizList = await searchService.getScanBusinesses(hist.id);
      setBusinesses(bizList || []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load past scan businesses.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePastScan = async (e: React.MouseEvent, searchId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this scan from history?")) return;
    try {
      await searchService.deleteScan(searchId);
      loadHistory();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(businesses.length / itemsPerPage);
  const paginatedBusinesses = businesses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-8 font-sans">
      {/* Title & Back to Home */}
      <div className="space-y-3">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-primary transition-all font-bold uppercase tracking-wider">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
            Step 1: Scan Business Directory
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Search Google Places maps to extract local leads that do not have websites or have low review ratings.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Parameters Console */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-premium"
          >
            <h3 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center justify-between">
              <span>Google Maps Scanner</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold uppercase">Apify Engine</span>
            </h3>
            <form onSubmit={handleSearchSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Industry / Keyword
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                    <Compass className="w-4 h-4" />
                  </span>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-bold appearance-none"
                  >
                    <option value="all" className="bg-white text-slate-900">🔥 Multi-Category Matrix (All Top 11 Industries)</option>
                    <option value="restaurants" className="bg-white text-slate-900">Restaurants</option>
                    <option value="cafes" className="bg-white text-slate-900">Cafes</option>
                    <option value="hotels" className="bg-white text-slate-900">Hotels</option>
                    <option value="gyms" className="bg-white text-slate-900">Gyms & Fitness</option>
                    <option value="salons" className="bg-white text-slate-900">Salons & Spas</option>
                    <option value="hospitals" className="bg-white text-slate-900">Hospitals</option>
                    <option value="schools" className="bg-white text-slate-900">Schools & Academies</option>
                    <option value="real estate" className="bg-white text-slate-900">Real Estate</option>
                    <option value="clinics" className="bg-white text-slate-900">Medical Clinics</option>
                    <option value="electronics" className="bg-white text-slate-900">Electronics Stores</option>
                    <option value="furniture" className="bg-white text-slate-900">Furniture Stores</option>
                    <option value="plumbing" className="bg-white text-slate-900">Plumbing Services</option>
                    <option value="roofing" className="bg-white text-slate-900">Roofing & Construction</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Target Location (City / Region)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Rajpipla, Gujarat"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-primary shadow-sm bg-white text-slate-900 font-semibold placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-1 space-y-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiCategory}
                    onChange={(e) => setMultiCategory(e.target.checked)}
                    className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Parallel Multi-Category Strategy</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                    className="w-3.5 h-3.5 text-primary rounded border-slate-300 focus:ring-primary"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Force Fresh Scrape (Disable Cache)</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Search Radius
                  </label>
                  <select
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-2xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
                  >
                    <option value={1000} className="bg-white text-slate-900">1 km</option>
                    <option value={5000} className="bg-white text-slate-900">5 km</option>
                    <option value={10000} className="bg-white text-slate-900">10 km</option>
                    <option value={30000} className="bg-white text-slate-900">30 km</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Limit Results
                  </label>
                  <select
                    value={maxResults}
                    onChange={(e) => setMaxResults(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-slate-200 rounded-2xl text-xs bg-white focus:outline-none focus:border-primary shadow-sm text-slate-900 font-bold"
                  >
                    <option value={10} className="bg-white text-slate-900">10 leads</option>
                    <option value={25} className="bg-white text-slate-900">25 leads</option>
                    <option value={50} className="bg-white text-slate-900">50 leads</option>
                    <option value={100} className="bg-white text-slate-900">100+ leads</option>
                  </select>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-dark hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-2xl shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Scanning Google Maps...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    Start Google Maps Scraper
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>

          {/* Search History */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-premium"
          >
            <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center justify-between uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><History className="w-4 h-4 text-slate-400" /> Past Scans</span>
              <span className="text-[9px] font-extrabold text-slate-400">Total: {history.length}</span>
            </h3>
            {history.length === 0 ? (
              <p className="text-[10px] text-slate-400 italic">No scans run yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.slice(0, 10).map((hist) => (
                  <div
                    key={hist.id}
                    onClick={() => handleLoadPastScan(hist)}
                    className="w-full p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 text-left transition-colors flex justify-between items-center group text-xs cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-800 truncate capitalize">{hist.category}</h4>
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-extrabold">{hist.status || "Completed"}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 truncate">{hist.location}</p>
                      <div className="flex items-center gap-2 mt-1 text-[8px] text-slate-500 font-medium">
                        <span>🎯 {hist.businesses_found} leads</span>
                        <span>⏱️ {hist.duration_ms ? (hist.duration_ms / 1000).toFixed(1) : "1.2"}s</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[9px] text-slate-400 font-bold group-hover:text-primary transition-colors flex items-center gap-0.5">
                        Load <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                      <button
                        title="Delete Scan"
                        onClick={(e) => handleDeletePastScan(e, hist.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-premium flex flex-col items-center justify-center gap-5"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary relative">
                  <Loader className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2 max-w-md w-full">
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Live Google Maps Extraction</h3>
                  <p className="text-xs text-primary font-bold">{loadingStep}</p>

                  {/* Real-time Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-3 border border-slate-200">
                    <motion.div 
                      className="bg-gradient-to-r from-primary via-indigo-600 to-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 block text-right">{progressPercent}%</span>
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
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No scanned prospects</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-2 leading-relaxed">
                  Configure your Location (e.g. *Rajpipla*) and Target Industry, then click **"Start Google Maps Scraper"**.
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
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Unique Results Found ({businesses.length})</h3>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Deduplication Filter Active • All duplicates purged</p>
                  </div>
                  <span className="text-[10px] text-slate-400">Showing {Math.min(businesses.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(businesses.length, currentPage * itemsPerPage)}</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/20">
                        <th className="px-6 py-3.5">Company Details</th>
                        <th className="px-6 py-3.5">Website & Technical Audit</th>
                        <th className="px-6 py-3.5">Google Rating</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {paginatedBusinesses.map((biz) => {
                        const isSaved = !!savedLeadIds[biz.google_place_id];
                        return (
                          <tr key={biz.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-slate-900">
                              <div>
                                <p className="font-bold flex items-center gap-1.5">
                                  {biz.name}
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">{biz.industry}</span>
                                </p>
                                <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate font-normal">{biz.address}</p>
                                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                                  <span>📞 {biz.phone || "No Phone"}</span>
                                  <span>✉️ {biz.email || "No Email"}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1">
                                {biz.website ? (
                                  <div className="space-y-0.5">
                                    <a 
                                      href={biz.website} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                                    >
                                      <Globe className="w-3.5 h-3.5" />
                                      {biz.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                    </a>
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold">
                                      <span className={`px-1.5 py-0.2 rounded ${biz.ssl_enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {biz.ssl_enabled ? 'SSL HTTPS' : 'No SSL'}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">
                                        Score: {biz.website_score}/100
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 border border-amber-200/50 px-2 py-0.5 rounded-xl text-[10px] font-extrabold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    No Official Website (+30 Lead Score)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{biz.google_rating}</span>
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-slate-400 text-[10px]">({biz.reviews_count} reviews)</span>
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
                                  className="px-4 py-2 bg-accent hover:bg-accent-dark text-white rounded-2xl text-xs font-bold shadow-sm transition-all"
                                >
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20 text-xs font-semibold">
                    <span className="text-slate-500">Page {currentPage} of {totalPages}</span>
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
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
