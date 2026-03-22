import InfoTooltip from './InfoTooltip';

const StatCard = ({ title, value, icon: Icon, color = 'primary', trend, info }) => {
  const colorClasses = {
    primary: 'text-primary bg-primary/10 border border-primary/20',
    success: 'text-success bg-success/10 border border-success/20',
    danger: 'text-danger bg-danger/10 border border-danger/20',
    warning: 'text-warning bg-warning/10 border border-warning/20',
  };

  const hoverShadow = {
    primary: 'hover:shadow-glow-primary hover:border-primary/40',
    success: 'hover:shadow-glow-success hover:border-success/40',
    danger: 'hover:shadow-glow-danger hover:border-danger/40',
    warning: 'hover:shadow-glow-warning hover:border-warning/40',
  };

  const topBorder = {
    primary: 'border-t-primary/50',
    success: 'border-t-success/50',
    danger: 'border-t-danger/50',
    warning: 'border-t-warning/50',
  };

  return (
    <div className={`bg-surface/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 ${topBorder[color]} relative overflow-hidden`}>
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl shadow-inner ${colorClasses[color]}`}>
          {Icon && <Icon size={22} className="drop-shadow-sm" />}
        </div>
        {trend && (
          <span
            className={`text-xs px-2 py-1 rounded ${
              trend > 0
                ? 'bg-success/20 text-success'
                : 'bg-danger/20 text-danger'
            }`}
          >
            {trend > 0 ? '+' : ''}
            {trend}%
          </span>
        )}
      </div>

      <div className="space-y-1 relative z-10">
        <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        <div className="flex items-center text-sm font-medium text-text-muted">
          {title}
          {info && <InfoTooltip text={info} />}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
