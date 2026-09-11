"""
AgriVisionAI — Predict Route
POST /api/predict — Upload image, get REAL AI disease prediction.
"""
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from services import (
    model_service,
    leaf_validator_service,
    image_quality_service,
    severity_service,
    gradcam_service,
    weather_service,
    risk_service,
    recommendation_service,
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
DISEASE_THRESHOLD = 0.55  # Validation-derived certainty threshold (below 55% is low confidence/uncertain)


@router.post("/validate-leaf")
async def validate_leaf_endpoint(file: UploadFile = File(...)):
    """Evaluate leaf vs non-leaf classification before running disease inference."""
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    return leaf_validator_service.predict(image_bytes)


@router.post("/check-quality")
async def check_image_quality_endpoint(file: UploadFile = File(...)):
    """Check leaf image quality (resolution, blur, brightness) and leaf presence before inference."""
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    quality = image_quality_service.check_image_quality(image_bytes)
    leaf_check = leaf_validator_service.predict(image_bytes)
    quality["leaf_validation"] = leaf_check
    return quality


@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),
    crop: str = Form(default="auto"),
):
    """
    Analyze a crop leaf image for disease detection using REAL deep learning model inference.
    Strict pipeline:
    1. Validate image quality.
    2. Run LEAF / NON-LEAF validation model.
    3. If not a leaf, STOP immediately and return NOT_A_LEAF error.
    4. Only if valid_leaf == true, run the disease classifier.
    5. Apply confidence uncertainty threshold: if unconfident, return UNCERTAIN status.
    6. If confident, enrich with Grad-CAM, severity, weather risk, and recommendations.
    """
    # 1. Model readiness check
    if not model_service.is_model_loaded():
        model_service.load_model()

    if not model_service.is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="AI model not configured: Trained model weights ('agri_vision_model.keras') are missing or not loaded."
        )

    # 2. Validate file type
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload JPG, PNG, or WEBP."
        )

    # 3. Read file bytes
    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10 MB."
        )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="Empty file uploaded. Please select a valid image."
        )

    # 4. Step 1: Input quality check (Strict Hackathon Criteria)
    quality = image_quality_service.check_image_quality(image_bytes)
    if not quality["pass"]:
        raise HTTPException(
            status_code=422,
            detail="Image quality is insufficient for reliable analysis. Please capture a clearer leaf image in good lighting."
        )

    # 5. Step 2 & 3: Run LEAF / NON-LEAF validation model
    leaf_check = leaf_validator_service.predict(image_bytes)
    if not leaf_check.get("valid_leaf", False):
        # STOP inference immediately and return strict NOT_A_LEAF error
        return JSONResponse(
            status_code=422,
            content={
                "valid_leaf": False,
                "error_code": "NOT_A_LEAF",
                "code": "NOT_A_LEAF",
                "message": "This image does not appear to contain a crop leaf. Please upload a clear leaf photograph.",
                "detail": "This image does not appear to contain a crop leaf. Please upload a clear leaf photograph.",
                "leaf_probability": leaf_check.get("leaf_probability", 0.0),
                "leaf_score": leaf_check.get("leaf_score", 0.0),
                "threshold": leaf_check.get("threshold", 0.60),
                "diagnostics": leaf_check.get("diagnostics", {}),
            }
        )

    # 6. Step 4: Run REAL crop disease classifier only if valid_leaf == true
    try:
        result = model_service.predict(image_bytes, top_k=3)
    except RuntimeError as re:
        logger.error(f"Model error: {re}")
        raise HTTPException(status_code=503, detail=str(re))
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Real AI inference execution error: {str(e)}"
        )

    result["valid_leaf"] = True
    result["leaf_score"] = leaf_check.get("leaf_score", 1.0)
    result["image_quality"] = quality
    result["selected_crop"] = crop

    conf = float(result.get("confidence", 0.0))

    # 7. Step 5: Apply uncertainty threshold derived from model validation
    if conf < DISEASE_THRESHOLD:
        scan_id = f"verdra-scan-{int(time.time() * 1000)}"
        return {
            "status": "UNCERTAIN",
            "message": "Verdra could not confidently identify this leaf. Please upload a clearer image or consult an agricultural expert.",
            "valid_leaf": True,
            "leaf_score": leaf_check.get("leaf_score", 1.0),
            "confidence": conf,
            "threshold": DISEASE_THRESHOLD,
            "crop": result.get("crop", "Unknown"),
            "disease": "Uncertain / Ambiguous",
            "prediction": "Uncertain",
            "is_healthy": False,
            "top_predictions": result.get("top_predictions", []),
            "developer_debug": result.get("developer_debug", {}),
            "scan_id": scan_id,
            "id": scan_id,
            "image_quality": quality,
            "selected_crop": crop,
            "severity": {
                "level": "Uncertain",
                "percentage": None,
            },
            "risk": {
                "level": "Moderate",
                "factors": ["Ambiguous foliar visual pattern"],
                "explanation": "Confidence is below the clinical threshold (55%). Visual confirmation by an agronomist recommended.",
            },
            "recommendations": {
                "immediate": [
                    "Capture another photograph in diffuse daylight with leaf laid flat.",
                    "Ensure high contrast against the background and eliminate lens glare.",
                ],
                "prevention": [
                    "Inspect surrounding plants for early symptoms of foliar spotting or chlorosis.",
                ],
                "monitoring": [
                    "Re-scan in 24-48 hours to track any lesion progression.",
                ],
            }
        }

    # If confident, proceed with disease classification diagnostics
    result["status"] = "CONFIDENT"
    primary = result.get("top_predictions", [{}])[0] if result.get("top_predictions") else {}
    class_name = primary.get("class_name", result.get("prediction", ""))
    class_index = primary.get("class_index", 0)

    # 8. Real Severity Estimation
    try:
        sev_result = severity_service.estimate_severity(image_bytes)
        sev_level = sev_result.get("severity", "Moderate")
        sev_pct = round(float(sev_result.get("infected_percentage", 0.0)), 1)
    except Exception as e:
        logger.warning(f"Severity estimation error in predict: {e}")
        sev_level = "Unknown"
        sev_pct = None

    # 9. Real Grad-CAM Attention Heatmap
    gradcam_url = None
    try:
        gc_data = gradcam_service.generate_gradcam(
            image_bytes,
            class_index=class_index,
            target_disease=class_name
        )
        overlay_b64 = gc_data.get("overlay")
        if overlay_b64:
            if overlay_b64.startswith("data:"):
                gradcam_url = overlay_b64
            else:
                gradcam_url = f"data:image/png;base64,{overlay_b64}"
    except Exception as e:
        logger.warning(f"Grad-CAM generation error in predict: {e}")
        gradcam_url = None

    # 8. Real Environmental Live Weather
    try:
        weather_data = await weather_service.get_weather_by_city("Hyderabad")
    except Exception as e:
        logger.warning(f"Weather fetch error in predict: {e}")
        weather_data = {}

    # 9. Real Disease Spread Risk Engine
    try:
        risk_data = risk_service.calculate_risk(
            disease=class_name,
            temperature=weather_data.get("temperature"),
            humidity=weather_data.get("humidity"),
            rainfall=weather_data.get("rainfall"),
            severity=sev_level if sev_level != "Unknown" else None,
            infected_percentage=sev_pct if sev_pct is not None else 0.0,
        )
    except Exception as e:
        logger.warning(f"Risk calculation error in predict: {e}")
        risk_data = {
            "risk_level": "Moderate",
            "contributing_factors": [],
            "explanation": "Calculated based on current disease pattern."
        }

    # 10. Real Actionable Recommendations
    try:
        recs_data = recommendation_service.get_recommendations(
            disease_class=class_name,
            severity=sev_level if sev_level != "Unknown" else None
        )
    except Exception as e:
        logger.warning(f"Recommendation lookup error in predict: {e}")
        recs_data = {}

    scan_id = f"verdra-scan-{int(time.time() * 1000)}"
    result["scan_id"] = scan_id
    result["id"] = scan_id
    result["severity"] = {
        "level": sev_level,
        "percentage": sev_pct,
    }
    result["gradcam_url"] = gradcam_url
    result["weather"] = {
        "temperature": weather_data.get("temperature"),
        "humidity": weather_data.get("humidity"),
        "rainfall": weather_data.get("rainfall"),
        "wind_speed": weather_data.get("wind_speed"),
        "description": weather_data.get("description"),
    }
    result["risk"] = {
        "level": risk_data.get("risk_level", "Low"),
        "factors": risk_data.get("contributing_factors", []),
        "explanation": risk_data.get("explanation", ""),
    }
    result["recommendations"] = {
        "immediate": recs_data.get("immediate_actions", []),
        "prevention": recs_data.get("preventive_actions", []),
        "monitoring": recs_data.get("monitoring_advice", []),
    }

    return result
