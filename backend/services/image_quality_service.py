"""
AgriVisionAI / Verdra — Image Quality Service
Evaluates leaf image quality prior to disease inference.
Distinguishes genuinely unusable images from normal farmer field photography.
"""
import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    cv2 = None
    HAS_CV2 = False


def check_image_quality(image_bytes: bytes) -> dict:
    """
    Check image quality for resolution, blur, and lighting.
    Only strictly rejects corrupted, extremely low resolution, completely blurred, or unreadable images.
    Normal farmer photography with shadows or uneven lighting passes with advisory warnings.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.warning(f"Image quality rejection: image_quality_failed (Corrupted file: {e})")
        return {
            "quality": "Poor",
            "score": 0,
            "pass": False,
            "reason": "image_quality_failed",
            "rejection_reason": "corrupted_file",
            "message": "Unable to read image file. Please upload a valid JPG, PNG, or WEBP image.",
            "issues": ["Unable to open image file. The file may be corrupted."],
            "details": {},
        }

    width, height = img.size
    img_array = np.array(img, dtype=np.float32)

    issues = []
    score = 100

    # 1. Resolution Check
    if max(width, height) < 224 or (width < 160 and height < 160):
        logger.warning(
            f"Image quality rejection: image_quality_failed (Resolution {width}×{height} below minimum 224×224)"
        )
        return {
            "quality": "Poor",
            "score": 20,
            "pass": False,
            "reason": "image_quality_failed",
            "rejection_reason": "low_resolution",
            "message": f"Image resolution is too low ({width}×{height}). Minimum required is 224×224 pixels.",
            "issues": [f"Image resolution ({width}×{height}) is below 224×224 minimum."],
            "details": {"resolution": f"{width}×{height}"},
        }
    elif width < 224 or height < 224:
        # Elongated or slightly compact leaf — warn, do not reject
        issues.append(f"Image resolution is low along one dimension ({width}×{height}). Higher resolution recommended.")
        score -= 10

    # 2. Blur Check (Laplacian variance)
    if HAS_CV2 and cv2 is not None:
        gray_u8 = np.dot(img_array[..., :3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)
        blur_score = float(cv2.Laplacian(gray_u8, cv2.CV_64F).var())
    else:
        gray = np.mean(img_array, axis=2)
        laplacian_h = gray[:-2, 1:-1] + gray[2:, 1:-1] - 2 * gray[1:-1, 1:-1]
        laplacian_v = gray[1:-1, :-2] + gray[1:-1, 2:] - 2 * gray[1:-1, 1:-1]
        blur_score = float(np.var(laplacian_h + laplacian_v))

    # Reject ONLY if completely blurred and unusable (threshold 4.0)
    if blur_score < 4.0:
        logger.warning(
            f"Image quality rejection: image_quality_failed (Extreme blur: variance={blur_score:.1f} < 4.0)"
        )
        return {
            "quality": "Poor",
            "score": 20,
            "pass": False,
            "reason": "image_quality_failed",
            "rejection_reason": "extreme_blur",
            "message": "Image is too blurry. Please capture a sharper leaf image.",
            "issues": ["Image is too blurry. Please capture a sharper leaf image."],
            "details": {
                "resolution": f"{width}×{height}",
                "blur_score": round(blur_score, 1),
            },
        }
    elif blur_score < 50.0:
        # Soft focus advisory warning — DO NOT REJECT
        issues.append("Image appears slightly soft or out of focus. A sharper photo may improve precision.")
        score -= 15

    # 3. Brightness / Lighting Check
    brightness = float(np.mean(img_array) / 255.0)
    # Reject ONLY if completely unusable (pitch black < 0.03 or totally whiteout > 0.98)
    if brightness < 0.03 or brightness > 0.98:
        logger.warning(
            f"Image quality rejection: image_quality_failed (Unusable lighting: brightness={brightness:.3f})"
        )
        return {
            "quality": "Poor",
            "score": 10,
            "pass": False,
            "reason": "image_quality_failed",
            "rejection_reason": "extreme_lighting",
            "message": "Image is completely unusable due to extreme lighting. Please capture with visible lighting.",
            "issues": ["Image is severely underexposed (pitch black) or overexposed (pure white)."],
            "details": {
                "resolution": f"{width}×{height}",
                "brightness": round(brightness, 3),
            },
        }
    elif brightness < 0.20:
        # Natural shadow / dim lighting — warn, DO NOT reject
        issues.append("Image is slightly dark. Better lighting may improve results.")
        score -= 15
    elif brightness > 0.85:
        issues.append("Image is bright with potential glare.")
        score -= 10

    # 4. Color Variation / Detail Check (reject blank / single solid color images)
    color_std = float(np.std(img_array))
    if color_std < 5.0:
        logger.warning(
            f"Image quality rejection: image_quality_failed (No detail / solid color: std={color_std:.1f})"
        )
        return {
            "quality": "Poor",
            "score": 10,
            "pass": False,
            "reason": "image_quality_failed",
            "rejection_reason": "no_detail",
            "message": "Image contains no visible details. Please upload a photo of a crop leaf.",
            "issues": ["Image appears to be a blank or solid flat color."],
            "details": {
                "resolution": f"{width}×{height}",
                "color_variation": round(color_std, 1),
            },
        }
    elif color_std < 18.0:
        issues.append("Low color contrast detected.")
        score -= 10

    score = max(30, min(100, score))
    quality = "Good" if score >= 70 else "Fair"

    return {
        "quality": quality,
        "score": score,
        "issues": issues,
        "pass": True,  # Normal farmer photos PASS
        "details": {
            "resolution": f"{width}×{height}",
            "blur_score": round(float(blur_score), 1),
            "brightness": round(float(brightness), 3),
            "color_variation": round(float(color_std), 1),
        },
    }
