import { useState } from 'react';
import { Shield, Globe, Bug } from 'lucide-react';
import PhishingScanPage from './PhishingScanPage';
import MalwareScanPage from './MalwareScanPage';

const ScanPage = () => {
  const [scanType, setScanType] = useState('phishing'); // 'phishing' or 'malware'

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Unified Header & Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 border border-primary/20 rounded-2xl shadow-inner">
            <Shield className="text-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">
              Threat Scanner
            </h1>
            <p className="text-text-muted font-medium mt-1">
              Analyze URLs for phishing or files for malware
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 shadow-inner">
          <button
            onClick={() => setScanType('phishing')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
              scanType === 'phishing'
                ? 'bg-primary text-white shadow-glow-primary'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Globe size={16} />
            URL / Phishing
          </button>
          <button
            onClick={() => setScanType('malware')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all ${
              scanType === 'malware'
                ? 'bg-danger text-white shadow-glow-danger'
                : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Bug size={16} />
            File / Malware
          </button>
        </div>
      </div>

      {/* Render selected scanner */}
      <div className="mt-4">
        {scanType === 'phishing' && <PhishingScanPage />}
        {scanType === 'malware' && <MalwareScanPage />}
      </div>
    </div>
  );
};

export default ScanPage;
