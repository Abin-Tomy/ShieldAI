"""
Intel feed router — GET /api/intel/status, POST /api/intel/refresh
"""
from fastapi import APIRouter
from app.services.intel_service import intel_service

router = APIRouter()


@router.get("/status")
async def intel_status():
    return intel_service.get_status()


@router.post("/refresh")
async def intel_refresh():
    await intel_service.refresh_feed()
    return {"message": "Feed refreshed", **intel_service.get_status()}
