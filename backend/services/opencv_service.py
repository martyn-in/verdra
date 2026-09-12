"""
AgriVisionAI / Verdra — OpenCV Leaf Scanning & Preprocessing Service
Provides computer-vision-based contour extraction, Laplacian sharpness calculation,
CLAHE contrast enhancement, and foliar segmentation.
"""
import io
import base64
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
    logger.warning("OpenCV (cv2) not found, using pure-numpy fallback for image scanning.")


def compute_laplacian_sharpness(img_gray: np.ndarray) -> float:
    """
    Computes sharpness score using the variance of the Laplacian.
    Higher values indicate sharp, in-focus leaf surfaces.
    """
    if HAS_CV2 and cv2 is not None:
        laplacian = cv2.Laplacian(img_gray, cv2.CV_64F)
        return float(laplacian.var())
    else:
        # High-performance numpy Laplacian approximation
        laplacian_h = img_gray[:-2, 1:-1] + img_gray[2:, 1:-1] - 2 * img_gray[1:-1, 1:-1]
        laplacian_v = img_gray[1:-1, :-2] + img_gray[1:-1, 2:] - 2 * img_gray[1:-1, 1:-1]
        lap = laplacian_h + laplacian_v
        return float(np.var(lap))


def process_leaf_scan(image_bytes: bytes) -> dict:
    """
    Applies OpenCV computer vision pipeline to captured camera specimen:
    1. Sharpness & blur quantification (Laplacian variance)
    2. CLAHE (Contrast Limited Adaptive Histogram Equalization) to reveal lesions
    3. Foliar contour detection & bounding region
    4. Foliar chromaticity segmentation
    5. Returns metrics and enhanced specimen image (Base64 JPEG)
    """
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.error(f"Failed to open image for OpenCV processing: {e}")
        return {
            "success": False,
            "error": "Invalid or corrupt image stream",
            "sharpness": 0.0,
            "is_sharp": False,
        }

    width, height = pil_img.size
    rgb_arr = np.array(pil_img, dtype=np.uint8)

    # Convert to grayscale for gradient and blur analysis
    if HAS_CV2 and cv2 is not None:
        gray = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2GRAY)
    else:
        gray = np.dot(rgb_arr[..., :3], [0.2989, 0.5870, 0.1140]).astype(np.uint8)

    sharpness = compute_laplacian_sharpness(gray)
    is_sharp = sharpness >= 45.0

    # Foliar color segmentation in HSV / Excess Green space
    if HAS_CV2 and cv2 is not None:
        hsv = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2HSV)
        # Foliar range (greens, yellow-greens, chlorosis)
        lower_green = np.array([20, 35, 30])
        upper_green = np.array([90, 255, 255])
        leaf_mask = cv2.inRange(hsv, lower_green, upper_green)

        # Morphology cleanup
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        cleaned_mask = cv2.morphologyEx(leaf_mask, cv2.MORPH_OPEN, kernel)
        cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel)

        # Find largest contour (leaf body)
        contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        leaf_box = None
        contour_area = 0.0
        total_pixels = float(width * height)

        if contours:
            largest_contour = max(contours, key=cv2.contourArea)
            contour_area = float(cv2.contourArea(largest_contour))
            x, y, w, h = cv2.boundingRect(largest_contour)
            leaf_box = {
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h),
                "normalized_x": round(x / width, 4),
                "normalized_y": round(y / height, 4),
                "normalized_width": round(w / width, 4),
                "normalized_height": round(h / height, 4),
            }

        foliar_coverage_pct = round((contour_area / total_pixels) * 100.0, 1) if total_pixels > 0 else 0.0

        # Contrast enhancement using CLAHE in LAB color space
        lab = cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

    else:
        # Numpy fallback for foliar analysis & contrast stretch
        r, g, b = rgb_arr[:, :, 0].astype(np.float32), rgb_arr[:, :, 1].astype(np.float32), rgb_arr[:, :, 2].astype(np.float32)
        exg = 2.0 * g - r - b
        foliar_mask = exg > 15.0
        foliar_coverage_pct = round(float(np.mean(foliar_mask)) * 100.0, 1)
        leaf_box = None

        # Min-max contrast enhancement
        p2, p98 = np.percentile(rgb_arr, (2, 98))
        if p98 > p2:
            enhanced_rgb = np.clip((rgb_arr.astype(np.float32) - p2) / (p98 - p2) * 255.0, 0, 255).astype(np.uint8)
        else:
            enhanced_rgb = rgb_arr

    # Encode enhanced specimen to base64 JPEG
    enhanced_pil = Image.fromarray(enhanced_rgb)
    buffer = io.BytesIO()
    enhanced_pil.save(buffer, format="JPEG", quality=90)
    enhanced_base64 = "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode("utf-8")

    return {
        "success": True,
        "width": width,
        "height": height,
        "sharpness_score": round(sharpness, 1),
        "is_sharp": is_sharp,
        "quality_tier": "Optimal" if sharpness >= 90 else ("Acceptable" if sharpness >= 45 else "Blurry"),
        "foliar_coverage_percentage": foliar_coverage_pct,
        "leaf_bounding_box": leaf_box,
        "opencv_engine": "OpenCV-Python (cv2)" if (HAS_CV2 and cv2 is not None) else "Numpy-CV",
        "enhanced_image": enhanced_base64,
    }
