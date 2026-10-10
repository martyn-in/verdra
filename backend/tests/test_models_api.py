"""
Verdra — API Tests for Model Management and Leaf Gatekeeper Endpoints
"""
import io
import glob
from pathlib import Path
from PIL import Image, ImageDraw
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_api_model_list():
    """GET /api/model/list returns all available models and their active status."""
    response = client.get("/api/model/list")
    assert response.status_code == 200
    data = response.json()
    assert "active_model_id" in data
    assert "models" in data
    assert len(data["models"]) >= 2

    model_ids = [m["id"] for m in data["models"]]
    assert "multi_crop" in model_ids
    assert "solanaceae" in model_ids


def test_api_model_switch():
    """POST /api/model/switch switches between models cleanly."""
    # Switch to Solanaceae
    resp1 = client.post("/api/model/switch", json={"model_id": "solanaceae"})
    assert resp1.status_code == 200
    assert resp1.json()["active_model_id"] == "solanaceae"

    # Switch back to multi_crop
    resp2 = client.post("/api/model/switch", json={"model_id": "multi_crop"})
    assert resp2.status_code == 200
    assert resp2.json()["active_model_id"] == "multi_crop"

    # Invalid model ID returns 400
    resp_invalid = client.post("/api/model/switch", json={"model_id": "non_existent_model"})
    assert resp_invalid.status_code == 400

    # Cleanly restore default solanaceae model state for downstream test suites
    client.post("/api/model/switch", json={"model_id": "solanaceae"})


def test_api_leaf_gatekeeper():
    """GET /api/model/leaf-gatekeeper returns gatekeeper architecture and metrics."""
    response = client.get("/api/model/leaf-gatekeeper")
    assert response.status_code == 200
    data = response.json()
    assert data["model_loaded"] is True
    assert data["architecture"] == "Calibrated_Foliar_Gatekeeper_v2"
    assert data["threshold"] == 0.50
    assert "metrics" in data
    assert data["metrics"]["test_accuracy"] >= 0.98


def test_api_model_performance():
    """GET /api/model/performance returns metrics for requested or active model."""
    # Active model
    resp = client.get("/api/model/performance")
    assert resp.status_code == 200
    data = resp.json()
    assert "metrics" in data
    assert "live_model_status" in data
    assert data["live_model_status"]["model_loaded"] is True

    # Explicit multi_crop
    resp_mc = client.get("/api/model/performance?model_id=multi_crop")
    assert resp_mc.status_code == 200
    assert resp_mc.json()["model_id"] == "multi_crop"


def test_api_validate_leaf_endpoint_with_leaf_and_non_leaf():
    """POST /api/validate-leaf distinguishes real leaf from non-leaf."""
    # 1. Real Leaf
    leaf_p = glob.glob(str(PROJECT_ROOT / "dataset" / "test" / "*" / "*.*"))[0]
    with open(leaf_p, "rb") as f:
        leaf_bytes = f.read()
    files_leaf = {"file": ("leaf.jpg", io.BytesIO(leaf_bytes), "image/jpeg")}
    resp_leaf = client.post("/api/validate-leaf", files=files_leaf)
    assert resp_leaf.status_code == 200
    data_leaf = resp_leaf.json()
    assert data_leaf["valid_leaf"] is True
    assert data_leaf["leaf_probability"] >= 0.50
    assert data_leaf["error_code"] is None

    # 2. Non-Leaf (Black box)
    black_img = Image.new("RGB", (224, 224), color=(10, 10, 10))
    buf = io.BytesIO()
    black_img.save(buf, format="JPEG")
    files_non_leaf = {"file": ("black.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    resp_non_leaf = client.post("/api/validate-leaf", files=files_non_leaf)
    assert resp_non_leaf.status_code == 200
    data_non_leaf = resp_non_leaf.json()
    assert data_non_leaf["valid_leaf"] is False
    assert data_non_leaf["leaf_probability"] < 0.50
    assert data_non_leaf["error_code"] == "NOT_A_LEAF"
