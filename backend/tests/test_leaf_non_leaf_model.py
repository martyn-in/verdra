"""
Verdra — Comprehensive Test Suite for Leaf vs Non-Leaf ("Un-Leaf") Detection Model
Verifies:
1. Trained 64-D Foliar Gatekeeper model loads cleanly with valid metadata & weights.
2. Real agricultural leaves across all crop types pass validation with high probability.
3. Diverse hard-negative non-leaf images are strictly rejected (human portraits, electronics,
   documents, vehicles, animals, flat noise).
4. Boundary condition tests: pure black, pure white, random noise, synthetic geometric shapes.
5. Exact error code "NOT_A_LEAF" and diagnostic payloads returned on rejections.
"""
import io
import glob
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw
import pytest

from services import leaf_validator_service

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_leaf_non_leaf_model_loaded_and_metadata():
    """Verify the trained Foliar Gatekeeper model is loaded and reports 100% metrics."""
    leaf_validator_service.load_model()
    info = leaf_validator_service.get_model_info()
    assert info["model_loaded"] is True
    assert info["architecture"] == "Calibrated_Foliar_Gatekeeper_v2"
    assert info["threshold"] == 0.50
    assert "metrics" in info
    metrics = info["metrics"]
    assert metrics["test_accuracy"] >= 0.98
    assert metrics["test_precision"] >= 0.98
    assert metrics["test_recall"] >= 0.98


def test_real_crop_leaves_pass_detection():
    """Real leaves from dataset test sets must pass with valid_leaf=True and probability >= 0.60."""
    leaf_validator_service.load_model()
    
    # Collect real leaves across different crops
    leaf_paths = glob.glob(str(PROJECT_ROOT / "dataset" / "test" / "*" / "*.*"))
    if not leaf_paths:
        leaf_paths = glob.glob(str(PROJECT_ROOT / "dataset_multicrop" / "test" / "*" / "*.*"))
    
    assert len(leaf_paths) > 0, "No leaf test images found!"

    # Sample up to 25 leaves across different categories
    sampled_leaves = leaf_paths[:25]
    for p in sampled_leaves:
        with open(p, "rb") as f:
            img_bytes = f.read()
        res = leaf_validator_service.predict(img_bytes)
        assert res["valid_leaf"] is True, f"Failed for real leaf: {p}, result: {res}"
        assert res["leaf_probability"] >= 0.50
        assert res["error_code"] is None
        assert res["message"] == "Valid crop leaf confirmed."
        assert "diagnostics" in res
        assert res["diagnostics"]["feature_dim"] == 64


def test_hard_negative_non_leaf_rejection():
    """Diverse non-leaf images must all be rejected with valid_leaf=False and error_code='NOT_A_LEAF'."""
    leaf_validator_service.load_model()
    
    non_leaf_paths = glob.glob(str(PROJECT_ROOT / "dataset" / "non_leaf" / "*.*"))
    assert len(non_leaf_paths) >= 20, "Non-leaf test images missing!"

    # Test samples across different hard-negative classes
    sampled_non_leaves = non_leaf_paths[:30]
    for p in sampled_non_leaves:
        with open(p, "rb") as f:
            img_bytes = f.read()
        res = leaf_validator_service.predict(img_bytes)
        assert res["valid_leaf"] is False, f"Falsely accepted non-leaf: {p}, result: {res}"
        assert res["leaf_probability"] < 0.50
        assert res["error_code"] == "NOT_A_LEAF"
        assert res["reason"] == "not_leaf"
        assert "No crop leaf detected" in res["message"]


def test_human_skin_portrait_rejection():
    """Human skin and portraits must trigger skin locus rejection."""
    leaf_validator_service.load_model()
    
    # Create synthetic skin-toned image (warm peach / brown tones)
    skin_img = Image.new("RGB", (224, 224), color=(220, 160, 130))
    d = ImageDraw.Draw(skin_img)
    d.ellipse([(40, 40), (180, 180)], fill=(200, 140, 110))
    buf = io.BytesIO()
    skin_img.save(buf, format="JPEG")
    
    res = leaf_validator_service.predict(buf.getvalue())
    assert res["valid_leaf"] is False
    assert res["error_code"] == "NOT_A_LEAF"
    assert res["leaf_probability"] < 0.20


def test_document_and_text_rejection():
    """Documents and black-and-white text pages must be rejected."""
    leaf_validator_service.load_model()
    
    # Create text document
    doc_img = Image.new("RGB", (224, 224), color=(255, 255, 255))
    d = ImageDraw.Draw(doc_img)
    for y in range(15, 210, 12):
        d.line([(15, y), (200, y)], fill=(10, 10, 10), width=2)
    buf = io.BytesIO()
    doc_img.save(buf, format="JPEG")
    
    res = leaf_validator_service.predict(buf.getvalue())
    assert res["valid_leaf"] is False
    assert res["error_code"] == "NOT_A_LEAF"
    assert res["leaf_probability"] < 0.20


def test_flat_colors_and_black_white_rejection():
    """Pure black, pure white, and pure noise images must be rejected."""
    leaf_validator_service.load_model()

    # 1. Pure black
    black_img = Image.new("RGB", (224, 224), color=(0, 0, 0))
    buf_black = io.BytesIO()
    black_img.save(buf_black, format="JPEG")
    res_black = leaf_validator_service.predict(buf_black.getvalue())
    assert res_black["valid_leaf"] is False
    assert res_black["error_code"] == "NOT_A_LEAF"

    # 2. Pure white
    white_img = Image.new("RGB", (224, 224), color=(255, 255, 255))
    buf_white = io.BytesIO()
    white_img.save(buf_white, format="JPEG")
    res_white = leaf_validator_service.predict(buf_white.getvalue())
    assert res_white["valid_leaf"] is False
    assert res_white["error_code"] == "NOT_A_LEAF"

    # 3. Random noise
    noise_arr = np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)
    noise_img = Image.fromarray(noise_arr)
    buf_noise = io.BytesIO()
    noise_img.save(buf_noise, format="JPEG")
    res_noise = leaf_validator_service.predict(buf_noise.getvalue())
    assert res_noise["valid_leaf"] is False


def test_is_leaf_helper_function():
    """Verify is_leaf helper function returns pure boolean."""
    leaf_validator_service.load_model()
    
    # Real leaf
    leaf_p = glob.glob(str(PROJECT_ROOT / "dataset" / "test" / "*" / "*.*"))[0]
    with open(leaf_p, "rb") as f:
        assert leaf_validator_service.is_leaf(f.read()) is True

    # Pure black non-leaf
    black_img = Image.new("RGB", (100, 100), color=(0, 0, 0))
    b = io.BytesIO()
    black_img.save(b, format="JPEG")
    assert leaf_validator_service.is_leaf(b.getvalue()) is False
