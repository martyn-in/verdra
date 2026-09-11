"""
AgriVisionAI — Unit Tests for Backend Services
"""
import io
from PIL import Image

from services.image_quality_service import check_image_quality
from services.severity_service import estimate_severity
from services.risk_service import calculate_risk
from services.recommendation_service import get_recommendations
from services.report_service import generate_report


def create_test_image_bytes(color=(34, 139, 34), size=(300, 300)) -> bytes:
    """Helper to create an in-memory test JPEG image using real leaf sample."""
    import os
    sample_path = os.path.join(os.path.dirname(__file__), "..", "..", "sample_images", "sample_tomato_early_blight.jpg")
    if os.path.exists(sample_path):
        with open(sample_path, "rb") as f:
            return f.read()
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_image_quality_service():
    """Test leaf image quality assessment and strict rejection of poor inputs."""
    # 1. Real valid leaf image must pass
    img_bytes = create_test_image_bytes()
    quality = check_image_quality(img_bytes)

    assert "quality" in quality
    assert "score" in quality
    assert "pass" in quality
    assert quality["pass"] is True
    assert 0 <= quality["score"] <= 100

    # 2. Severely degraded / blank black image must be rejected with HTTP 422 standard message
    black_img = Image.new("RGB", (224, 224), color=(0, 0, 0))
    buf = io.BytesIO()
    black_img.save(buf, format="JPEG")
    poor_quality = check_image_quality(buf.getvalue())
    assert poor_quality["pass"] is False
    assert "Image quality is insufficient for reliable analysis" in poor_quality.get("message", "")


def test_severity_service():
    """Test image-processing-based severity calculation."""
    img_bytes = create_test_image_bytes()
    severity = estimate_severity(img_bytes)

    assert "severity" in severity
    assert severity["severity"] in ["Low", "Mild", "Moderate", "Severe", "Unknown"]
    assert "infected_percentage" in severity
    assert 0 <= severity["infected_percentage"] <= 100
    assert "health_score" in severity


def test_risk_service():
    """Test environmental disease spread risk calculation."""
    risk = calculate_risk(
        disease="Tomato_Late_Blight",
        severity="Moderate",
        temperature=21.0,
        humidity=88.0,
        rainfall=15.0,
    )

    assert "risk_level" in risk
    assert risk["risk_level"] in ["Low", "Moderate", "High", "Critical"]
    assert "risk_score" in risk
    assert 0 <= risk["risk_score"] <= 100
    assert "contributing_factors" in risk
    assert len(risk["contributing_factors"]) > 0


def test_recommendation_service():
    """Test curative and preventive recommendations lookup."""
    recs = get_recommendations(disease_class="Tomato_Early_Blight", severity="Moderate")

    assert "immediate_actions" in recs
    assert "preventive_actions" in recs
    assert "monitoring_advice" in recs
    assert len(recs["immediate_actions"]) > 0
    assert len(recs["preventive_actions"]) > 0


def test_report_service():
    """Test PDF report generation."""
    report_data = {
        "prediction": "Tomato_Early_Blight",
        "confidence": 0.95,
        "crop": "Tomato",
        "is_healthy": False,
        "severity": {
            "severity": "Moderate",
            "infected_percentage": 32.5,
            "description": "Leaf area shows moderate concentric ring lesions.",
        },
        "risk": {
            "risk_level": "High",
            "risk_score": 75,
            "contributing_factors": ["High humidity", "Moderate temperature"],
            "explanation": "High spread risk under current conditions.",
        },
        "weather": {
            "temperature": 24.0,
            "humidity": 82.0,
            "rainfall": 5.0,
            "wind_speed": 2.5,
            "city": "Hyderabad",
        },
        "recommendations": {
            "immediate_actions": ["Prune lower leaves", "Apply copper fungicide"],
            "preventive_actions": ["Crop rotation", "Drip irrigation"],
            "monitoring_advice": ["Inspect twice weekly"],
        },
    }

    pdf_bytes = generate_report(report_data)
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 200
    # PDF files start with %PDF header
    assert pdf_bytes[:4] == b"%PDF"
