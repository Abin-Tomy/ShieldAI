import { useState } from 'react';
import { Clock, Globe, Bug, Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import RiskBadge from '../components/RiskBadge';
import ShapChart from '../components/ShapChart';
import useAppStore from '../store/appStore';

const HistoryPage = () => {
  const { scanHistory } = useAppStore();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedScan, setSelectedScan] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Filter scans
  let filteredScans = scanHistory;

  if (filter !== 'all') {
    filteredScans = filteredScans.filter((s) => s.scan_type === filter);
  }

  if (searchTerm) {
    filteredScans = filteredScans.filter((s) =>
      s.input_value?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort scans
  filteredScans = [...filteredScans].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  // Pagination
  const totalPages = Math.ceil(filteredScans.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedScans = filteredScans.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const timeAgo = (timestamp) => {
    if (!timestamp) return 'just now';
    const now = new Date();
    const scanTime = new Date(timestamp);
    const diffMs = now - scanTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner">
            <Clock className="text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
              Scan History
            </h1>
            <p className="text-text-muted font-medium mt-1">
              {filteredScans.length} scan{filteredScans.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[10px] font-bold text-text-muted/80 uppercase tracking-widest mb-1 mr-1">Total Scans</div>
          <div className="px-5 py-2 bg-black/20 border border-white/10 text-white rounded-xl font-black text-xl shadow-inner backdrop-blur-sm">
            {scanHistory.length}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-4 relative z-10">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            {['all', 'phishing', 'malware'].map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setCurrentPage(1);
                }}
                className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-glow-primary'
                    : 'bg-black/20 text-text-muted hover:text-white border border-white/5 hover:border-white/10 shadow-inner'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted/60"
              size={18}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by URL or filename..."
              className="w-full pl-11 pr-5 py-3 bg-black/20 border border-white/10 rounded-xl text-white placeholder-text-muted/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:bg-black/40 shadow-inner transition-all text-sm font-medium"
            />
          </div>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-5 py-3 bg-black/20 border border-white/10 rounded-xl text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-inner transition-all text-sm font-medium outline-none appearance-none"
          >
            <option value="newest" className="bg-[#0f172a] text-white">Newest first</option>
            <option value="oldest" className="bg-[#0f172a] text-white">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {paginatedScans.length === 0 ? (
        <div className="bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-3xl p-16 text-center">
          <Shield className="mx-auto text-text-muted/50 mb-5" size={56} />
          <p className="text-white font-bold text-lg mb-2 tracking-wide">No scans yet</p>
          <p className="text-sm font-medium text-text-muted/80">
            Start by scanning a URL or file on the dashboard
          </p>
        </div>
      ) : (
        <>
          <div className="bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/30 border-b border-white/5">
                  <tr>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white uppercase tracking-widest">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Input
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Prediction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Risk
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase">
                      Time
                    </th>
                    <th className="px-5 py-4 text-left text-[10px] font-bold text-white uppercase tracking-widest">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedScans.map((scan, idx) => {
                    const Icon = scan.scan_type === 'phishing' ? Globe : Bug;
                    const isThreat =
                      scan.prediction === 'phishing' ||
                      scan.prediction === 'malicious';

                    return (
                      <tr
                        key={idx}
                        className="hover:bg-white/5 transition-colors group cursor-default"
                      >
                        <td className="px-5 py-4">
                          <div
                            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                              scan.scan_type === 'phishing'
                                ? 'bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_8px_rgba(59,130,246,0.1)]'
                                : 'bg-danger/10 text-danger border-danger/20 shadow-[inset_0_0_8px_rgba(239,68,68,0.1)]'
                            }`}
                          >
                            <Icon size={14} />
                            {scan.scan_type}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-medium text-white max-w-xs truncate group-hover:text-primary transition-colors">
                          {scan.input_value}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-[10px] uppercase tracking-widest font-bold ${
                              isThreat ? 'text-danger drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-success drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                            }`}
                          >
                            {scan.prediction}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-text-muted/90 font-mono">
                          {(scan.confidence * 100).toFixed(1)}%
                        </td>
                        <td className="px-5 py-4">
                          <RiskBadge level={scan.risk_level} />
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${
                              scan.aatr_action === 'block'
                                ? 'bg-danger/10 text-danger border-danger/20'
                                : scan.aatr_action === 'quarantine'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-success/10 text-success border-success/20'
                            }`}
                          >
                            {scan.aatr_action}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[11px] font-semibold text-text-muted uppercase tracking-widest">
                          {timeAgo(scan.timestamp)}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => setSelectedScan(scan)}
                            className="px-4 py-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:shadow-glow-primary"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-text-muted/80">
                Showing {startIndex + 1} to{' '}
                {Math.min(startIndex + itemsPerPage, filteredScans.length)} of{' '}
                {filteredScans.length}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-black/20 border border-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/20 transition-all shadow-inner text-white group"
                >
                  <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <span className="px-5 py-2 bg-primary/10 border border-primary/20 rounded-xl text-sm font-bold text-primary shadow-inner flex items-center shadow-glow-primary/50">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-black/20 border border-white/10 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/5 hover:border-white/20 transition-all shadow-inner text-white group"
                >
                  <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Details Modal */}
      {selectedScan && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedScan(null)}
        >
          <div
            className="bg-surface/80 backdrop-blur-2xl border border-white/10 shadow-glass rounded-3xl max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-8 py-6 border-b border-white/5 flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full shadow-glow-primary"></div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Scan Metrics & Intelligence
              </h3>
            </div>
            <div className="p-8 space-y-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
              
              {/* SHAP Explanation */}
              {selectedScan.shap_explanation &&
                selectedScan.shap_explanation.length > 0 && (
                  <div className="relative z-10">
                    <h4 className="text-xs font-bold text-text-muted/80 uppercase tracking-widest mb-6 border-b border-white/5 pb-3">
                      Factor Analysis
                    </h4>
                    <div className="p-2 bg-black/20 border border-white/5 rounded-2xl shadow-inner">
                      <ShapChart features={selectedScan.shap_explanation} />
                    </div>
                  </div>
                )}

              {/* Threat Report */}
              {selectedScan.threat_report && (
                <div className="relative z-10">
                  <h4 className="text-xs font-bold text-text-muted/80 uppercase tracking-widest mb-4 border-b border-white/5 pb-3">
                    Threat Dossier
                  </h4>
                  <p className="text-text-muted font-mono text-sm leading-relaxed p-5 bg-black/30 border border-white/5 rounded-2xl shadow-inner">
                    {selectedScan.threat_report}
                  </p>
                </div>
              )}
            </div>
            <div className="px-8 py-6 border-t border-white/5 bg-black/10">
              <button
                onClick={() => setSelectedScan(null)}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold tracking-wide py-3.5 rounded-xl transition-all shadow-inner hover:shadow-glow-primary"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
