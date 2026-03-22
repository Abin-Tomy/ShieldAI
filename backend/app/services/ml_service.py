"""
ML Service — loads XGBoost models at startup and provides
phishing and malware prediction methods.
"""
import os
import joblib
import numpy as np
import xgboost as xgb
from pathlib import Path
from app.config import settings
from app.utils.logger import log_startup, log_error


class MLService:
    def __init__(self):
        self.phishing_model: xgb.Booster | None = None
        self.phishing_scaler = None
        self.phishing_features: list[str] = []

        self.malware_model: xgb.Booster | None = None
        self.malware_features: list[str] = []

        self._loaded = False

    # ------------------------------------------------------------------ #
    #  Startup                                                             #
    # ------------------------------------------------------------------ #
    def load_models(self):
        models_dir = Path(settings.ML_MODELS_DIR)
        errors = []

        # — Phishing model —
        try:
            ph_model_path = models_dir / "phishing_model.pkl"
            ph_json_path  = models_dir / "phishing_model.json"
            if ph_model_path.exists():
                self.phishing_model = joblib.load(str(ph_model_path))
                log_startup(f"Phishing model loaded  (pkl) ← {ph_model_path.name}")
            elif ph_json_path.exists():
                self.phishing_model = xgb.Booster()
                self.phishing_model.load_model(str(ph_json_path))
                log_startup(f"Phishing model loaded  (json) ← {ph_json_path.name}")
            else:
                raise FileNotFoundError("No phishing model file found")
        except Exception as e:
            log_error(f"Phishing model load failed: {e}")
            errors.append(str(e))

        try:
            scaler_path = models_dir / "phishing_scaler.pkl"
            self.phishing_scaler = joblib.load(str(scaler_path))
            log_startup(f"Phishing scaler loaded ← {scaler_path.name}")
        except Exception as e:
            log_error(f"Phishing scaler load failed: {e}")
            errors.append(str(e))

        try:
            feat_path = models_dir / "phishing_features.pkl"
            self.phishing_features = joblib.load(str(feat_path))
            log_startup(f"Phishing features loaded ({len(self.phishing_features)} features)")
        except Exception as e:
            log_error(f"Phishing features load failed: {e}")
            errors.append(str(e))

        # — Malware model —
        try:
            mw_model_path = models_dir / "malware_model.pkl"
            mw_json_path  = models_dir / "malware_model.json"
            if mw_model_path.exists():
                self.malware_model = joblib.load(str(mw_model_path))
                log_startup(f"Malware model loaded   (pkl) ← {mw_model_path.name}")
            elif mw_json_path.exists():
                self.malware_model = xgb.Booster()
                self.malware_model.load_model(str(mw_json_path))
                log_startup(f"Malware model loaded   (json) ← {mw_json_path.name}")
            else:
                raise FileNotFoundError("No malware model file found")
        except Exception as e:
            log_error(f"Malware model load failed: {e}")
            errors.append(str(e))

        try:
            mw_feat_path = models_dir / "malware_features.pkl"
            self.malware_features = joblib.load(str(mw_feat_path))
            log_startup(f"Malware features loaded ({len(self.malware_features)} features)")
        except Exception as e:
            log_error(f"Malware features load failed: {e}")
            errors.append(str(e))

        self._loaded = True
        if errors:
            log_error(f"{len(errors)} model file(s) failed to load — running in degraded mode")
        else:
            log_startup("All ML models loaded successfully ✓")

    # ------------------------------------------------------------------ #
    #  Helpers                                                             #
    # ------------------------------------------------------------------ #
    @staticmethod
    def _risk_level(confidence: float) -> str:
        if confidence > 0.90:
            return "critical"
        if confidence > 0.70:
            return "high"
        if confidence > 0.50:
            return "medium"
        return "low"

    # ------------------------------------------------------------------ #
    #  Phishing prediction                                                 #
    # ------------------------------------------------------------------ #
    def predict_phishing(self, features: list[float]) -> tuple[str, float, str]:
        """
        Input : list of 20 floats (order matches phishing_features.pkl)
        Returns: (prediction_label, confidence, risk_level)
        """
        if self.phishing_model is None:
            raise RuntimeError("Phishing model is not loaded")

        arr = np.array(features, dtype=np.float32).reshape(1, -1)

        if self.phishing_scaler is not None:
            arr = self.phishing_scaler.transform(arr)

        feature_names = list(self.phishing_features) if self.phishing_features else None
        dmat = xgb.DMatrix(arr, feature_names=feature_names)
        prob = float(self.phishing_model.predict(dmat)[0])
        label = "phishing" if prob >= 0.5 else "legitimate"
        confidence = prob if prob >= 0.5 else 1.0 - prob
        return label, confidence, self._risk_level(prob)

    # ------------------------------------------------------------------ #
    #  Malware prediction                                                  #
    # ------------------------------------------------------------------ #
    def predict_malware(self, features: np.ndarray) -> tuple[str, float, str]:
        """
        Input : numpy array of 2381 floats (EMBER feature format)
        Returns: (prediction_label, confidence, risk_level)
        """
        if self.malware_model is None:
            raise RuntimeError("Malware model is not loaded")

        arr = features.reshape(1, -1).astype(np.float32)
        feature_names = list(self.malware_features) if self.malware_features else None
        dmat = xgb.DMatrix(arr, feature_names=feature_names)
        prob = float(self.malware_model.predict(dmat)[0])
        label = "malicious" if prob >= 0.5 else "benign"
        confidence = prob if prob >= 0.5 else 1.0 - prob
        return label, confidence, self._risk_level(prob)

    @property
    def is_ready(self) -> bool:
        return (
            self._loaded
            and self.phishing_model is not None
            and self.malware_model is not None
        )


# Singleton instance
ml_service = MLService()
