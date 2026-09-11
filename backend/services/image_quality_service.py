"""
AgriVisionAI — Image Quality Service
Checks image quality before inference.
"""
import numpy as np
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


def check_image_quality(image_bytes: bytes) -> dict:
    """
    Check image quality for resolution, blur, and brightness.
    Returns quality assessment with recommendations.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        return {
            "quality": "Poor",
            "score": 0,
            "issues": ["Unable to open image file. The file may be corrupted."],
            "pass": False,
        }

    width, height = img.size
    img_array = np.array(img, dtype=np.float32)

    issues = []
    score = 100

    # 1. Resolution check
    min_dim = min(width, height)
    if min_dim < 100:
        issues.append("Image resolution is too low. Please use at least 224×224 pixels.")
        score -= 40
    elif min_dim < 224:
        issues.append("Image resolution is low. Higher resolution may improve accuracy.")
        score -= 15

    # 2. Blur detection (Laplacian variance)
    gray = np.mean(img_array, axis=2)
    # Approximate Laplacian via finite differences
    laplacian_h = gray[:-2, 1:-1] + gray[2:, 1:-1] - 2 * gray[1:-1, 1:-1]
    laplacian_v = gray[1:-1, :-2] + gray[1:-1, 2:] - 2 * gray[1:-1, 1:-1]
    laplacian = laplacian_h + laplacian_v
    blur_score = np.var(laplacian)

    if blur_score < 50:
        issues.append("Image appears blurry. Please capture a sharper photo.")
        score -= 30
    elif blur_score < 200:
        issues.append("Image sharpness is moderate. A clearer photo may help.")
        score -= 10

    # 3. Brightness check
    brightness = np.mean(img_array) / 255.0
    if brightness < 0.15:
        issues.append("Image is too dark. Please ensure adequate lighting.")
        score -= 25
    elif brightness > 0.9:
        issues.append("Image is overexposed. Please reduce lighting or glare.")
        score -= 25
    elif brightness < 0.25:
        issues.append("Image is slightly dark. Better lighting may improve results.")
        score -= 10

    # 4. Color variation check (ensures it's not a blank/uniform image)
    color_std = np.std(img_array)
    if color_std < 15:
        issues.append("Image has very low detail. Please upload a photo of a crop leaf.")
        score -= 30

    score = max(0, min(100, score))

    # Strict rejection criteria for very poor images (resolution, blur, extreme brightness)
    has_critical_failure = (
        min_dim < 100
        or blur_score < 25
        or brightness < 0.10
        or brightness > 0.94
    )
    is_acceptable = (score >= 35) and not has_critical_failure

    if score >= 70:
        quality = "Good"
    elif score >= 40:
        quality = "Fair"
    else:
        quality = "Poor"

    result = {
        "quality": quality,
        "score": score,
        "issues": issues,
        "pass": is_acceptable,
        "details": {
            "resolution": f"{width}×{height}",
            "blur_score": round(float(blur_score), 1),
            "brightness": round(float(brightness), 3),
            "color_variation": round(float(color_std), 1),
        }
    }

    if not is_acceptable:
        result["message"] = "Image quality is insufficient for reliable analysis. Please capture a clearer leaf image in good lighting."
        result["rejection_reason"] = issues[0] if issues else "Image quality is insufficient."

    return result
