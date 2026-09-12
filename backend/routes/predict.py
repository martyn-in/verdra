"""
AgriVisionAI / Verdra — Predict Route
POST /api/predict — Upload single image, get REAL AI disease prediction.
POST /api/batch-predict — Upload 2-10 images, process each individually with real model inference,
                          and compute transparent deterministic field health score.
"""

import time
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
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
    opencv_service,
    storage_service,
    image_understanding_service,
    openai_vision_service,
)

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Backend-side Confidence Thresholds
CONFIDENCE_HIGH = 0.80
CONFIDENCE_MIN_ACCEPTED = 0.55
SEPARATION_MARGIN_THRESHOLD = 0.08


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


@router.post("/scan/opencv-process")
async def process_opencv_scan_endpoint(file: UploadFile = File(...)):
    """
    Process leaf scan frame or captured specimen using OpenCV:
    - Laplacian blur/sharpness score
    - Foliar chromaticity and coverage %
    - Leaf bounding box contour
    - CLAHE contrast enhancement
    - Enhanced JPEG preview
    """
    image_bytes = await file.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")
    
    result = opencv_service.process_leaf_scan(image_bytes)
    return result


@router.post("/image-check")
async def image_check_endpoint(
    image: Optional[UploadFile] = File(default=None),
    file: Optional[UploadFile] = File(default=None),
):
    """
    OpenAI Vision pre-validation check endpoint:
    Identifies what is present in the image:
    - object (e.g. bottle, human, dog, mango leaf, tomato leaf)
    - plant (e.g. tomato, potato, pepper, mango, none)
    - crop_supported (boolean)
    - confidence (float)
    - action ("CONTINUE" or "STOP")
    """
    target = image or file
    if not target:
        raise HTTPException(status_code=400, detail="No image file provided in upload.")

    if target.content_type and target.content_type.lower() not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {target.content_type}. Please upload JPG, PNG, or WEBP."
        )

    image_bytes = await target.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    check_res = await openai_vision_service.analyze_image_with_openai(image_bytes)
    crop_supported = bool(check_res.get("crop_supported", False))
    logger.info(f"image_check_result: {check_res} | disease_model_called: {crop_supported}")

    return {
        "object": check_res.get("object", "unknown"),
        "plant": check_res.get("plant", "none"),
        "crop_supported": crop_supported,
        "confidence": float(check_res.get("confidence", 0.95)),
        "action": check_res.get("action", "STOP"),
        "detected_object": check_res.get("detected_object", check_res.get("object", "unknown")),
        "detected_plant": check_res.get("detected_plant", check_res.get("plant", "none")),
        "is_crop_leaf": bool(check_res.get("is_crop_leaf", False)),
        "supported_crop": crop_supported,
    }


def _compute_rescan_interval(disease: str, severity: str, risk_level: str, is_healthy: bool) -> dict:
    """Compute rescan interval from disease characteristics. Not hardcoded per-disease."""
    if is_healthy:
        return {
            "interval_days": 14,
            "recommended_date": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
            "reason": "Plant appears healthy. Routine monitoring recommended every two weeks.",
        }

    sev_lower = (severity or "").lower()
    risk_lower = (risk_level or "").lower()

    # Severity score: 0-3
    sev_score = 0
    if "mild" in sev_lower or "low" in sev_lower:
        sev_score = 1
    elif "moderate" in sev_lower:
        sev_score = 2
    elif "severe" in sev_lower or "high" in sev_lower or "critical" in sev_lower:
        sev_score = 3

    # Risk score: 0-3
    risk_score = 0
    if risk_lower in ("low",):
        risk_score = 1
    elif risk_lower in ("moderate",):
        risk_score = 2
    elif risk_lower in ("high", "critical"):
        risk_score = 3

    combined = sev_score + risk_score

    if combined >= 5:
        days = 1
        reason = "Severe infection with high environmental spread risk. Daily monitoring critical."
    elif combined >= 4:
        days = 2
        reason = "Significant infection detected. Rescan within 48 hours to track progression."
    elif combined >= 3:
        days = 3
        reason = "Moderate severity with elevated risk requires close monitoring."
    elif combined >= 2:
        days = 5
        reason = "Mild infection detected. Monitor within 5 days to confirm treatment efficacy."
    else:
        days = 7
        reason = "Low severity detected. Weekly monitoring recommended."

    return {
        "interval_days": days,
        "recommended_date": (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d"),
        "reason": reason,
    }


async def execute_real_inference_pipeline(
    image_bytes: bytes,
    crop: str = "auto",
    field_tag: str = "",
    farm_id: Optional[str] = None,
    field_id: Optional[str] = None,
    plant_id: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_accuracy: Optional[float] = None,
    batch_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Execute strict multi-stage REAL AI inference pipeline for a single leaf image:
    1. Check image quality (resolution, blur, lighting).
    2. Run LEAF / NON-LEAF validator model.
    3. If not a leaf, STOP immediately and return NOT_A_LEAF error object.
    4. Run real crop disease classifier.
    5. Evaluate confidence & separation margins against backend thresholds.
    6. Compute real Grad-CAM, severity, live weather risk, and recommendations.
    7. Persist real scan to storage.
    """
    # 1. Model readiness check
    if not model_service.is_model_loaded():
        model_service.load_model()

    if not model_service.is_model_loaded():
        logger.error("Inference rejected: model_error (agri_vision_model.keras not loaded)")
        return {
            "valid_leaf": False,
            "reason": "model_error",
            "error_code": "MODEL_UNAVAILABLE",
            "message": "Crop analysis service unavailable.",
            "detail": "Crop analysis service unavailable.",
            "diagnostics": [],
            "image_quality": {"pass": False, "quality": "Poor", "score": 0},
        }

    # 2. Input quality check
    quality = image_quality_service.check_image_quality(image_bytes)
    if not quality.get("pass", True):
        rejection_msg = quality.get("message") or "Image is too blurry. Please capture a sharper leaf image."
        logger.warning(f"Inference rejected: image_quality_failed - {rejection_msg}")
        return {
            "valid_leaf": False,
            "reason": "image_quality_failed",
            "error_code": "POOR_IMAGE_QUALITY",
            "message": rejection_msg,
            "detail": rejection_msg,
            "diagnostics": quality.get("issues", []),
            "image_quality": quality,
        }

    # 3. OpenAI Vision Pre-Validation & Image Understanding
    vision_check = await openai_vision_service.analyze_image_with_openai(image_bytes)
    detected_obj = vision_check.get("object", "unknown")
    detected_plant = vision_check.get("plant", "none")
    is_leaf = bool(vision_check.get("is_crop_leaf", False))
    crop_supported = bool(vision_check.get("crop_supported", False))
    vision_conf = float(vision_check.get("confidence", 0.95))

    # RULE 1: If image contains bottle, person, animal, vehicle, document or unrelated object:
    # STOP. Do not call disease model.
    if not is_leaf:
        logger.info(f"image_check_result: {vision_check} | disease_model_called: false")
        rejection_msg = f"Detected: {detected_obj.capitalize()}.\nVerdra analyzes crop leaves only. Please upload a crop leaf image."
        logger.warning(f"Inference rejected: not_crop_leaf ({detected_obj}, conf={vision_conf:.4f})")
        return {
            "status": "INVALID_INPUT",
            "valid_leaf": False,
            "reason": "not_leaf",
            "error_code": "NOT_A_LEAF",
            "detected_object": detected_obj,
            "detected_plant": "none",
            "confidence": vision_conf,
            "disease_model_called": False,
            "message": rejection_msg,
            "detail": rejection_msg,
            "image_quality": quality,
        }

    # RULE 2: If image contains a plant leaf but unsupported crop (e.g. Mango leaf):
    # STOP. Do not call disease model. Do not classify it as tomato/potato/pepper disease.
    if is_leaf and not crop_supported:
        logger.info(f"image_check_result: {vision_check} | disease_model_called: false")
        plant_display = detected_obj.capitalize() if "leaf" in detected_obj.lower() else f"{detected_plant.capitalize()} leaf"
        rejection_msg = f"Detected: {plant_display}.\nThis crop is not currently supported."
        logger.warning(f"Inference rejected: unsupported_crop ({detected_obj}, plant={detected_plant})")
        return {
            "status": "UNSUPPORTED_CROP",
            "valid_leaf": True,
            "reason": "unsupported_crop",
            "error_code": "UNSUPPORTED_CROP",
            "detected_object": detected_obj,
            "detected_plant": detected_plant,
            "confidence": vision_conf,
            "disease_model_called": False,
            "message": rejection_msg,
            "detail": rejection_msg,
            "image_quality": quality,
        }

    # RULE 3: Supported crop leaf (Tomato, Potato, Pepper)
    # Continue: Leaf validation -> Disease model -> Grad-CAM -> Severity -> Risk -> Guidance
    logger.info(f"image_check_result: {vision_check} | disease_model_called: true")

    # 4. Foliar leaf validation
    leaf_check = leaf_validator_service.predict(image_bytes)
    if not leaf_check.get("valid_leaf", False):
        leaf_prob = float(leaf_check.get("leaf_probability", 0.0))
        rejection_msg = leaf_check.get("message") or "No crop leaf detected. Please upload a leaf image."
        logger.warning(f"Inference rejected: not_leaf (leaf_probability={leaf_prob:.4f}) - {rejection_msg}")
        return {
            "status": "INVALID_INPUT",
            "valid_leaf": False,
            "reason": "not_leaf",
            "error_code": "NOT_A_LEAF",
            "detected_object": detected_obj,
            "detected_plant": detected_plant,
            "confidence": float(round(1.0 - leaf_prob, 4)),
            "disease_model_called": False,
            "message": rejection_msg,
            "detail": rejection_msg,
            "leaf_probability": leaf_prob,
            "leaf_score": leaf_prob,
            "threshold": leaf_check.get("threshold", 0.50),
            "diagnostics": leaf_check.get("diagnostics", {}),
            "image_quality": quality,
        }

    # 5. Supported crop host check
    supported_crops = {"tomato", "potato", "pepper", "pepper_bell", "bell pepper", "auto", "none", ""}
    clean_crop = (crop or "auto").lower().strip()
    if clean_crop not in supported_crops:
        rejection_msg = f"Selected crop '{crop}' is not supported by the trained model (supported: Tomato, Potato, Pepper)."
        logger.warning(f"Inference rejected: unsupported_crop - {rejection_msg}")
        return {
            "status": "UNSUPPORTED_CROP",
            "valid_leaf": True,
            "reason": "unsupported_crop",
            "error_code": "UNSUPPORTED_CROP",
            "detected_object": detected_obj,
            "detected_plant": detected_plant,
            "disease_model_called": False,
            "message": rejection_msg,
            "detail": rejection_msg,
            "image_quality": quality,
        }

    # 5. Real AI Model Prediction
    try:
        pred_res = model_service.predict(image_bytes, crop=crop, top_k=3)
    except Exception as e:
        logger.error(f"Inference rejected: model_error ({e})")
        return {
            "valid_leaf": False,
            "reason": "model_error",
            "error_code": "MODEL_INFERENCE_ERROR",
            "message": "Crop analysis service unavailable.",
            "detail": f"AI model service error: {str(e)}",
            "image_quality": quality,
        }

    pred_res["valid_leaf"] = True
    pred_res["detected_object"] = detected_obj
    pred_res["detected_plant"] = detected_plant
    pred_res["disease_model_called"] = True
    pred_res["leaf_score"] = leaf_check.get("leaf_score", 1.0)
    pred_res["image_quality"] = quality
    pred_res["selected_crop"] = crop
    pred_res["field_tag"] = field_tag
    pred_res["farm_id"] = farm_id
    pred_res["field_id"] = field_id
    pred_res["plant_id"] = plant_id
    pred_res["batch_id"] = batch_id
    pred_res["latitude"] = latitude
    pred_res["longitude"] = longitude
    pred_res["location_accuracy"] = location_accuracy

    conf = float(pred_res.get("confidence", 0.0))
    top_preds = pred_res.get("top_predictions", [])
    top1_conf = float(top_preds[0].get("confidence", conf)) if len(top_preds) > 0 else conf
    top2_conf = float(top_preds[1].get("confidence", 0.0)) if len(top_preds) > 1 else 0.0
    margin = top1_conf - top2_conf

    # 6. Determine Confidence Level & Explanation
    uncertain_reasons = []
    if conf < CONFIDENCE_MIN_ACCEPTED:
        uncertain_reasons.append(f"Confidence score ({conf*100:.1f}%) is below the accepted certainty threshold ({CONFIDENCE_MIN_ACCEPTED*100:.0f}%).")
    if margin < SEPARATION_MARGIN_THRESHOLD and conf < CONFIDENCE_HIGH:
        uncertain_reasons.append(f"Ambiguous distinction between top-1 and top-2 candidate classes (margin: {margin*100:.1f}%).")
    if leaf_check.get("leaf_score", 1.0) < 0.70:
        uncertain_reasons.append("Specimen visual morphology indicates borderline foliage clarity.")

    scan_id = f"verdra-scan-{int(time.time() * 1000)}"

    # If uncertain conditions met: DO NOT provide a forced definitive diagnosis
    if len(uncertain_reasons) > 0:
        uncertain_result = {
            "id": scan_id,
            "scan_id": scan_id,
            "status": "UNCERTAIN",
            "detected_object": "crop leaf",
            "confidence_level": "UNCERTAIN",
            "confidence_message": "Verdra could not confidently identify this leaf.",
            "confidence": conf,
            "valid_leaf": True,
            "leaf_score": leaf_check.get("leaf_score", 1.0),
            "crop": pred_res.get("crop", "Unknown"),
            "disease": "Result Uncertain",
            "prediction": "Result Uncertain",
            "is_healthy": False,
            "uncertain_reasons": uncertain_reasons,
            "top_predictions": top_preds,
            "image_quality": quality,
            "selected_crop": crop,
            "farm_id": farm_id,
            "field_id": field_id,
            "plant_id": plant_id,
            "latitude": latitude,
            "longitude": longitude,
            "location_accuracy": location_accuracy,
            "severity": {
                "level": "Uncertain",
                "percentage": None,
            },
            "risk": {
                "level": "Moderate",
                "factors": uncertain_reasons,
                "explanation": "Inference confidence is below validated clinical threshold. Agricultural expert inspection advised.",
            },
            "recommendations": {
                "immediate": [
                    "Retake a clear image of one leaf in good lighting.",
                    "Ensure leaf is held flat against a neutral background without direct lens glare.",
                ],
                "prevention": [
                    "Inspect adjacent rows for distinct foliar lesion symptoms.",
                ],
                "monitoring": [
                    "Re-scan specimen in 24 hours under natural daylight.",
                ],
            },
            "created_at": datetime.utcnow().isoformat()
        }
        storage_service.save_scan(uncertain_result)
        return uncertain_result

    # High vs Moderate Confidence Level
    if conf >= CONFIDENCE_HIGH and margin >= 0.15:
        confidence_level = "HIGH"
        confidence_message = "The model strongly favors this disease class with distinct visual features."
    else:
        confidence_level = "MODERATE"
        confidence_message = "The model identifies this disease with moderate confidence. Secondary confirmation recommended."

    pred_res["status"] = "CONFIDENT"
    pred_res["confidence_level"] = confidence_level
    pred_res["confidence_message"] = confidence_message

    primary = top_preds[0] if top_preds else {}
    class_name = primary.get("class_name", pred_res.get("prediction", ""))
    class_index = primary.get("class_index", 0)

    # 6. Real Severity Estimation
    try:
        sev_result = severity_service.estimate_severity(image_bytes)
        sev_level = sev_result.get("severity", "Moderate")
        sev_pct = round(float(sev_result.get("infected_percentage", 0.0)), 1)
    except Exception as e:
        logger.warning(f"Severity estimation error: {e}")
        sev_level = "Unknown"
        sev_pct = None

    # 7. Real Grad-CAM Attention Heatmap
    gradcam_url = None
    try:
        gc_data = gradcam_service.generate_gradcam(
            image_bytes,
            class_index=class_index,
            target_disease=class_name
        )
        overlay_b64 = gc_data.get("overlay")
        if overlay_b64:
            gradcam_url = overlay_b64 if overlay_b64.startswith("data:") else f"data:image/png;base64,{overlay_b64}"
    except Exception as e:
        logger.warning(f"Grad-CAM generation error: {e}")

    # 8. Real Environmental Live Weather
    try:
        weather_data = await weather_service.get_weather_by_city("Hyderabad")
    except Exception as e:
        logger.warning(f"Weather fetch error: {e}")
        weather_data = {}

    # 9. Real Spread Risk
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
        logger.warning(f"Risk calculation error: {e}")
        risk_data = {
            "risk_level": "Moderate",
            "contributing_factors": [],
            "explanation": "Calculated from visual symptom density."
        }

    # 10. Real Actionable Recommendations
    try:
        recs_data = recommendation_service.get_recommendations(
            disease_class=class_name,
            severity=sev_level if sev_level != "Unknown" else None
        )
    except Exception as e:
        logger.warning(f"Recommendation lookup error: {e}")
        recs_data = {}

    is_healthy = "healthy" in class_name.lower()
    risk_level = risk_data.get("risk_level", "Moderate")

    pred_res["id"] = scan_id
    pred_res["scan_id"] = scan_id
    pred_res["disease"] = class_name
    pred_res["prediction"] = class_name
    pred_res["is_healthy"] = is_healthy
    pred_res["severity"] = {
        "level": sev_level,
        "percentage": sev_pct,
    }
    pred_res["gradcam_url"] = gradcam_url
    pred_res["weather"] = {
        "temperature": weather_data.get("temperature"),
        "humidity": weather_data.get("humidity"),
        "rainfall": weather_data.get("rainfall"),
        "wind_speed": weather_data.get("wind_speed"),
        "description": weather_data.get("description"),
    }
    pred_res["risk"] = {
        "level": risk_level,
        "factors": risk_data.get("contributing_factors", []),
        "explanation": risk_data.get("explanation", ""),
    }
    pred_res["recommendations"] = {
        "immediate": recs_data.get("immediate_actions", []),
        "prevention": recs_data.get("preventive_actions", []),
        "monitoring": recs_data.get("monitoring_advice", []),
    }
    pred_res["rescan"] = _compute_rescan_interval(
        disease=class_name,
        severity=sev_level,
        risk_level=risk_level,
        is_healthy=is_healthy,
    )
    pred_res["created_at"] = datetime.utcnow().isoformat()

    # Persist real scan to storage
    storage_service.save_scan(pred_res)
    return pred_res


# -------------------------------------------------------------------
# SINGLE SCAN ENDPOINT
# -------------------------------------------------------------------

@router.post("/predict")
async def predict_disease(
    file: UploadFile = File(...),
    crop: str = Form(default="auto"),
    field_tag: str = Form(default=""),
    farm_id: Optional[str] = Form(default=None),
    field_id: Optional[str] = Form(default=None),
    plant_id: Optional[str] = Form(default=None),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_accuracy: Optional[float] = Form(default=None),
    batch_id: Optional[str] = Form(default=None),
):
    """Analyze a single crop leaf image using REAL deep learning model inference."""
    if file.content_type and file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Please upload JPG, PNG, or WEBP."
        )

    image_bytes = await file.read()
    if len(image_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10 MB.")
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded.")

    result = await execute_real_inference_pipeline(
        image_bytes=image_bytes,
        crop=crop,
        field_tag=field_tag,
        farm_id=farm_id,
        field_id=field_id,
        plant_id=plant_id,
        latitude=latitude,
        longitude=longitude,
        location_accuracy=location_accuracy,
        batch_id=batch_id,
    )

    if not result.get("valid_leaf", True) or result.get("status") in ("INVALID_INPUT", "UNSUPPORTED_CROP"):
        return JSONResponse(status_code=422, content=result)

    return result


# -------------------------------------------------------------------
# BATCH SCAN MODE ENDPOINT
# -------------------------------------------------------------------

@router.post("/batch-predict")
async def batch_predict_endpoint(
    files: List[UploadFile] = File(...),
    crop: str = Form(default="auto"),
    farm_id: Optional[str] = Form(default=None),
    field_id: Optional[str] = Form(default=None),
    batch_name: Optional[str] = Form(default=""),
):
    """
    Process multiple leaf images (min 2, max 10) representing one field/sample group.
    Every image independently runs through the real inference pipeline.
    Deterministic Field Health Score Formula:
      Score = round(100.0 * (H + sum_diseased(1.0 - severity_pct / 100.0)) / N, 1)
      Where H = healthy leaf count, N = total valid leaves (H + diseased count).
      Overall Status: Good (>= 80), Monitor (60 - 79.9), At Risk (< 60).
    """
    if len(files) < 2:
        raise HTTPException(status_code=400, detail="Batch scan requires at least 2 leaf images.")
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Batch scan allows a maximum of 10 leaf images.")

    batch_id = f"batch-{int(time.time() * 1000)}"
    valid_results = []
    rejected_items = []
    disease_distribution = {}

    for idx, f in enumerate(files):
        filename = f.filename or f"specimen_{idx+1}.jpg"
        content_type = f.content_type or "image/jpeg"
        if content_type not in ALLOWED_TYPES:
            rejected_items.append({
                "filename": filename,
                "reason": f"Unsupported MIME type: {content_type}"
            })
            continue

        image_bytes = await f.read()
        if len(image_bytes) == 0:
            rejected_items.append({
                "filename": filename,
                "reason": "Empty file"
            })
            continue
        if len(image_bytes) > MAX_FILE_SIZE:
            rejected_items.append({
                "filename": filename,
                "reason": "Exceeds 10 MB size limit"
            })
            continue

        try:
            res = await execute_real_inference_pipeline(
                image_bytes=image_bytes,
                crop=crop,
                farm_id=farm_id,
                field_id=field_id,
                batch_id=batch_id,
            )

            if not res.get("valid_leaf", True):
                rejected_items.append({
                    "filename": filename,
                    "reason": res.get("message") or "Non-leaf image rejected"
                })
                continue

            res["filename"] = filename
            valid_results.append(res)

            dis_name = res.get("disease", "Unknown")
            disease_distribution[dis_name] = disease_distribution.get(dis_name, 0) + 1

        except Exception as err:
            logger.error(f"Error processing batch item {filename}: {err}")
            rejected_items.append({
                "filename": filename,
                "reason": str(err)
            })

    valid_count = len(valid_results)
    healthy_count = sum(1 for r in valid_results if r.get("is_healthy", False))
    diseased_count = valid_count - healthy_count

    # Transparent Deterministic Field Health Score calculation
    # Formula: Each healthy leaf contributes 1.0.
    # Each diseased leaf contributes (1.0 - (severity_percentage / 100.0)).
    # Score = round(100.0 * total_healthy_weight / valid_count, 1)
    if valid_count > 0:
        total_healthy_weight = 0.0
        diseased_severities = []
        for r in valid_results:
            if r.get("is_healthy", False):
                total_healthy_weight += 1.0
            else:
                sev_dict = r.get("severity", {})
                pct = sev_dict.get("percentage") if isinstance(sev_dict, dict) else None
                pct_val = float(pct) if pct is not None else 25.0  # default 25% if unmeasured
                diseased_severities.append(pct_val)
                weight = max(0.0, 1.0 - (pct_val / 100.0))
                total_healthy_weight += weight

        field_health_score = round(max(0.0, min(100.0, (total_healthy_weight / valid_count) * 100.0)), 1)
        avg_severity = round(sum(diseased_severities) / len(diseased_severities), 1) if diseased_severities else 0.0
    else:
        field_health_score = 0.0
        avg_severity = 0.0

    if field_health_score >= 80.0:
        overall_status = "Good"
    elif field_health_score >= 60.0:
        overall_status = "Monitor"
    else:
        overall_status = "At Risk"

    # Dominant disease determination
    non_healthy_dist = {k: v for k, v in disease_distribution.items() if "healthy" not in k.lower()}
    if non_healthy_dist:
        dominant_disease = max(non_healthy_dist, key=non_healthy_dist.get)
    elif healthy_count > 0:
        dominant_disease = "Healthy (No Pathogen Detected)"
    else:
        dominant_disease = "None"

    aggregate_summary = {
        "healthy_count": healthy_count,
        "diseased_count": diseased_count,
        "disease_distribution": disease_distribution,
        "average_severity": avg_severity,
        "dominant_disease": dominant_disease,
        "field_health_score": field_health_score,
        "overall_status": overall_status,
        "formula_documentation": "Field Health Score = 100 * (healthy_leaves + sum(1 - severity_pct/100)) / valid_leaves"
    }

    batch_record = {
        "id": batch_id,
        "batch_id": batch_id,
        "farm_id": farm_id,
        "field_id": field_id,
        "batch_name": batch_name or f"Field Inspection ({valid_count} specimens)",
        "crop": crop,
        "total_images": len(files),
        "valid_images": valid_count,
        "rejected_images": len(rejected_items),
        "field_health_score": field_health_score,
        "dominant_disease": dominant_disease,
        "overall_status": overall_status,
        "aggregate": aggregate_summary,
        "created_at": datetime.utcnow().isoformat()
    }

    storage_service.save_batch_scan(batch_record)

    return {
        "batch_id": batch_id,
        "batch_name": batch_record["batch_name"],
        "total_images": len(files),
        "valid_images": valid_count,
        "rejected_images": len(rejected_items),
        "rejected_details": rejected_items,
        "results": valid_results,
        "aggregate": aggregate_summary
    }
