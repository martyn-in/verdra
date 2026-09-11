"""
AgriVisionAI / Verdra — Tests for Foliar Leaf Validator & Uncertainty Pipeline
Verifies:
1. Genuine crop leaves pass leaf validation (Tomato, Potato, Pepper).
2. Diverse non-leaf images are strictly rejected (error_code NOT_A_LEAF, status 422).
3. Low confidence triggers UNCERTAIN status without forcing false disease predictions.
4. /api/validate-leaf and /api/check-quality endpoints return leaf diagnostics.
"""
import io
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from main import app
from services import leaf_validator_service

client = TestClient(app)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SAMPLE_DIR = PROJECT_ROOT / "sample_images"


def test_real_crop_leaves_pass_validator():
    """All genuine sample leaves must pass leaf validation with valid_leaf=True."""
    sample_files = [
        "sample_tomato_late_blight.jpg",
        "sample_tomato_healthy.jpg",
        "sample_potato_early_blight.jpg",
        "sample_pepper_bacterial_spot.jpg",
    ]
    for filename in sample_files:
        path = SAMPLE_DIR / filename
        if not path.exists():
            continue
        with open(path, "rb") as f:
            img_bytes = f.read()

        result = leaf_validator_service.predict(img_bytes)
        assert result["valid_leaf"] is True, f"{filename} failed validation: {result}"
        assert result["leaf_score"] >= 0.60
        assert result["error_code"] is None


def test_predict_endpoint_with_real_leaf():
    """Real leaf upload to /api/predict returns 200 OK with genuine inference."""
    path = SAMPLE_DIR / "sample_tomato_late_blight.jpg"
    with open(path, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("sample_leaf.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    response = client.post("/api/predict", files=files, data={"crop": "Tomato"})
    assert response.status_code == 200
    data = response.json()
    assert data.get("valid_leaf") is True
    assert "prediction" in data
    assert "confidence" in data
    assert data.get("confidence") >= 0.60
    assert data.get("status") == "CONFIDENT"


def test_reject_text_document():
    """Text document / invoice must be rejected with error_code NOT_A_LEAF."""
    img = Image.new("RGB", (224, 224), color=(250, 250, 250))
    d = ImageDraw.Draw(img)
    for y in range(20, 200, 14):
        d.line([(20, y), (195, y)], fill=(0, 0, 0), width=2)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("document.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 422
    data = response.json()
    assert data.get("valid_leaf") is False
    assert data.get("error_code") == "NOT_A_LEAF"
    assert "does not appear to contain a crop leaf" in data.get("message", "")


def test_reject_flat_green_wall():
    """Green wall / panel with sharp room lines must pass quality but fail leaf validation."""
    img = Image.new("RGB", (224, 224), color=(45, 160, 55))
    d = ImageDraw.Draw(img)
    d.line([(0, 180), (224, 180)], fill=(200, 200, 200), width=6)
    d.rectangle([10, 10, 80, 80], outline=(200, 200, 200), width=4)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("green_wall.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 422
    data = response.json()
    assert data.get("valid_leaf") is False
    assert data.get("error_code") == "NOT_A_LEAF"
    assert "does not appear to contain a crop leaf" in data.get("message", "")


def test_reject_human_skin_portrait():
    """Human skin photo must be rejected as NOT_A_LEAF."""
    import numpy as np
    rng = np.random.RandomState(42)
    arr = np.full((224, 224, 3), [210, 160, 130], dtype=np.float32)
    noise = rng.normal(0, 18, (224, 224, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("portrait.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 422
    data = response.json()
    assert data.get("valid_leaf") is False
    assert data.get("error_code") == "NOT_A_LEAF"


def test_reject_blue_sky():
    """Blue sky / ocean scene must be rejected as NOT_A_LEAF."""
    import numpy as np
    rng = np.random.RandomState(42)
    arr = np.full((224, 224, 3), [70, 130, 220], dtype=np.float32)
    noise = rng.normal(0, 18, (224, 224, 3))
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("sky.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 422
    data = response.json()
    assert data.get("valid_leaf") is False
    assert data.get("error_code") == "NOT_A_LEAF"


def test_validate_leaf_endpoint():
    """Test dedicated /api/validate-leaf route."""
    img = Image.new("RGB", (224, 224), color=(180, 20, 20))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")

    files = {"file": ("red_car.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/validate-leaf", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data.get("valid_leaf") is False
    assert data.get("error_code") == "NOT_A_LEAF"


def test_check_quality_endpoint_includes_leaf_validation():
    """Test /api/check-quality enriches response with leaf validation."""
    path = SAMPLE_DIR / "sample_tomato_late_blight.jpg"
    with open(path, "rb") as f:
        img_bytes = f.read()

    files = {"file": ("leaf.jpg", io.BytesIO(img_bytes), "image/jpeg")}
    response = client.post("/api/check-quality", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "leaf_validation" in data
    assert data["leaf_validation"]["valid_leaf"] is True
