"""
Unit and Integration Tests for Verdra Advanced Real Features:
- Batch scan mode & deterministic Field Health Score
- Plant progression timeline & severity trend (improving/stable/worsening)
- Farm hotspot mapping
- Nearby-risk alerts with Haversine spatio-temporal cluster
- Cryptographic expert share link & revocation
- Confidence explanation levels
"""

import os
import io
import time
import unittest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

import main
from main import app
from services import storage_service

SAMPLE_LEAF = os.path.join(os.path.dirname(__file__), "..", "..", "sample_images", "sample_tomato_early_blight.jpg")


class TestAdvancedFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        # Load sample leaf bytes
        if os.path.exists(SAMPLE_LEAF):
            with open(SAMPLE_LEAF, "rb") as f:
                cls.leaf_bytes = f.read()
        else:
            cls.leaf_bytes = b""

    def test_plant_registration_and_timeline_trend(self):
        """Test plant tag creation, chronological scans, and visual severity trend."""
        plant_tag = f"TEST-TOM-{int(time.time())}"
        res = self.client.post("/api/plants", json={"plant_tag": plant_tag, "crop": "Tomato"})
        self.assertEqual(res.status_code, 200)
        plant_id = res.json()["id"]

        # 1. First scan: 25% severity
        scan1 = {
            "id": f"scan-prog-1-{int(time.time())}",
            "plant_id": plant_id,
            "crop": "Tomato",
            "prediction": "Tomato Early Blight",
            "disease": "Tomato Early Blight",
            "confidence": 0.88,
            "confidence_level": "HIGH",
            "severity": {"level": "Moderate", "percentage": 25.0},
            "risk": {"level": "Moderate", "explanation": "Initial lesion spots"},
            "is_healthy": False,
            "created_at": (datetime.utcnow() - timedelta(days=5)).isoformat()
        }
        storage_service.save_scan(scan1)

        # 2. Second scan: 14% severity (decrease of 11% -> should be Improving)
        scan2 = {
            "id": f"scan-prog-2-{int(time.time())}",
            "plant_id": plant_id,
            "crop": "Tomato",
            "prediction": "Tomato Early Blight",
            "disease": "Tomato Early Blight",
            "confidence": 0.85,
            "confidence_level": "HIGH",
            "severity": {"level": "Mild", "percentage": 14.0},
            "risk": {"level": "Low", "explanation": "Lesions desiccating"},
            "is_healthy": False,
            "created_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        }
        storage_service.save_scan(scan2)

        # Fetch timeline
        t_res = self.client.get(f"/api/plants/{plant_id}/timeline")
        self.assertEqual(t_res.status_code, 200)
        data = t_res.json()

        self.assertEqual(data["total_scans"], 2)
        self.assertEqual(data["trend"], "Improving")
        self.assertIn("Based on estimated visual severity", data["disclaimer"])

    def test_hotspot_mapping(self):
        """Test that saved scans with real coordinates appear in field hotspots."""
        test_field = f"field-hotspot-{int(time.time())}"
        scan = {
            "id": f"scan-map-{int(time.time())}",
            "field_id": test_field,
            "crop": "Tomato",
            "prediction": "Tomato Early Blight",
            "disease": "Tomato Early Blight",
            "confidence": 0.91,
            "confidence_level": "HIGH",
            "severity": {"level": "Severe", "percentage": 35.0},
            "risk": {"level": "High", "explanation": "High foliar density"},
            "latitude": 17.385044,
            "longitude": 78.486671,
            "location_accuracy": 5.0,
            "is_healthy": False,
            "created_at": datetime.utcnow().isoformat()
        }
        storage_service.save_scan(scan)

        res = self.client.get(f"/api/fields/{test_field}/hotspots")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["total_pinned_scans"], 1)
        pin = data["hotspots"][0]
        self.assertEqual(pin["latitude"], 17.385044)
        self.assertEqual(pin["longitude"], 78.486671)
        self.assertEqual(pin["marker_color"], "red")

    def test_nearby_risk_alerts_clustering(self):
        """Test that >= 3 matching disease scans within 72h trigger localized disease pressure alert."""
        field_id = f"field-alert-{int(time.time())}"
        now = datetime.utcnow()

        # Insert 3 matching Tomato Early Blight detections
        for i in range(3):
            scan = {
                "id": f"scan-alert-{i}-{int(time.time())}",
                "field_id": field_id,
                "crop": "Tomato",
                "prediction": "Tomato Early Blight",
                "disease": "Tomato Early Blight",
                "confidence": 0.89,
                "confidence_level": "HIGH",
                "severity": {"level": "Moderate", "percentage": 20.0},
                "risk": {"level": "Moderate", "explanation": "Cluster test"},
                "latitude": 17.3850 + (i * 0.0001), # ~11 meters apart
                "longitude": 78.4866 + (i * 0.0001),
                "is_healthy": False,
                "created_at": (now - timedelta(hours=10 + i * 2)).isoformat()
            }
            storage_service.save_scan(scan)

        res = self.client.get(f"/api/fields/{field_id}/alerts")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(data["active_alerts_count"], 1)
        alert = data["alerts"][0]
        self.assertEqual(alert["disease"], "Tomato Early Blight")
        self.assertIn("Repeated detections may indicate localized disease pressure", alert["disclaimer"])
        self.assertGreaterEqual(alert["matching_scans_count"], 3)

    def test_expert_share_flow_and_revocation(self):
        """Test cryptographic token creation, public retrieval, and revocation."""
        scan_id = f"scan-share-{int(time.time())}"
        scan_data = {
            "id": scan_id,
            "crop": "Tomato",
            "prediction": "Tomato Early Blight",
            "disease": "Tomato Early Blight",
            "confidence": 0.94,
            "confidence_level": "HIGH",
            "confidence_message": "Strong class match",
            "severity": {"level": "Moderate", "percentage": 18.5},
            "risk": {"level": "Moderate", "factors": ["High humidity"], "explanation": "Favorable spread conditions"},
            "recommendations": {
                "immediate": ["Apply protective copper fungicide"],
                "prevention": ["Prune lower leaves"],
                "monitoring": ["Check weekly"]
            },
            "is_healthy": False,
            "created_at": datetime.utcnow().isoformat()
        }
        storage_service.save_scan(scan_data)

        # 1. Create Share Link
        post_res = self.client.post("/api/share", json={"scan_id": scan_id, "expiry_days": 7})
        self.assertEqual(post_res.status_code, 200)
        share_info = post_res.json()
        token = share_info["share_token"]
        self.assertTrue(token)
        self.assertIn("/share/", share_info["share_url"])

        # 2. Public Read-Only Access
        get_res = self.client.get(f"/api/share/{token}")
        self.assertEqual(get_res.status_code, 200)
        case = get_res.json()["case_summary"]
        self.assertEqual(case["crop"], "Tomato")
        self.assertEqual(case["disease"], "Tomato Early Blight")
        # Ensure private farmer account data is NOT exposed
        self.assertNotIn("user_id", case)
        self.assertNotIn("token_hash", case)

        # 3. Revoke Link
        del_res = self.client.delete(f"/api/share/{token}")
        self.assertEqual(del_res.status_code, 200)

        # 4. Confirm revoked link is now inaccessible
        revoked_get = self.client.get(f"/api/share/{token}")
        self.assertEqual(revoked_get.status_code, 410)

    def test_batch_predict_endpoint(self):
        """Test batch prediction with real leaf images and deterministic score."""
        if not self.leaf_bytes:
            self.skipTest("Sample leaf image not found.")

        # Prepare 3 files
        files = [
            ("files", ("leaf1.jpg", io.BytesIO(self.leaf_bytes), "image/jpeg")),
            ("files", ("leaf2.jpg", io.BytesIO(self.leaf_bytes), "image/jpeg")),
            ("files", ("leaf3.jpg", io.BytesIO(self.leaf_bytes), "image/jpeg")),
        ]

        res = self.client.post(
            "/api/batch-predict",
            files=files,
            data={"crop": "Tomato", "batch_name": "Test Batch Inspection"}
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["total_images"], 3)
        self.assertGreaterEqual(data["valid_images"], 1)
        agg = data["aggregate"]
        self.assertIn("field_health_score", agg)
        self.assertIn("overall_status", agg)
        self.assertIn(agg["overall_status"], ["Good", "Monitor", "At Risk"])
        self.assertIn("formula_documentation", agg)


if __name__ == "__main__":
    unittest.main()
