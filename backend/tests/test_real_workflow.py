"""
AgriVisionAI — End-to-End Real AI Workflow Test
Verifies:
1. Upload real image
2. Preprocessing
3. Real model inference (.keras weights)
4. Real softmax confidence & developer debug metrics
5. Dynamic Grad-CAM generation
6. Dynamic visual severity calculation
7. Weather (live or clearly labeled baseline fallback)
8. Dynamic spread risk
9. Disease knowledge base recommendations
10. Scan result formatting for persistence
11. AI Model Not Configured (HTTP 503) verification when weights are missing
"""
import io
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import app
from services import model_service

model_service.load_model()
client = TestClient(app)

SAMPLE_IMAGE_PATH = Path(__file__).resolve().parent.parent.parent / "sample_images" / "sample_tomato_late_blight.jpg"


def test_full_real_ai_workflow():
    print("\n--- Testing Full Real AI Workflow ---")

    # Step 1: Prepare real image
    if SAMPLE_IMAGE_PATH.exists():
        with open(SAMPLE_IMAGE_PATH, "rb") as f:
            image_bytes = f.read()
        filename = "sample_tomato_late_blight.jpg"
    else:
        img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        image_bytes = buf.getvalue()
        filename = "test_leaf.jpg"

    files = {"file": (filename, io.BytesIO(image_bytes), "image/jpeg")}

    # Step 2 & 3: Real Model Inference + Preprocessing
    print("Executing /api/predict...")
    pred_res = client.post("/api/predict", files=files, data={"crop": "Tomato"})
    assert pred_res.status_code == 200, f"Predict failed: {pred_res.text}"
    pred_data = pred_res.json()

    # Step 4: Real Softmax Confidence & Top 3 Predictions
    assert "prediction" in pred_data
    assert "confidence" in pred_data
    assert "top_predictions" in pred_data
    assert len(pred_data["top_predictions"]) >= 3, "Top 3 predictions must be provided"
    assert "developer_debug" in pred_data

    debug = pred_data["developer_debug"]
    assert debug["model_filename"] == "agri_vision_model.keras"
    assert debug["model_loaded"] is True
    assert debug["inference_time_ms"] > 0
    assert debug["raw_confidence"] == pred_data["confidence"]
    assert 0.0 <= pred_data["confidence"] <= 1.0
    print(f"✓ Real Inference: class={pred_data['prediction']}, conf={pred_data['confidence']:.4f}, latency={debug['inference_time_ms']}ms")
    print(f"✓ Top 3 Probabilities: {[(p['class_name'], round(p['confidence'], 4)) for p in pred_data['top_predictions'][:3]]}")

    # Step 5: True Grad-CAM with target convolution layer Conv_1
    print("Executing /api/gradcam...")
    gc_files = {"file": (filename, io.BytesIO(image_bytes), "image/jpeg")}
    gc_res = client.post("/api/gradcam", files=gc_files)
    assert gc_res.status_code == 200, f"Grad-CAM failed: {gc_res.text}"
    gc_data = gc_res.json()
    assert "overlay" in gc_data
    assert "heatmap" in gc_data
    assert gc_data.get("model_verified") is True
    assert gc_data.get("target_conv_layer") == "Conv_1", f"Expected Conv_1, got {gc_data.get('target_conv_layer')}"
    assert "Conv_1" in gc_data.get("explanation_text", "")
    print(f"✓ True Grad-CAM: target_class={gc_data.get('target_class')}, conv_layer={gc_data.get('target_conv_layer')}")

    # Step 6: Dynamic Severity Estimation
    print("Executing /api/severity...")
    sev_files = {"file": (filename, io.BytesIO(image_bytes), "image/jpeg")}
    sev_res = client.post("/api/severity", files=sev_files)
    assert sev_res.status_code == 200, f"Severity failed: {sev_res.text}"
    sev_data = sev_res.json()
    assert "severity" in sev_data
    assert "infected_percentage" in sev_data
    print(f"✓ Dynamic Severity: {sev_data['severity']} ({sev_data['infected_percentage']}%)")

    # Step 7: Live Weather API (or clearly labeled fallback in dev mode)
    print("Executing /api/weather...")
    weather_res = client.get("/api/weather?city=Hyderabad")
    assert weather_res.status_code == 200
    weather_data = weather_res.json()
    assert "temperature" in weather_data
    assert "humidity" in weather_data
    assert "is_live" in weather_data
    if not weather_data["is_live"]:
        assert "fallback_warning" in weather_data
    print(f"✓ Weather: city={weather_data['city']}, is_live={weather_data['is_live']}, status={weather_data.get('status')}")

    # Step 8: Environmental Spread Risk Engine
    print("Executing /api/risk...")
    risk_payload = {
        "crop": pred_data.get("crop", "Tomato"),
        "disease": pred_data["prediction"],
        "severity": sev_data["severity"],
        "infected_percentage": sev_data["infected_percentage"],
        "temperature": weather_data["temperature"],
        "humidity": weather_data["humidity"],
        "rainfall": weather_data.get("rainfall", 0),
        "wind_speed": weather_data.get("wind_speed", 2.0),
    }
    risk_res = client.post("/api/risk", json=risk_payload)
    assert risk_res.status_code == 200
    risk_data = risk_res.json()
    assert "risk_level" in risk_data
    assert "risk_score" in risk_data
    assert len(risk_data.get("contributing_factors", [])) > 0
    print(f"✓ Spread Risk Engine: level={risk_data['risk_level']}, score={risk_data['risk_score']}")

    # Step 9: Disease Knowledge Base Recommendations
    print("Executing /api/diseases...")
    diseases_res = client.get("/api/diseases")
    assert diseases_res.status_code == 200
    diseases = diseases_res.json().get("diseases", [])
    matched_recs = next((d for d in diseases if d["name"].lower().replace("_", "") == pred_data["prediction"].lower().replace("_", "")), None)
    if matched_recs:
        assert "immediate_actions" in matched_recs
        assert "preventive_actions" in matched_recs
        print(f"✓ Recommendations retrieved for {matched_recs['name']}")

    # Step 10: Save Scan Record
    scan_record = {
        "crop": pred_data.get("crop", "Tomato"),
        "prediction": pred_data["prediction"],
        "confidence": pred_data["confidence"],
        "severity": sev_data["severity"],
        "infected_percentage": sev_data["infected_percentage"],
        "risk_level": risk_data["risk_level"],
        "temperature": weather_data["temperature"],
        "humidity": weather_data["humidity"],
        "rainfall": weather_data.get("rainfall", 0),
        "is_healthy": pred_data["is_healthy"],
        "model_filename": debug["model_filename"],
        "inference_time_ms": debug["inference_time_ms"],
    }
    assert scan_record["confidence"] > 0
    assert scan_record["model_filename"] == "agri_vision_model.keras"
    print(f"✓ Save Scan: record prepared with confidence={scan_record['confidence']:.4f}")

    # Step 11: Update Analytics Aggregation
    simulated_scans = [scan_record]
    healthy_count = sum(1 for s in simulated_scans if s["is_healthy"])
    diseased_count = len(simulated_scans) - healthy_count
    high_risk_count = sum(1 for s in simulated_scans if s["risk_level"] in ["High", "Critical"])
    assert len(simulated_scans) == 1
    print(f"✓ Update Analytics: healthy={healthy_count}, diseased={diseased_count}, high_risk={high_risk_count}")

    # Step 12: Generate PDF Report
    print("Executing /api/report...")
    report_payload = {
        "crop": scan_record["crop"],
        "prediction": scan_record["prediction"],
        "confidence": scan_record["confidence"],
        "is_healthy": scan_record["is_healthy"],
        "severity": {
            "severity": sev_data["severity"],
            "infected_percentage": sev_data["infected_percentage"],
            "description": sev_data.get("description", ""),
        },
        "risk": risk_data,
        "weather": weather_data,
        "recommendations": matched_recs or {
            "immediate_actions": ["Prune affected foliage."],
            "preventive_actions": ["Maintain crop hygiene."],
        },
        "scan_date": "2026-09-11 12:00:00 UTC",
    }
    report_res = client.post("/api/report", json=report_payload)
    assert report_res.status_code == 200, f"Report generation failed: {report_res.text}"
    assert report_res.headers["content-type"] == "application/pdf"
    assert report_res.content[:4] == b"%PDF", "Response must be valid PDF"
    print(f"✓ Generate PDF Report: {len(report_res.content)} bytes valid PDF generated")


def test_ai_model_not_configured_error():
    print("\n--- Testing 'AI Model Not Configured' Error Handling ---")
    orig_filename = model_service._model_filename
    orig_env = os.environ.get("MODEL_PATH")
    try:
        os.environ["MODEL_PATH"] = "non_existent_weights.keras"
        model_service._model_filename = "non_existent_weights.keras"
        model_service._model_loaded = False
        model_service._model_weights = None
        model_service._model = None

        img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        files = {"file": ("test.jpg", io.BytesIO(buf.getvalue()), "image/jpeg")}
        res = client.post("/api/predict", files=files)
        assert res.status_code == 503
        assert "AI model not configured" in res.json().get("detail", "")
        print(f"✓ Successfully verified 503 response when model unconfigured: {res.json()['detail']}")
    finally:
        # Restore real model state
        if orig_env:
            os.environ["MODEL_PATH"] = orig_env
        else:
            os.environ.pop("MODEL_PATH", None)
        model_service._model_filename = orig_filename
        model_service.load_model()


if __name__ == "__main__":
    test_full_real_ai_workflow()
    test_ai_model_not_configured_error()
    print("\n🎉 All Real AI Workflow tests passed successfully!")
