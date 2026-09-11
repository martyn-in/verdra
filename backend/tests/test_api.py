"""
AgriVisionAI — Integration Tests for FastAPI Endpoints
"""
import io
from fastapi.testclient import TestClient
from PIL import Image

from main import app
from services import model_service

model_service.load_model()
client = TestClient(app)


def create_test_image_file() -> tuple:
    """Helper to create an in-memory test JPEG file for multipart upload using real sample leaf."""
    import os
    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "sample_images", "sample_tomato_early_blight.jpg")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            buf = io.BytesIO(f.read())
        return ("sample_tomato_early_blight.jpg", buf, "image/jpeg")
    img = Image.new("RGB", (224, 224), color=(46, 125, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)
    return ("test_leaf.jpg", buf, "image/jpeg")


def test_health_endpoint():
    """Test health check route."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["ok", "healthy"]
    assert data.get("model_loaded") is True or "class_count" in data


def test_diseases_endpoint():
    """Test retrieving disease knowledge base."""
    response = client.get("/api/diseases")
    assert response.status_code == 200
    data = response.json()
    assert "diseases" in data
    diseases = data["diseases"]
    assert isinstance(diseases, list)
    assert len(diseases) > 0
    # Check first disease schema
    sample = diseases[0]
    assert "id" in sample
    assert "name" in sample
    assert "crop" in sample
    assert "symptoms" in sample
    assert "immediate_actions" in sample
    assert "preventive_actions" in sample


def test_risk_endpoint():
    """Test spread risk calculation endpoint."""
    payload = {
        "crop": "Tomato",
        "disease": "Tomato_Early_Blight",
        "severity": "Moderate",
        "temperature": 24.0,
        "humidity": 80.0,
        "rainfall": 5.0,
        "wind_speed": 3.0,
    }
    response = client.post("/api/risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "risk_score" in data
    assert "contributing_factors" in data


def test_weather_endpoint():
    """Test weather lookup endpoint (uses mock fallback if no API key)."""
    response = client.get("/api/weather?city=Hyderabad")
    assert response.status_code == 200
    data = response.json()
    assert "temperature" in data
    assert "humidity" in data
    assert "description" in data


def test_predict_endpoint():
    """Test crop disease prediction endpoint with uploaded image."""
    filename, buf, content_type = create_test_image_file()
    files = {"file": (filename, buf, content_type)}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "confidence" in data
    assert "crop" in data
    assert "is_healthy" in data
    assert "top_predictions" in data
    assert len(data["top_predictions"]) >= 1
    assert "developer_debug" in data
    debug = data["developer_debug"]
    assert debug["model_filename"] == "agri_vision_model.keras"
    assert debug["model_loaded"] is True
    assert "inference_time_ms" in debug
    assert "raw_confidence" in debug


def test_predict_quality_rejection():
    """Test rejection of severely poor images with HTTP 422."""
    bad_img = Image.new("RGB", (50, 50), color=(0, 0, 0))
    buf = io.BytesIO()
    bad_img.save(buf, format="JPEG")
    files = {"file": ("bad.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
    response = client.post("/api/predict", files=files)
    assert response.status_code == 422
    assert response.json()["detail"] == "Image quality is insufficient for reliable analysis. Please capture a clearer leaf image in good lighting."


def test_gradcam_endpoint():
    """Test Grad-CAM heatmap generation endpoint."""
    filename, buf, content_type = create_test_image_file()
    files = {"file": (filename, buf, content_type)}
    response = client.post("/api/gradcam", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "heatmap" in data
    assert "overlay" in data
    assert "target_class" in data
    assert data["model_verified"] is True
    assert data.get("target_conv_layer") == "Conv_1"
    assert "Conv_1" in data.get("explanation_text", "")


def test_model_performance_endpoint():
    """Test real held-out model evaluation metrics endpoint."""
    response = client.get("/api/model/performance")
    assert response.status_code == 200
    data = response.json()
    assert "test_accuracy" in data
    assert "precision_macro" in data
    assert data["num_test_images"] == 240
    assert data["num_classes"] == 8
    assert "confusion_matrix" in data
    assert "per_class" in data
    assert data["test_accuracy"] >= 0.80  # Target >= 80%
    assert data["f1_macro"] >= 0.80
    assert 0.0 <= data["test_accuracy"] <= 1.0
    assert 0.0 <= data["precision_macro"] <= 1.0
    assert 0.0 <= data["recall_macro"] <= 1.0
    assert 0.0 <= data["f1_macro"] <= 1.0
    assert "live_model_status" in data
    assert data["live_model_status"]["model_loaded"] is True
    assert data["live_model_status"]["model_filename"] == "agri_vision_model.keras"


def test_report_endpoint():
    """Test PDF report generation route."""
    report_data = {
        "prediction": "Tomato_Early_Blight",
        "confidence": 0.95,
        "crop": "Tomato",
        "is_healthy": False,
        "severity": {
            "severity": "Moderate",
            "infected_percentage": 30.0,
            "description": "Leaf area shows moderate infection.",
        },
        "risk": {
            "risk_level": "High",
            "risk_score": 75,
            "contributing_factors": ["High humidity"],
            "explanation": "High spread risk.",
        },
        "weather": {
            "temperature": 24.0,
            "humidity": 80.0,
            "rainfall": 5.0,
            "wind_speed": 2.5,
            "city": "Hyderabad",
        },
        "recommendations": {
            "immediate_actions": ["Prune lower leaves"],
            "preventive_actions": ["Drip irrigation"],
            "monitoring_advice": ["Inspect twice weekly"],
        },
    }
    response = client.post("/api/report", json=report_data)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content[:4] == b"%PDF"

