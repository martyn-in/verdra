"""
AgriVisionAI — Risk Route
POST /api/risk — Calculate disease spread risk.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services import risk_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class RiskRequest(BaseModel):
    disease: str
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    rainfall: Optional[float] = None
    severity: Optional[str] = None
    infected_percentage: Optional[float] = 0


@router.post("/risk")
async def calculate_risk(request: RiskRequest):
    """Calculate disease spread risk based on environmental conditions."""
    try:
        result = risk_service.calculate_risk(
            disease=request.disease,
            temperature=request.temperature,
            humidity=request.humidity,
            rainfall=request.rainfall,
            severity=request.severity,
            infected_percentage=request.infected_percentage,
        )
        return result
    except Exception as e:
        logger.error(f"Risk calculation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate risk.")
