import { Info } from 'lucide-react';
import { useState } from 'react';

const InfoTooltip = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center ml-2">
      <Info 
        className="w-4 h-4 text-text-muted hover:text-primary cursor-pointer transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <div className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 text-xs font-medium bg-surface border border-white/10 rounded-lg shadow-glass text-center text-white/90">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;
