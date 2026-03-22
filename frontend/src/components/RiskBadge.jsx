const RiskBadge = ({ level }) => {
  const styles = {
    critical: 'bg-danger/20 text-danger border-danger/50',
    high: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
    medium: 'bg-warning/20 text-warning border-warning/50',
    low: 'bg-success/20 text-success border-success/50',
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium border ${
        styles[level] || styles.low
      }`}
    >
      {level?.toUpperCase()}
    </span>
  );
};

export default RiskBadge;
