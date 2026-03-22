import { Globe, Bug, Shield } from 'lucide-react';
import RiskBadge from './RiskBadge';

const ThreatCard = ({ result, onClick }) => {
  const isPhishing = result.scan_type === 'phishing';
  const isThreat =
    result.prediction === 'phishing' || result.prediction === 'malicious';

  const Icon = isPhishing ? Globe : Bug;

  const timeAgo = (timestamp) => {
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
    <div
      onClick={onClick}
      className={`bg-white/5 backdrop-blur-sm border ${isThreat ? 'border-danger/10 hover:border-danger/30 hover:shadow-glow-danger/20' : 'border-white/5 hover:border-white/20 hover:shadow-glow-primary/10'} rounded-2xl p-4 transition-all duration-300 cursor-pointer hover:-translate-y-0.5 group`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2.5 rounded-xl shadow-inner border ${
            isThreat ? 'bg-danger/10 border-danger/20' : 'bg-success/10 border-success/20'
          }`}
        >
          <Icon
            className={`${isThreat ? 'text-danger drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' : 'text-success drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'}`}
            size={20}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
              {result.scan_type}
            </span>
            <span
              className={`text-xs text-xs px-1.5 py-0.5 rounded uppercase tracking-wider font-bold ${
                isThreat ? 'bg-danger/20 text-danger border border-danger/20' : 'bg-success/20 text-success border border-success/20'
              }`}
            >
              {result.prediction}
            </span>
          </div>

          <div className="text-sm text-white font-medium truncate mb-2.5 group-hover:text-primary transition-colors">
            {result.input_value}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">
              {(result.confidence * 100).toFixed(1)}% confidence
            </span>
            <RiskBadge level={result.risk_level} />
            <span className="text-xs text-text-muted ml-auto">
              {result.timestamp ? timeAgo(result.timestamp) : 'recent'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatCard;
