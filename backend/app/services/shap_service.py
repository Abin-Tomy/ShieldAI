"""
SHAP Service — loads SHAP explainers, computes top-5 feature
importances, and generates plain-English threat reports.
"""
import joblib
import numpy as np
from pathlib import Path
from app.config import settings
from app.utils.logger import log_startup, log_error


class ShapService:
    def __init__(self):
        self.phishing_explainer = None
        self.malware_explainer = None

    # ------------------------------------------------------------------ #
    #  Startup                                                             #
    # ------------------------------------------------------------------ #
    def load_explainers(self):
        models_dir = Path(settings.ML_MODELS_DIR)

        try:
            ph_path = models_dir / "phishing_explainer.pkl"
            self.phishing_explainer = joblib.load(str(ph_path))
            log_startup(f"Phishing SHAP explainer loaded ← {ph_path.name}")
        except Exception as e:
            log_error(f"Phishing SHAP explainer load failed: {e}")

        try:
            mw_path = models_dir / "malware_explainer.pkl"
            self.malware_explainer = joblib.load(str(mw_path))
            log_startup(f"Malware SHAP explainer loaded  ← {mw_path.name}")
        except Exception as e:
            log_error(f"Malware SHAP explainer load failed: {e}")

    # ------------------------------------------------------------------ #
    #  Helper — extract top-5 SHAP features                               #
    # ------------------------------------------------------------------ #
    def _top_features(
        self,
        explainer,
        feature_array: np.ndarray,
        feature_names: list[str],
    ) -> list[dict]:
        try:
            shap_values = explainer(feature_array)

            # Handle both old (array) and new (Explanation) SHAP API
            if hasattr(shap_values, "values"):
                vals = np.array(shap_values.values).flatten()
            else:
                vals = np.array(shap_values).flatten()

            feature_vals = feature_array.flatten()
            # Pad / truncate names to match vals length
            names = list(feature_names) + [f"feature_{i}" for i in range(len(vals))]
            names = names[: len(vals)]

            # Sort by absolute SHAP value descending
            indices = np.argsort(np.abs(vals))[::-1][:5]

            result = []
            for idx in indices:
                sv = float(vals[idx])
                result.append(
                    {
                        "name": names[idx],
                        "shap_value": round(sv, 6),
                        "feature_value": round(float(feature_vals[idx]), 6)
                        if idx < len(feature_vals)
                        else 0.0,
                        "direction": "increases_risk" if sv > 0 else "decreases_risk",
                    }
                )
            return result
        except Exception as e:
            log_error(f"SHAP explanation failed: {e}")
            return []

    # ------------------------------------------------------------------ #
    #  Public explain methods                                              #
    # ------------------------------------------------------------------ #
    def explain_phishing(
        self, feature_array: np.ndarray, feature_names: list[str]
    ) -> list[dict]:
        if self.phishing_explainer is None:
            return []
        return self._top_features(self.phishing_explainer, feature_array, feature_names)

    def explain_malware(
        self, feature_array: np.ndarray, feature_names: list[str]
    ) -> list[dict]:
        if self.malware_explainer is None:
            return []
        return self._top_features(self.malware_explainer, feature_array, feature_names)

    # ------------------------------------------------------------------ #
    #  Threat report generator                                             #
    # ------------------------------------------------------------------ #
    def generate_threat_report(
        self,
        engine: str,
        prediction: str,
        confidence: float,
        top_features: list[dict],
    ) -> str:
        pct = round(confidence * 100)

        if engine == "phishing":
            if prediction == "phishing":
                indicators = self._format_indicators(top_features, engine)
                return (
                    f"This URL was classified as phishing with {pct}% confidence. "
                    f"Key indicators: {indicators}. "
                    f"Do not enter any credentials on this page."
                )
            else:
                return (
                    f"This URL appears legitimate with {pct}% confidence. "
                    f"No significant phishing indicators were detected. "
                    f"Exercise standard caution when sharing sensitive information online."
                )
        else:  # malware
            if prediction == "malicious":
                indicators = self._format_indicators(top_features, engine)
                return (
                    f"This file was classified as malicious with {pct}% confidence. "
                    f"Key indicators: {indicators}. "
                    f"Delete this file immediately and run a full system scan."
                )
            else:
                return (
                    f"This file appears benign with {pct}% confidence. "
                    f"No significant malware indicators were detected. "
                    f"Continue to exercise caution with files from untrusted sources."
                )

    @staticmethod
    def _format_indicators(features: list[dict], engine: str) -> str:
        if not features:
            return "no specific indicators available"
        parts = []
        for f in features[:3]:
            name = f["name"].replace("_", " ").lower()
            val = f["feature_value"]
            parts.append(f"{name} ({val:.3g})")
        return ", ".join(parts)

    @property
    def is_ready(self) -> bool:
        return self.phishing_explainer is not None and self.malware_explainer is not None


# Singleton instance
shap_service = ShapService()
