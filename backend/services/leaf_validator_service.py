"""
AgriVisionAI / Verdra — Foliar Leaf vs. Non-Leaf Validation Service
Evaluates leaf presence before disease model inference.
Prevents disease classification models from executing on non-leaf images
(faces, vehicles, text, documents, electronics, rooms, landscapes, synthetic colors).
"""
import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

LEAF_THRESHOLD = 0.50


def predict(image_bytes: bytes) -> dict:
    """
    Evaluates whether the uploaded image is an authentic crop leaf.
    Strictly accepts real crop leaves (including hand-held leaves and natural field backgrounds).
    Rejects non-leaf images with reason 'not_leaf' and message 'No crop leaf detected. Please upload a leaf image.'
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        logger.warning(f"Leaf validator rejection: not_leaf (Cannot decode image: {e})")
        return {
            "valid_leaf": False,
            "reason": "not_leaf",
            "error_code": "NOT_A_LEAF",
            "code": "NOT_A_LEAF",
            "message": "No crop leaf detected. Please upload a leaf image.",
            "leaf_probability": 0.0,
            "leaf_score": 0.0,
            "threshold": LEAF_THRESHOLD,
            "diagnostics": {},
        }

    # Standardize to 224x224 for spatial and chromaticity analysis
    img_resized = img.resize((224, 224), Image.LANCZOS)
    arr = np.array(img_resized, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Exclude human skin tones (high red, moderate green, low-moderate blue)
    is_skin = (r > g + 0.14) & (g > b) & (r > 0.40) & (b > 0.18) & (b < 0.65)

    # 1. Biological Foliar Chromaticity:
    # Healthy green chlorophyll:
    green_foliage = (g > b * 1.05) & (g > r * 0.86) & (g > 0.10) & (~is_skin)
    # Chlorotic yellowing (lesion halos, yellowed leaf tissue):
    yellow_chlorosis = (r > 0.28) & (g > 0.28) & (b < r * 0.80) & (b < g * 0.80) & (~is_skin)
    # Necrotic lesion (brown/tan lesions, dead tissue, blight spots):
    necrotic_tissue = (
        (r > b * 1.10) & (g > b * 0.90) & (r > 0.14) & (r < 0.75) & (np.abs(r - g) < 0.20) & (~is_skin)
    )

    foliar_mask = green_foliage | yellow_chlorosis | necrotic_tissue
    foliar_ratio = float(np.mean(foliar_mask))

    # 2. Organic Gradient & Texture Energy:
    grad_x = np.abs(arr[:, 1:, :] - arr[:, :-1, :])
    grad_y = np.abs(arr[1:, :, :] - arr[:-1, :, :])
    edge_energy = float(np.mean(grad_x) + np.mean(grad_y))

    # 3. Leaf Probability Synthesis:
    # Calibrated sigmoidal activation centered at 6% foliar coverage
    # (Real leaves occupy >= 8% of the frame even with fingers, soil, or background)
    foliar_activation = 1.0 / (1.0 + np.exp(-28.0 * (foliar_ratio - 0.06)))
    texture_activation = min(1.0, max(0.0, edge_energy / 0.012))

    leaf_score = float(foliar_activation * texture_activation)
    leaf_score = max(0.0, min(1.0, leaf_score))
    leaf_probability = round(leaf_score, 4)

    is_valid = leaf_probability >= LEAF_THRESHOLD

    diagnostics = {
        "foliar_ratio": round(foliar_ratio, 4),
        "edge_energy": round(edge_energy, 4),
    }

    if not is_valid:
        logger.warning(
            f"Leaf validation rejection: not_leaf (leaf_probability={leaf_probability:.4f} < {LEAF_THRESHOLD})"
        )
        return {
            "valid_leaf": False,
            "reason": "not_leaf",
            "error_code": "NOT_A_LEAF",
            "code": "NOT_A_LEAF",
            "message": "No crop leaf detected. Please upload a leaf image.",
            "leaf_probability": leaf_probability,
            "leaf_score": leaf_probability,
            "threshold": LEAF_THRESHOLD,
            "diagnostics": diagnostics,
        }

    logger.info(f"Leaf validation accepted: leaf_probability={leaf_probability:.4f} >= {LEAF_THRESHOLD}")
    return {
        "valid_leaf": True,
        "reason": None,
        "error_code": None,
        "code": None,
        "message": "Valid crop leaf confirmed.",
        "leaf_probability": leaf_probability,
        "leaf_score": leaf_probability,
        "threshold": LEAF_THRESHOLD,
        "diagnostics": diagnostics,
    }
