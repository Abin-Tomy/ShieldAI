"""
MACL router — GET /api/macl/status, POST /api/macl/label
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.macl_service import macl_service

router = APIRouter()


class HumanLabelRequest(BaseModel):
    scan_id: str
    engine: str
    label: int  # 0 or 1


@router.get("/status")
async def macl_status():
    return macl_service.get_stats()


@router.post("/label")
async def submit_label(body: HumanLabelRequest):
    if body.label not in (0, 1):
        raise HTTPException(status_code=400, detail="label must be 0 or 1")
    if body.engine not in ("phishing", "malware"):
        raise HTTPException(status_code=400, detail="engine must be 'phishing' or 'malware'")

    # No feature vector available from just a scan_id in this in-memory design;
    # submit a placeholder feature vector with human label source.
    macl_service.add_sample(
        engine_type=body.engine,
        feature_vector=[0.0],  # placeholder — real impl would look up features from DB
        label=body.label,
        source="human_label",
        confidence=1.0,
    )
    return {
        "message": "Human label queued",
        "scan_id": body.scan_id,
        "engine": body.engine,
        "label": body.label,
        **macl_service.get_stats(),
    }
