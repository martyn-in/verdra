"""
AgriVisionAI — Diseases Route
GET /api/diseases — List all diseases from knowledgebase.
GET /api/diseases/{disease_id} — Get specific disease info.
POST /api/assistant — AI Farmer Assistant.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from services import recommendation_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/diseases")
async def list_diseases(
    crop: str = Query(default=None),
    pathogen_type: str = Query(default=None),
    risk_level: str = Query(default=None),
    search: str = Query(default=None),
):
    """List all diseases, optionally filtered."""
    diseases = recommendation_service.get_all_diseases()

    if crop:
        diseases = [d for d in diseases if d["crop"].lower() == crop.lower()]
    if pathogen_type:
        diseases = [d for d in diseases if d.get("pathogen_type", "").lower() == pathogen_type.lower()]
    if risk_level:
        diseases = [d for d in diseases if d.get("risk_level", "").lower() == risk_level.lower()]
    if search:
        search_lower = search.lower()
        diseases = [d for d in diseases if
                    search_lower in d["name"].lower() or
                    search_lower in d.get("description", "").lower() or
                    search_lower in d["crop"].lower()]

    return {"diseases": diseases, "count": len(diseases)}


@router.get("/diseases/{disease_id}")
async def get_disease(disease_id: str):
    """Get detailed information about a specific disease."""
    disease = recommendation_service.get_disease_by_id(disease_id)
    if disease is None:
        raise HTTPException(status_code=404, detail=f"Disease '{disease_id}' not found.")
    return disease


@router.post("/recommendations")
async def get_recommendations(
    disease_class: str = Query(...),
    severity: str = Query(default=None),
):
    """Get recommendations for a detected disease."""
    result = recommendation_service.get_recommendations(disease_class, severity)
    return result


class AssistantRequest(BaseModel):
    question: str
    context: Optional[dict] = None


@router.post("/assistant")
async def ai_assistant(request: AssistantRequest):
    """AI Farmer Assistant — contextual crop health guidance."""
    response = recommendation_service.get_assistant_response(
        question=request.question,
        context=request.context,
    )
    return {
        "response": response,
        "disclaimer": "AgriVisionAI provides AI-assisted crop screening and decision support. Severe or uncertain cases should be confirmed by an agricultural expert."
    }
