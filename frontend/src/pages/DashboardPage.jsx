import { useState, useEffect } from 'react';
import {
  Activity,
  Shield,
  Database,
  Clock,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link2,
  Cpu,
  Zap,
  Radio,
  BarChart3
} from 'lucide-react';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';
import InfoTooltip from '../components/InfoTooltip';
import useAppStore from '../store/appStore';
import { getHealth, getIntelStatus, getMaclStatus, getAatrStats, refreshIntel } from '../services/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'status', 'defense'

  const {
    scanHistory,
    systemStatus,
    intelStatus,
    maclStatus,
    aatrStats,
    setSystemStatus,
    setIntelStatus,
    setMaclStatus,
    setAatrStats,
  } = useAppStore();

  const loadData = async () => {
    try {
      const [health, intel, macl, aatr] = await Promise.all([
        getHealth(),
        getIntelStatus(),
        getMaclStatus(),
        getAatrStats(),
      ]);

      setSystemStatus(health);
      setIntelStatus(intel);
      setMaclStatus(macl);
      setAatrStats(aatr);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleRefreshIntel = async () => {
    setRefreshing(true);
    try {
      await refreshIntel();
      toast.success('Intel feed refreshed');
      await loadData();
    } catch (error) {
      toast.error('Failed to refresh intel feed');
    } finally {
      setRefreshing(false);
    }
  };

  // derived state
  const totalScans = scanHistory.length;
  const threatsDetected = scanHistory.filter(
    (s) => s.prediction === 'phishing' || s.prediction === 'malicious'
  ).length;
  const safeItems = totalScans - threatsDetected;
  
  const aatrPhishingProcess = aatrStats?.phishing?.total || 0;
  const aatrMalwareProcess = aatrStats?.malware?.total || 0;
  const aatrTotalProcessed = aatrPhishingProcess + aatrMalwareProcess;

  const blockedCount = (aatrStats?.phishing?.block || 0) + (aatrStats?.malware?.block || 0);
  const quarantinedCount = (aatrStats?.phishing?.quarantine || 0) + (aatrStats?.malware?.quarantine || 0);

  const intelDomains = intelStatus?.domains_cached || 0;
  const maclQueue = maclStatus?.total_queued || 0;

  const allChecksPass =
    systemStatus?.checks &&
    Object.values(systemStatus.checks).every((v) => v === true);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
          <p className="text-text-muted text-sm">Threat overview & system health</p>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner self-start flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Threat Overview
          </button>
          <button
            onClick={() => setActiveTab('defense')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'defense'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            Intelligence & Defense
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'status'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            System Status
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Scans"
              value={totalScans}
              icon={Activity}
              color="primary"
              info="The total number of URLs and files scanned by the system"
            />
            <StatCard
              title="Threats Detected"
              value={threatsDetected}
              icon={Shield}
              color="danger"
              info="Total phishing links or malicious files discovered"
            />
            <StatCard
              title="Threats Blocked"
              value={blockedCount}
              icon={ShieldAlert}
              color="danger"
              info="Threats automatically blocked by the triage engine"
            />
            <StatCard
              title="Quarantined"
              value={quarantinedCount}
              icon={AlertTriangle}
              color="warning"
              info="Suspicious items isolated waiting for final verification"
            />
          </div>

          <div className="p-8 bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl flex flex-col items-center justify-center text-center">
             <Shield className="text-primary/50 mb-4" size={48} />
             <h3 className="text-xl font-bold text-white mb-2">Automated Defense Active</h3>
             <p className="text-text-muted max-w-md mx-auto text-sm">
               Your system is actively monitoring threats. Visit the Scan page to manually analyze files and URLs, or switch to the tabs above to check backend services.
             </p>
          </div>
        </div>
      )}

      {activeTab === 'status' && (
        <div className="space-y-6 animate-fade-in flex justify-center">
          <div className="w-full max-w-xl">
             <div className={`p-6 bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl relative overflow-hidden`}>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 pointer-events-none ${allChecksPass ? 'bg-success/10' : 'bg-danger/20'}`}></div>
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center font-bold text-white">
                  Server Status
                  <InfoTooltip text="Checks if the backend API and machine learning models are running" />
                </div>
                {allChecksPass ? (
                   <span className="px-2.5 py-1 bg-success/20 text-success text-xs font-bold rounded">ONLINE</span>
                ) : (
                   <span className="px-2.5 py-1 bg-danger/20 text-danger text-xs font-bold rounded">OFFLINE</span>
                )}
              </div>
              <div className="space-y-3 mt-4">
                 {systemStatus?.checks && Object.entries(systemStatus.checks).map(([key, value]) => (
                   <div key={key} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                      <span className="text-sm text-text-muted capitalize">{key.replace('_', ' ')}</span>
                      {value ? <CheckCircle className="text-success" size={18}/> : <XCircle className="text-danger" size={18}/>}
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'defense' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Intel Feed */}
            <div className="p-6 bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center font-bold text-white gap-2">
                  <Database size={18} className="text-primary" />
                  Intelligence Feed
                  <InfoTooltip text="Database of known bad domains updated automatically to catch new threats" />
                </div>
                <button onClick={handleRefreshIntel} disabled={refreshing} className="text-text-muted hover:text-primary transition-colors">
                  <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl text-center mb-4 flex-grow flex flex-col justify-center">
                <div className="text-4xl font-black text-white">{intelDomains.toLocaleString()}</div>
                <div className="text-xs text-text-muted uppercase tracking-wider mt-2">Domains Cached</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                  <Link2 size={16} className="text-text-muted"/>
                  <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Source</div>
                    <div className="text-sm font-medium text-white truncate">Global Feeds</div>
                  </div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3 overflow-hidden">
                  <Clock size={16} className="text-text-muted flex-shrink-0"/>
                  <div className="min-w-0">
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Refreshed</div>
                    <div className="text-sm font-medium text-white truncate">
                      {intelStatus?.last_refresh ? new Date(intelStatus.last_refresh).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AATR Card */}
            <div className="p-6 bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl flex flex-col">
              <div className="flex items-center font-bold text-white mb-4 gap-2">
                <Zap size={18} className="text-primary" />
                AATR Engine
                <InfoTooltip text="Automated Active Threat Triage - Engine that decides if a scanned item should be blocked or placed in quarantine" />
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl text-center mb-4 flex-grow flex flex-col justify-center">
                <div className="text-4xl font-black text-white">{aatrTotalProcessed.toLocaleString()}</div>
                <div className="text-xs text-text-muted uppercase tracking-wider mt-2">Threats Processed</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                  <ShieldAlert size={16} className="text-danger flex-shrink-0"/>
                  <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Blocked</div>
                    <div className="text-sm font-medium text-white">{blockedCount}</div>
                  </div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3">
                  <AlertTriangle size={16} className="text-warning flex-shrink-0"/>
                  <div>
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Quarantined</div>
                    <div className="text-sm font-medium text-white">{quarantinedCount}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* MACL Queue */}
            <div className="p-6 bg-surface/40 backdrop-blur-md border border-white/5 shadow-glass rounded-2xl flex flex-col">
              <div className="flex items-center font-bold text-white mb-4 gap-2">
                <Cpu size={18} className="text-primary" />
                Retraining (MACL)
                <InfoTooltip text="Machine Adaptive Continual Learning - Collects new threat samples to automatically retrain the AI" />
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl text-center mb-4 flex-grow flex flex-col justify-center relative overflow-hidden">
                <div className={`absolute bottom-0 left-0 w-full h-1 ${maclQueue >= 50 ? 'bg-success' : 'bg-primary/50'}`}></div>
                <div className="text-4xl font-black text-white">{maclQueue}</div>
                <div className="text-xs text-text-muted uppercase tracking-wider mt-2">Samples Waiting</div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3 overflow-hidden">
                  <BarChart3 size={16} className="text-text-muted flex-shrink-0"/>
                  <div className="min-w-0">
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Threshold</div>
                    <div className="text-sm font-medium text-white truncate">50 Samples</div>
                  </div>
                </div>
                <div className="bg-black/20 p-3 rounded-lg flex items-center gap-3 overflow-hidden">
                  <Radio size={16} className={`flex-shrink-0 ${maclQueue >= 50 ? "text-success animate-pulse" : "text-text-muted"}`}/>
                  <div className="min-w-0">
                    <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Status</div>
                    <div className={`text-sm font-medium truncate ${maclQueue >= 50 ? 'text-success' : 'text-white'}`}>
                      {maclQueue >= 50 ? 'Ready' : 'Collecting'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
