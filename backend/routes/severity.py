"""
AgriVisionAI — Severity Route
POST /api/severity — Estimate disease severity from image.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from services import severity_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/severity")
async def estimate_severity(file: UploadFile = File(...)):
    """Estimate disease severity from a crop leaf image."""
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    try:
        result = severity_service.estimate_severity(image_bytes)
        return result
    except Exception as e:
        logger.error(f"Severity estimation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to estimate severity.")
