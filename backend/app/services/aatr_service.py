"""
AATR Service — Autonomous Adaptive Threat Response.

Uses an Isolation Forest anomaly detector combined with the ML confidence
score to determine an automated triage action: block / quarantine / warn / watch.
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from pathlib import Path
from app.config import settings
from app.utils.logger import log_startup, log_error


class AATRService:
    def __init__(self):
        self.isolation_forest: IsolationForest | None = None
        self._stats = {
            "phishing": {"total": 0, "block": 0, "quarantine": 0, "warn": 0, "watch": 0},
            "malware":  {"total": 0, "block": 0, "quarantine": 0, "warn": 0, "watch": 0},
        }

    # ------------------------------------------------------------------ #
    #  Startup                                                             #
    # ------------------------------------------------------------------ #
    def load_or_train(self):
        models_dir = Path(settings.ML_MODELS_DIR)
        iso_path = models_dir / "isolation_forest.pkl"
        try:
            import joblib
            if iso_path.exists():
                self.isolation_forest = joblib.load(str(iso_path))
                log_startup(f"Isolation Forest loaded ← {iso_path.name}")
            else:
                raise FileNotFoundError("No isolation_forest.pkl found — training fallback")
        except Exception as e:
            log_error(f"AATR: {e}")
            log_startup("AATR: Training fallback Isolation Forest on random normal data…")
            rng = np.random.default_rng(42)
            X_train = rng.standard_normal((500, 12))
            self.isolation_forest = IsolationForest(
                n_estimators=100, contamination=0.05, random_state=42
            )
            self.isolation_forest.fit(X_train)
            log_startup("AATR: Fallback Isolation Forest trained ✓")

    # ------------------------------------------------------------------ #
    #  Triage                                                              #
    # ------------------------------------------------------------------ #
    def triage(self, confidence: float, prediction: str, engine: str) -> str:
        """
        Input : confidence score from ML model (0-1), prediction string, engine name
        Returns: action string: block / quarantine / warn / watch
        """
        # 1. Immediate override for legitimate/benign
        # AATR only escalates if the model agrees there's a threat.
        if prediction.lower() in ["legitimate", "benign"]:
            action = "watch"
        else:
            # 2. Anomaly blending logic for threats (phishing/malicious)
            anomaly_score = 0.0
            if self.isolation_forest is not None:
                try:
                    # Input vector for Isolation Forest (using confidence as primary feature)
                    sample = np.array([[confidence] + [0.0] * 11])
                    raw = self.isolation_forest.score_samples(sample)[0]
                    # Normalise to [0, 1] where 1 = very anomalous
                    anomaly_score = max(0.0, min(1.0, (-raw + 0.5)))
                except Exception:
                    anomaly_score = 0.0

            # Blend: weight ML confidence heavily, nudge with anomaly
            blended = min(1.0, confidence * 0.85 + anomaly_score * 0.15)

            if blended >= settings.AATR_BLOCK_THRESHOLD:
                action = "block"
            elif blended >= settings.AATR_QUARANTINE_THRESHOLD:
                action = "quarantine"
            elif blended >= settings.AATR_WARN_THRESHOLD:
                action = "warn"
            else:
                action = "watch"

        # Update stats
        if engine in self._stats:
            self._stats[engine]["total"] += 1
            self._stats[engine][action] += 1
        else:
            self._stats[engine] = {"total": 1, "block": 0, "quarantine": 0, "warn": 0, "watch": 0}
            self._stats[engine][action] = 1

        return action

    # ------------------------------------------------------------------ #
    #  Stats                                                               #
    # ------------------------------------------------------------------ #
    def get_stats(self) -> dict:
        return {
            "phishing": dict(self._stats["phishing"]),
            "malware":  dict(self._stats["malware"]),
            "thresholds": {
                "block": settings.AATR_BLOCK_THRESHOLD,
                "quarantine": settings.AATR_QUARANTINE_THRESHOLD,
                "warn": settings.AATR_WARN_THRESHOLD,
            },
            "model": "IsolationForest" if self.isolation_forest is not None else "none",
        }

    @property
    def is_ready(self) -> bool:
        return self.isolation_forest is not None


# Singleton instance
aatr_service = AATRService()
