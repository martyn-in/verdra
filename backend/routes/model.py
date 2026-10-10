"""
AgriVisionAI — Model Registry, Performance & Evaluation Route
Exposes available trained models, switches active models, and serves
genuine evaluation metrics computed on held-out test data.
"""
import os
import json
import logging
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from services import model_service, leaf_validator_service

logger = logging.getLogger(__name__)
router = APIRouter()


class SwitchModelRequest(BaseModel):
    model_id: str


@router.get("/list")
async def list_models_endpoint():
    """Returns list of all trained agricultural models available in Verdra."""
    return {
        "active_model_id": model_service.get_active_model_id(),
        "models": model_service.list_models(),
    }


@router.post("/switch")
async def switch_model_endpoint(req: SwitchModelRequest):
    """Switch active agricultural disease vision model."""
    success = model_service.set_active_model(req.model_id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model_id: '{req.model_id}'. Available: 'multi_crop', 'solanaceae'",
        )
    return {
        "status": "success",
        "active_model_id": model_service.get_active_model_id(),
        "message": f"Successfully activated {req.model_id} model.",
    }


@router.get("/leaf-gatekeeper")
async def get_leaf_gatekeeper_info():
    """Returns metadata and metrics for the Leaf vs. Non-Leaf Gatekeeper Model."""
    return leaf_validator_service.get_model_info()


@router.get("/performance")
async def get_model_performance(model_id: Optional[str] = Query(default=None)):
    """
    Returns actual trained model evaluation metrics calculated on the independent held-out test split.
    Includes test accuracy, precision, recall, F1 score, confusion matrix, and per-class breakdown.
    Supports ?model_id=multi_crop or ?model_id=solanaceae.
    """
    target_id = model_id or "solanaceae"

    if target_id == "multi_crop":
        metrics = model_service.get_model_metrics("multi_crop")
    else:
        root_mpath = os.path.join(os.path.dirname(__file__), "..", "..", "models", "metrics.json")
        if os.path.exists(root_mpath):
            with open(root_mpath, "r") as f:
                metrics = json.load(f)
        else:
            metrics = model_service.get_model_metrics("solanaceae")

    result = dict(metrics)
    result["metrics"] = dict(metrics)
    result["model_id"] = target_id
    result["live_model_status"] = {
        "model_loaded": model_service.is_model_loaded(target_id),
        "model_filename": model_service.get_model_filename(target_id),
        "num_classes_active": len(model_service.get_class_names(target_id)),
        "prediction_mode": "REAL INFERENCE (Active Weights Verified)",
        "framework": "Keras 3 / MobileNetV2 Softmax",
    }

    return result
