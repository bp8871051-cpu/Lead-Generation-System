import React, { useState, useEffect } from 'react';
import { leadsService, exportService, crmService } from '../api/services';
import { LeadTable } from '../components/LeadTable';
import { Search, Download, Filter, RefreshCw, LayoutGrid, List } from 'lucide-react';

export const SavedLeads: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [pipelineData, setPipelineData] = useState<Record<string, any[]>>({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [scoreCategory, setScoreCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');

  const loadLeads = async () => {
    setLoading(true);
    try {
      if (viewMode === 'table') {
        const data = await leadsService.getLeads({
          search_query: searchQuery,
          status,
          score_category: scoreCategory,
          sort_by: sortBy,
          order,
          limit: 50,
        });
        setLeads(data.leads || []);
        setTotal(data.total || 0);
      } else {
        const pData = await crmService.getPipeline();
        setPipelineData(pData || {});
      }
    } catch (err) {
      console.error('Failed to fetch saved leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [viewMode, searchQuery, status, scoreCategory, sortBy, order]);

  const handleDeleteLead = async (leadId: number) => {
    if (!window.confirm('Are you sure you want to remove this lead?')) return;
    try {
      await leadsService.deleteLead(leadId);
      loadLeads();
    } catch (err: any) {
      alert(err.message || 'Failed to delete lead');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">B2B Saved Leads & CRM Pipeline</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage saved prospect records, prioritize sales opportunities, and track CRM pipeline stages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="p-1 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'pipeline' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Pipeline</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <button
            onClick={() => exportService.downloadCsv()}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={() => exportService.downloadJson()}
            className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      {viewMode === 'table' && (
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-md flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name..."
              className="w-full glass-input pl-9 pr-4 py-2 rounded-xl text-xs"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-xs min-w-[130px]"
          >
            <option value="">All CRM Stages</option>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested">Interested</option>
            <option value="Meeting">Meeting</option>
            <option value="Proposal Sent">Proposal Sent</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </select>

          <select
            value={scoreCategory}
            onChange={(e) => setScoreCategory(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-xs min-w-[130px]"
          >
            <option value="">All Quality Scores</option>
            <option value="hot">Hot Prospects (75+)</option>
            <option value="warm">Warm Prospects (40-74)</option>
            <option value="cold">Cold Prospects (&lt;40)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-xs min-w-[130px]"
          >
            <option value="created_at">Sort by Date Added</option>
            <option value="score">Sort by Lead Score</option>
            <option value="rating">Sort by Google Rating</option>
            <option value="name">Sort by Name</option>
          </select>

          <button
            onClick={loadLeads}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* Main View Display */}
      {viewMode === 'table' ? (
        <LeadTable leads={leads} onDeleteLead={handleDeleteLead} isLoading={loading} />
      ) : (
        /* Kanban Pipeline View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {Object.entries(pipelineData).map(([stage, stageLeads]) => (
            <div key={stage} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col min-w-[260px]">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">{stage}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-purple-400 font-bold text-[11px]">
                  {stageLeads?.length || 0}
                </span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {stageLeads?.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-2 cursor-pointer"
                  >
                    <div className="font-bold text-xs text-white truncate">{lead.business?.name}</div>
                    <div className="text-[10px] text-slate-400">{lead.business?.city || 'Location'}</div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-purple-400 font-extrabold">Score: {lead.lead_score}</span>
                      <span className="text-slate-500">{lead.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
