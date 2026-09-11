"""
AgriVisionAI — Grad-CAM Route
POST /api/gradcam — Generate Grad-CAM attention heatmap from real model.
"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from services import gradcam_service, model_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/gradcam")
async def generate_gradcam(
    file: UploadFile = File(...),
    class_index: int = Form(default=None),
):
    """
    Generate dynamic Grad-CAM explainability heatmap from the real inference model.
    If model is not configured, returns 503 error.
    """
    if not model_service.is_model_loaded():
        model_service.load_model()

    if not model_service.is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="AI model not configured: Trained model weights ('agri_vision_model.keras') are missing or not loaded."
        )

    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    try:
        result = gradcam_service.generate_gradcam(image_bytes, class_index=class_index)
        return result
    except RuntimeError as re:
        logger.error(f"Grad-CAM model error: {re}")
        raise HTTPException(status_code=503, detail=str(re))
    except Exception as e:
        logger.error(f"Grad-CAM generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate attention map: {str(e)}")
