"""
Health router — GET /api/health, GET /api/health/ready
"""
from fastapi import APIRouter
from app.config import settings
from app.services.ml_service import ml_service
from app.services.shap_service import shap_service
from app.services.intel_service import intel_service
from app.services.aatr_service import aatr_service

router = APIRouter()


@router.get("")
async def health_liveness():
    return {"status": "alive", "app": settings.APP_NAME, "version": settings.APP_VERSION}


@router.get("/ready")
async def health_readiness():
    checks = {
        "phishing_model": ml_service.phishing_model is not None,
        "malware_model": ml_service.malware_model is not None,
        "phishing_shap": shap_service.phishing_explainer is not None,
        "malware_shap": shap_service.malware_explainer is not None,
        "intel_feed": intel_service.is_ready,
        "aatr": aatr_service.is_ready,
    }
    all_ready = all(checks.values())
    return {
        "status": "ready" if all_ready else "degraded",
        "checks": checks,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
