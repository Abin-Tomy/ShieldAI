import { useState } from 'react';
import { scanPhishing } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, ShieldAlert, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ThreatCard from '../components/ThreatCard';
import ShapChart from '../components/ShapChart';

const PhishingScanPage = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);

    try {
      const data = await scanPhishing(url);
      setResult(data);
      if (data.risk_level === 'high' || data.risk_level === 'critical') {
        toast.error('Threat detected!');
      } else {
        toast.success('Scan complete');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to scan URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in fade-in">
<div className="flex items-center space-x-4 mb-2">
        <div className="p-3 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-inner">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Phishing Analysis</h2>
          <p className="text-sm text-text-muted mt-0.5">Deep-scan any URL for phishing signatures</p>
        </div>
      </div>

      <div className="bg-black/20 border border-white/5 rounded-2xl p-6 shadow-inner">
        <form onSubmit={handleScan} className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-text-muted mb-2">
              Website URL
            </label>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all"
                required
              />
              <button
                type="submit"
                disabled={loading || !url}
                className="bg-primary hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-glow-primary min-w-[140px] flex justify-center items-center"
              >
                {loading ? <LoadingSpinner size="sm" /> : 'Scan URL'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {loading && (
        <div className="flex justify-center p-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <ThreatCard result={result} />
          
          {result.shap_explanation && (
            <ShapChart features={result.shap_explanation} />
          )}

          {result.aatr_decision && (
            <div className={`p-4 rounded-lg border ${
              result.aatr_decision === 'block' 
                ? 'bg-danger/10 border-danger/20 text-danger'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div>
                  <h4 className="font-semibold">AATR Decision: {result.aatr_decision.toUpperCase()}</h4>
                  <p className="text-sm opacity-90 mt-1">{result.aatr_reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhishingScanPage;
