const ShapChart = ({ features }) => {
  if (!features || features.length === 0) {
    return (
      <div className="text-text-muted text-sm text-center py-4">
        No SHAP explanation available
      </div>
    );
  }

  // Take top 5 features
  const topFeatures = features.slice(0, 5);

  // Find max absolute value for scaling
  const maxValue = Math.max(
    ...topFeatures.map((f) => Math.abs(f.shap_value || 0))
  );

  return (
    <div className="space-y-3">
      {topFeatures.map((feature, index) => {
        const value = feature.shap_value || 0;
        const width = (Math.abs(value) / maxValue) * 100;
        const isRisky = feature.direction === 'increases_risk';

        return (
          <div key={index} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-text-primary font-medium">
                {feature.name}
              </span>
              <span className="text-text-muted">
                {value >= 0 ? '+' : ''}
                {value.toFixed(3)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isRisky ? 'bg-danger' : 'bg-primary'
                  }`}
                  style={{ width: `${width}%` }}
                ></div>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  isRisky
                    ? 'bg-danger/20 text-danger'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                {isRisky ? 'Risk ↑' : 'Safe ↓'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ShapChart;
