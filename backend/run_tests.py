"""
AgriVisionAI — Test Runner
Executes all unit and integration tests for backend services and API endpoints.
"""
import sys
import os
import time

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(__file__))

import tests.test_services as ts
import tests.test_api as ta
import tests.test_real_workflow as trw
import tests.test_leaf_validator as tlv
from services import model_service


def run_all_tests():
    model_service.load_model()
    print("=" * 60)
    print("🌿 AgriVisionAI — Backend Test Suite")
    print("=" * 60)

    service_tests = [
        ("Image Quality Service", ts.test_image_quality_service),
        ("Severity Service", ts.test_severity_service),
        ("Spread Risk Service", ts.test_risk_service),
        ("Recommendation Service", ts.test_recommendation_service),
        ("Report Generation Service (PDF)", ts.test_report_service),
        ("Leaf Validation Service (Pass Real Leaves)", tlv.test_real_crop_leaves_pass_validator),
    ]

    api_tests = [
        ("API: Health Check", ta.test_health_endpoint),
        ("API: Diseases Knowledge Base", ta.test_diseases_endpoint),
        ("API: Spread Risk Calculation", ta.test_risk_endpoint),
        ("API: Weather Integration", ta.test_weather_endpoint),
        ("API: Predict Crop Disease", ta.test_predict_endpoint),
        ("API: Reject Poor Image Quality (422)", ta.test_predict_quality_rejection),
        ("API: Reject Non-Leaf Text Document (NOT_A_LEAF 422)", tlv.test_reject_text_document),
        ("API: Reject Non-Leaf Flat Green Wall (NOT_A_LEAF 422)", tlv.test_reject_flat_green_wall),
        ("API: Reject Non-Leaf Human Skin (NOT_A_LEAF 422)", tlv.test_reject_human_skin_portrait),
        ("API: Reject Non-Leaf Blue Sky (NOT_A_LEAF 422)", tlv.test_reject_blue_sky),
        ("API: Validate Leaf Route (/api/validate-leaf)", tlv.test_validate_leaf_endpoint),
        ("API: Quality Check Includes Leaf Validation", tlv.test_check_quality_endpoint_includes_leaf_validation),
        ("API: Grad-CAM Explainability", ta.test_gradcam_endpoint),
        ("API: Model Benchmark / Performance", ta.test_model_performance_endpoint),
        ("API: Generate Report PDF", ta.test_report_endpoint),
        ("E2E: Full Real AI Pipeline", trw.test_full_real_ai_workflow),
        ("E2E: AI Model Not Configured (503)", trw.test_ai_model_not_configured_error),
    ]

    total = len(service_tests) + len(api_tests)
    passed = 0
    failed = 0

    print("\n📦 Running Service Tests:")
    for name, test_fn in service_tests:
        start = time.time()
        try:
            test_fn()
            duration = (time.time() - start) * 1000
            print(f"  ✅ PASS: {name} ({duration:.1f}ms)")
            passed += 1
        except Exception as e:
            duration = (time.time() - start) * 1000
            print(f"  ❌ FAIL: {name} ({duration:.1f}ms) -> {e}")
            failed += 1

    print("\n🌐 Running API Endpoint Tests:")
    for name, test_fn in api_tests:
        start = time.time()
        try:
            test_fn()
            duration = (time.time() - start) * 1000
            print(f"  ✅ PASS: {name} ({duration:.1f}ms)")
            passed += 1
        except Exception as e:
            duration = (time.time() - start) * 1000
            print(f"  ❌ FAIL: {name} ({duration:.1f}ms) -> {e}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"📊 Summary: {passed}/{total} tests passed ({failed} failed)")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
    else:
        print("🎉 All backend tests passed successfully!")


if __name__ == "__main__":
    run_all_tests()
