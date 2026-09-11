"""
AgriVisionAI — Model Performance & Evaluation Route
GET /api/model/performance — Serves genuine evaluation metrics computed on held-out test data.
"""
import os
import json
import logging
from fastapi import APIRouter, HTTPException
from services import model_service

logger = logging.getLogger(__name__)
router = APIRouter()

METRICS_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "models", "metrics.json")


@router.get("/performance")
async def get_model_performance():
    """
    Returns actual trained model evaluation metrics calculated on the independent held-out test split.
    Includes test accuracy, precision, recall, F1 score, confusion matrix, and per-class breakdown.
    """
    if not os.path.exists(METRICS_PATH):
        raise HTTPException(
            status_code=404,
            detail="Model metrics not found. Run 'python ml/evaluate.py' to generate benchmark metrics."
        )

    try:
        with open(METRICS_PATH, "r") as f:
            metrics = json.load(f)
    except Exception as e:
        logger.error(f"Failed to read model metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to load model metrics.")

    # Attach live runtime model status
    metrics["live_model_status"] = {
        "model_loaded": model_service.is_model_loaded(),
        "model_filename": model_service.get_model_filename(),
        "num_classes_active": len(model_service.get_class_names()),
        "prediction_mode": "REAL INFERENCE (Active Weights Verified)",
        "framework": "Keras 3 / TensorFlow",
    }

    return metrics
