import React, { useState } from 'react';
import { searchService, leadsService } from '../api/services';
import { LeadTable } from '../components/LeadTable';
import { Search, MapPin, Sliders, ShieldCheck, Sparkles, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export const LeadDiscovery: React.FC = () => {
  const [category, setCategory] = useState('Restaurant');
  const [location, setLocation] = useState('Ahmedabad');
  const [radius, setRadius] = useState(5000);
  const [maxResults, setMaxResults] = useState(15);
  const [multiCategory, setMultiCategory] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [dupesCount, setDupesCount] = useState<number>(0);
  const [notification, setNotification] = useState<string>('');

  const categoriesList = [
    'Restaurant', 'Cafe', 'Hotel', 'Gym', 'Salon', 'Hospital',
    'School', 'Real Estate', 'Clinic', 'Electronics', 'Furniture', 'Plumber'
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotification('');

    try {
      const data = await searchService.runSearch({
        category,
        location,
        radius,
        max_results: maxResults,
        multi_category: multiCategory,
      });

      setResults(data);
      setNotification(`Scan complete! ${data.length} unique business leads retrieved.`);
    } catch (err: any) {
      setNotification(`Error executing search: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (businessId: number) => {
    try {
      await leadsService.saveLead(businessId);
      setNotification('Lead successfully saved to CRM!');
    } catch (err: any) {
      setNotification(`Failed to save lead: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Multi-Tier Lead Scraper Engine</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">AI Business Lead Discovery</h1>
        <p className="text-xs text-slate-400 mt-1">
          Prospect local business opportunities with automated 4-tier deduplication and technical audit scores.
        </p>
      </div>

      {/* Search Filter Box */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-2xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Business Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Niche / Industry</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Dentists, Gyms"
                  className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Target Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">City / Location</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Ahmedabad, Mumbai"
                  className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Max Results */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Max Prospects</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full glass-input px-3 py-2.5 rounded-xl text-xs"
              >
                <option value={10}>10 Prospects</option>
                <option value={15}>15 Prospects</option>
                <option value={25}>25 Prospects</option>
                <option value={50}>50 Prospects</option>
              </select>
            </div>

            {/* Search Action Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Scraping & Auditing...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Execute Lead Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-500 font-semibold mr-1">Quick Select:</span>
            {categoriesList.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  category === cat
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Notification Bar */}
      {notification && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-purple-400" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-white tracking-tight">Discovered Business Prospects</h2>
          {results.length > 0 && (
            <span className="text-xs text-slate-400 font-semibold">
              Showing <strong className="text-white">{results.length}</strong> unique leads
            </span>
          )}
        </div>

        <LeadTable leads={results} onSaveLead={handleSaveLead} isLoading={loading} />
      </div>
    </div>
  );
};
