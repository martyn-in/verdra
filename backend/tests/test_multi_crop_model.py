"""
Verdra — Comprehensive Test Suite for Multi-Crop Agricultural Vision Model (17 Classes)
Verifies:
1. Multi-Crop model loads with 17 agricultural classes covering Apple, Corn, Grape, Pepper, Potato, Tomato.
2. Inference across multiple crop leaf images produces valid top-k predictions with Softmax probabilities.
3. Crop prior constraints enforce biological compatibility.
4. Model switching between multi-crop (17 classes) and Solanaceae specialist (8 classes).
5. Grad-CAM tensor generation compatibility.
"""
import glob
from pathlib import Path
import pytest

from services import model_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_multi_crop_model_loads_17_classes():
    """Verify that multi_crop model loads and contains all 17 benchmark classes."""
    model_service.load_model("multi_crop")
    assert model_service.is_model_loaded("multi_crop") is True
    classes = model_service.get_class_names("multi_crop")
    assert len(classes) == 17

    expected_prefixes = ["Apple", "Corn", "Grape", "Pepper", "Potato", "Tomato"]
    for prefix in expected_prefixes:
        matches = [c for c in classes if c.startswith(prefix)]
        assert len(matches) > 0, f"Missing classes for crop: {prefix}"


def test_multi_crop_metrics_evaluation():
    """Verify that multi_crop model metrics are accessible and reflect high performance."""
    metrics = model_service.get_model_metrics("multi_crop")
    assert "top1_accuracy" in metrics
    assert metrics["top1_accuracy"] >= 0.95
    assert metrics["test_samples"] >= 500


def test_inference_across_crop_types():
    """Verify inference produces valid predictions for leaves across different crop classes."""
    model_service.load_model("multi_crop")

    multicrop_test_dirs = glob.glob(str(PROJECT_ROOT / "dataset_multicrop" / "test" / "*"))
    assert len(multicrop_test_dirs) > 0

    for d in multicrop_test_dirs[:6]:
        leaf_files = glob.glob(f"{d}/*.*")
        if not leaf_files:
            continue
        with open(leaf_files[0], "rb") as f:
            img_bytes = f.read()

        pred = model_service.predict(img_bytes, crop="auto", top_k=3, model_id="multi_crop")
        assert pred["model_loaded"] is True
        assert "prediction" in pred
        assert 0.0 <= pred["confidence"] <= 1.0
        assert len(pred["top_predictions"]) == 3
        assert pred["crop"] in ["Apple", "Corn", "Grape", "Pepper", "Potato", "Tomato"]
        assert "developer_debug" in pred
        assert pred["developer_debug"]["classes_evaluated"] == 17


def test_crop_prior_filtering():
    """Setting crop='Corn' must filter top prediction strictly to a Corn class."""
    model_service.load_model("multi_crop")
    
    # Grab any leaf image
    leaf_p = glob.glob(str(PROJECT_ROOT / "dataset_multicrop" / "test" / "*" / "*.*"))[0]
    with open(leaf_p, "rb") as f:
        img_bytes = f.read()

    # With crop='Corn'
    pred_corn = model_service.predict(img_bytes, crop="Corn", top_k=3, model_id="multi_crop")
    assert pred_corn["crop"] == "Corn"
    assert pred_corn["prediction"].startswith("Corn_")

    # With crop='Apple'
    pred_apple = model_service.predict(img_bytes, crop="Apple", top_k=3, model_id="multi_crop")
    assert pred_apple["crop"] == "Apple"
    assert pred_apple["prediction"].startswith("Apple_")


def test_model_switching_and_registry():
    """Verify seamless switching between multi_crop (17 classes) and solanaceae (8 classes)."""
    # 1. Switch to Solanaceae
    assert model_service.set_active_model("solanaceae") is True
    assert model_service.get_active_model_id() == "solanaceae"
    assert len(model_service.get_class_names("solanaceae")) == 8

    # 2. Switch back to Multi-Crop
    assert model_service.set_active_model("multi_crop") is True
    assert model_service.get_active_model_id() == "multi_crop"
    assert len(model_service.get_class_names("multi_crop")) == 17

    # 3. Model list metadata
    models = model_service.list_models()
    assert len(models) >= 2
    ids = [m["id"] for m in models]
    assert "multi_crop" in ids
    assert "solanaceae" in ids


def test_gradcam_feature_map_and_weights():
    """Verify spatial feature map and weight extraction for Grad-CAM."""
    leaf_p = glob.glob(str(PROJECT_ROOT / "dataset_multicrop" / "test" / "*" / "*.*"))[0]
    with open(leaf_p, "rb") as f:
        img_bytes = f.read()

    spatial_map, feat_vec, W, b = model_service.get_feature_map_and_weights(img_bytes, model_id="multi_crop")
    assert spatial_map.shape == (7, 7, 4)
    assert feat_vec.shape == (256,)
    assert W.shape == (256, 17)
    assert b.shape == (17,)


def test_parse_class_name():
    """Verify class name parsing handles diverse crop disease strings."""
    crop, disease = model_service.parse_class_name("Apple_Black_Rot")
    assert crop == "Apple"
    assert disease == "Black Rot"

    crop, disease = model_service.parse_class_name("Corn_Northern_Leaf_Blight")
    assert crop == "Corn"
    assert disease == "Northern Leaf Blight"

    crop, disease = model_service.parse_class_name("Grape_healthy")
    assert crop == "Grape"
    assert disease == "Healthy"

    # Reset active model to solanaceae for subsequent legacy test suites
    model_service.set_active_model("solanaceae")
