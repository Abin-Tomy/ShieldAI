"""
MACL Service — Multi-Source Active Continual Learning.
Manages the in-memory retraining queue for both engines.
"""
from app.config import settings
from app.utils.logger import log_macl


class MACLService:
    def __init__(self):
        self._queue: list[dict] = []

    # ------------------------------------------------------------------ #
    #  Add a sample to the queue                                           #
    # ------------------------------------------------------------------ #
    def add_sample(
        self,
        engine_type: str,
        feature_vector: list[float],
        label: int,
        source: str,
        confidence: float,
    ) -> None:
        """
        source: "model_high_confidence" or "human_label"
        Human labels → weight 2.0, model labels → weight 1.0
        """
        weight = 2.0 if source == "human_label" else 1.0

        sample = {
            "engine": engine_type,
            "features": feature_vector,
            "label": label,
            "source": source,
            "confidence": confidence,
            "weight": weight,
        }
        self._queue.append(sample)
        log_macl(engine_type, label, source, weight)

    # ------------------------------------------------------------------ #
    #  Stats                                                               #
    # ------------------------------------------------------------------ #
    def get_stats(self) -> dict:
        total = len(self._queue)
        by_engine: dict[str, int] = {}
        by_source: dict[str, int] = {}

        for item in self._queue:
            eng = item["engine"]
            src = item["source"]
            by_engine[eng] = by_engine.get(eng, 0) + 1
            by_source[src] = by_source.get(src, 0) + 1

        return {
            "total_queued": total,
            "by_engine": by_engine,
            "by_source": by_source,
            "ready_to_retrain": total >= settings.MACL_MIN_SAMPLES,
            "min_samples_threshold": settings.MACL_MIN_SAMPLES,
        }


# Singleton instance
macl_service = MACLService()
