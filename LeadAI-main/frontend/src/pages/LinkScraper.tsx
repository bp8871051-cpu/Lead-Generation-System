import React, { useState } from 'react';
import { searchService, leadsService } from '../api/services';
import { LeadTable } from '../components/LeadTable';
import { Link as LinkIcon, Search, RefreshCw, CheckCircle } from 'lucide-react';

export const LinkScraper: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [msg, setMsg] = useState('');

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setMsg('');

    try {
      const data = await searchService.scrapeLink(url);
      setResults(data);
      setMsg(`Link scraped successfully! ${data.length} directory leads found.`);
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (businessId: number) => {
    try {
      await leadsService.saveLead(businessId);
      setMsg('Lead saved to CRM!');
    } catch (err: any) {
      setMsg(`Failed to save: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Custom Directory Link Scraper</h1>
        <p className="text-xs text-slate-400 mt-1">
          Scrape specific local vendor directories or online listing URLs for unlisted contact leads.
        </p>
      </div>

      {/* URL Input Box */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 backdrop-blur-md shadow-2xl">
        <form onSubmit={handleScrape} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Directory URL</label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://directory.local/plumbers"
                className="w-full glass-input pl-9 pr-4 py-2.5 rounded-xl text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="py-2.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Crawling Web Page...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Scrape Directory Page</span>
              </>
            )}
          </button>
        </form>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-purple-400" />
          <span>{msg}</span>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-base font-extrabold text-white tracking-tight">Scraped Page Results</h2>
        <LeadTable leads={results} onSaveLead={handleSaveLead} isLoading={loading} />
      </div>
    </div>
  );
};
