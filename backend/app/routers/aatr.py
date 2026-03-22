"""
AATR router — GET /api/aatr/stats
"""
from fastapi import APIRouter
from app.services.aatr_service import aatr_service

router = APIRouter()


@router.get("/stats")
async def aatr_stats():
    return aatr_service.get_stats()
