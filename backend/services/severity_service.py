"""
AgriVisionAI — Severity Estimation Service
Uses image processing to estimate disease severity based on affected leaf area.
"""
import numpy as np
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)


def estimate_severity(image_bytes: bytes) -> dict:
    """
    Estimate disease severity from a leaf image using color-based segmentation.
    Returns severity category, infected percentage, and health score.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img_resized = img.resize((256, 256), Image.LANCZOS)
    img_array = np.array(img_resized, dtype=np.float32) / 255.0

    # Convert to HSV-like representation for better color analysis
    r, g, b = img_array[:, :, 0], img_array[:, :, 1], img_array[:, :, 2]

    # Create leaf mask (exclude background — typically very bright or very dark)
    brightness = (r + g + b) / 3
    leaf_mask = (brightness > 0.08) & (brightness < 0.95)

    # Detect healthy green regions
    green_ratio = g / (r + g + b + 1e-6)
    healthy_mask = (green_ratio > 0.38) & leaf_mask

    # Detect diseased regions (brown, yellow, dark spots)
    brown_mask = (r > g) & (r > 0.3) & (g < 0.6) & leaf_mask
    yellow_mask = (r > 0.4) & (g > 0.3) & (b < 0.3) & (r > b * 1.5) & leaf_mask
    dark_spot_mask = (brightness < 0.2) & leaf_mask

    # Combine disease indicators
    diseased_mask = (brown_mask | yellow_mask | dark_spot_mask) & ~healthy_mask

    # Calculate percentages
    total_leaf_pixels = np.sum(leaf_mask)
    if total_leaf_pixels == 0:
        return {
            "severity": "Unknown",
            "infected_percentage": 0.0,
            "health_score": 100,
            "category": "unknown",
            "details": {
                "leaf_pixels_detected": 0,
                "healthy_pixels": 0,
                "diseased_pixels": 0,
            }
        }

    diseased_pixels = np.sum(diseased_mask)
    healthy_pixels = np.sum(healthy_mask)
    infected_percentage = (diseased_pixels / total_leaf_pixels) * 100

    # Determine severity category
    if infected_percentage <= 10:
        severity = "Low"
        category = "low"
    elif infected_percentage <= 30:
        severity = "Mild"
        category = "mild"
    elif infected_percentage <= 60:
        severity = "Moderate"
        category = "moderate"
    else:
        severity = "Severe"
        category = "severe"

    health_score = max(0.0, min(100.0, 100.0 - infected_percentage))
    desc = f"Approximately {infected_percentage:.1f}% of leaf tissue exhibits chlorotic or necrotic lesions ({severity} stage)."

    return {
        "severity": severity,
        "infected_percentage": round(infected_percentage, 1),
        "health_score": round(health_score, 1),
        "category": category,
        "description": desc,
        "details": {
            "leaf_pixels_detected": int(total_leaf_pixels),
            "healthy_pixels": int(healthy_pixels),
            "diseased_pixels": int(diseased_pixels),
        }
    }
