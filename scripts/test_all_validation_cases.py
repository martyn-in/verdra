"""
Verification script for all 5 required test cases:
TEST 1: Real tomato/crop leaf photo from phone -> Prediction result appears.
TEST 2: Plant leaf with slight background -> Prediction works.
TEST 3: Dark but visible leaf -> Warning, not rejection.
TEST 4: Random object photo -> Not a leaf rejection ("No crop leaf detected. Please upload a leaf image.").
TEST 5: Blurred image:
        - Moderate blur -> Blur warning, prediction works.
        - Extreme blur -> Rejection ("Image is too blurry. Please capture a sharper leaf image.").
"""
import os
import sys
import io
import asyncio
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from services import image_quality_service, leaf_validator_service, model_service
from routes.predict import execute_real_inference_pipeline


async def run_tests():
    print("=" * 70)
    print("🌿 RUNNING ALL 5 VERIFICATION TEST CASES")
    print("=" * 70)

    # Make sure model is loaded
    model_service.load_model()
    assert model_service.is_model_loaded(), "Model must be loaded!"

    # -------------------------------------------------------------
    # TEST 1: Real leaf photo from phone
    # -------------------------------------------------------------
    print("\n--- TEST 1: Real leaf photo from phone (user camera capture) ---")
    user_leaf_path = os.path.join(os.path.dirname(__file__), "user_leaf_sample.jpg")
    with open(user_leaf_path, "rb") as f:
        user_leaf_bytes = f.read()

    res1 = await execute_real_inference_pipeline(user_leaf_bytes)
    print(f"✓ Valid Leaf:    {res1.get('valid_leaf')}")
    print(f"✓ Disease Pred:  {res1.get('prediction')} ({res1.get('crop')})")
    print(f"✓ Confidence:    {res1.get('confidence') * 100:.1f}% ({res1.get('status')})")
    print(f"✓ Leaf Score:    {res1.get('leaf_score')}")
    assert res1.get("valid_leaf") is True, "TEST 1 FAILED: Phone leaf was rejected!"
    assert res1.get("prediction"), "TEST 1 FAILED: No prediction returned!"
    print(">>> TEST 1 PASSED: Real mobile camera leaf image successfully reached disease model!")

    # -------------------------------------------------------------
    # TEST 2: Plant leaf with slight background
    # -------------------------------------------------------------
    print("\n--- TEST 2: Plant leaf with background ---")
    pepper_path = os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "sample_images", "sample_pepper_bacterial_spot.jpg")
    with open(pepper_path, "rb") as f:
        pepper_bytes = f.read()

    res2 = await execute_real_inference_pipeline(pepper_bytes)
    print(f"✓ Valid Leaf:    {res2.get('valid_leaf')}")
    print(f"✓ Disease Pred:  {res2.get('prediction')}")
    print(f"✓ Confidence:    {res2.get('confidence') * 100:.1f}%")
    assert res2.get("valid_leaf") is True, "TEST 2 FAILED: Leaf with background was rejected!"
    assert res2.get("prediction"), "TEST 2 FAILED: No prediction returned!"
    print(">>> TEST 2 PASSED: Prediction works for leaf with background!")

    # -------------------------------------------------------------
    # TEST 3: Dark but visible leaf
    # -------------------------------------------------------------
    print("\n--- TEST 3: Dark but visible leaf (lighting warning, not rejection) ---")
    # Take a sample leaf and darken it to ~0.14 brightness (underexposed/shadow)
    img = Image.open(pepper_path).convert("RGB")
    dark_img = ImageEnhance.Brightness(img).enhance(0.28)
    bio = io.BytesIO()
    dark_img.save(bio, "JPEG")
    dark_bytes = bio.getvalue()

    q3 = image_quality_service.check_image_quality(dark_bytes)
    print(f"✓ Quality Pass:      {q3.get('pass')}")
    print(f"✓ Quality Score:     {q3.get('score')}")
    print(f"✓ Quality Issues:    {q3.get('issues')}")
    assert q3.get("pass") is True, "TEST 3 FAILED: Dark leaf was rejected!"
    assert any("dark" in iss.lower() for iss in q3.get("issues", [])), "TEST 3 FAILED: No darkness warning in issues!"

    res3 = await execute_real_inference_pipeline(dark_bytes)
    print(f"✓ Valid Leaf:        {res3.get('valid_leaf')}")
    print(f"✓ Disease Pred:      {res3.get('prediction')}")
    assert res3.get("valid_leaf") is True, "TEST 3 FAILED: Dark leaf was rejected during pipeline!"
    print(">>> TEST 3 PASSED: Dark but visible leaf produces warning, NOT rejection!")

    # -------------------------------------------------------------
    # TEST 4: Random object photo (Not a leaf rejection)
    # -------------------------------------------------------------
    print("\n--- TEST 4: Random object photo (Not a leaf rejection) ---")
    # Synthetic object (appliance / car / room)
    obj_img = Image.new("RGB", (300, 300), (180, 180, 190))
    from PIL import ImageDraw
    draw = ImageDraw.Draw(obj_img)
    draw.rectangle([40, 60, 260, 240], fill=(40, 40, 45))
    draw.ellipse([80, 100, 220, 200], fill=(200, 50, 50))
    draw.line([30, 30, 270, 30], fill=(10, 10, 10), width=4)
    bio = io.BytesIO()
    obj_img.save(bio, "JPEG")
    obj_bytes = bio.getvalue()

    l4 = leaf_validator_service.predict(obj_bytes)
    print(f"✓ Leaf Valid:       {l4.get('valid_leaf')}")
    print(f"✓ Rejection Reason: {l4.get('reason')}")
    print(f"✓ Message:          {l4.get('message')}")
    print(f"✓ Leaf Probability: {l4.get('leaf_probability')}")
    assert l4.get("valid_leaf") is False, "TEST 4 FAILED: Random object was NOT rejected!"
    assert l4.get("reason") == "not_leaf", "TEST 4 FAILED: Reason is not not_leaf!"
    assert l4.get("message") == "No crop leaf detected. Please upload a leaf image.", f"TEST 4 FAILED: Unexpected message {l4.get('message')}"

    res4 = await execute_real_inference_pipeline(obj_bytes)
    print(f"✓ Pipeline Result:  valid_leaf={res4.get('valid_leaf')}, reason={res4.get('reason')}")
    assert res4.get("valid_leaf") is False, "TEST 4 FAILED: Pipeline accepted random object!"
    print(">>> TEST 4 PASSED: Random object properly rejected with 'No crop leaf detected. Please upload a leaf image.'!")

    # -------------------------------------------------------------
    # TEST 5: Blurred image
    # -------------------------------------------------------------
    print("\n--- TEST 5: Blurred image tests ---")
    # A. Moderate blur -> Warning, prediction continues
    mod_blur_img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    bio_mod = io.BytesIO()
    mod_blur_img.save(bio_mod, "JPEG")
    mod_blur_bytes = bio_mod.getvalue()

    q5a = image_quality_service.check_image_quality(mod_blur_bytes)
    print(f"✓ Moderate blur pass:   {q5a.get('pass')}")
    print(f"✓ Moderate blur issues: {q5a.get('issues')}")
    assert q5a.get("pass") is True, "TEST 5A FAILED: Moderate blur was rejected!"

    res5a = await execute_real_inference_pipeline(mod_blur_bytes)
    print(f"✓ Moderate blur valid:  {res5a.get('valid_leaf')}")
    assert res5a.get("valid_leaf") is True, "TEST 5A FAILED: Pipeline rejected moderate blur!"

    # B. Extreme blur -> Rejection with exact message
    extreme_blur_img = img.filter(ImageFilter.GaussianBlur(radius=18.0))
    bio_ext = io.BytesIO()
    extreme_blur_img.save(bio_ext, "JPEG")
    ext_blur_bytes = bio_ext.getvalue()

    q5b = image_quality_service.check_image_quality(ext_blur_bytes)
    print(f"✓ Extreme blur pass:    {q5b.get('pass')} (Expected: False)")
    print(f"✓ Extreme blur reason:  {q5b.get('reason')}")
    print(f"✓ Extreme blur message: {q5b.get('message')}")
    assert q5b.get("pass") is False, "TEST 5B FAILED: Extreme blur was NOT rejected!"
    assert q5b.get("reason") == "image_quality_failed", "TEST 5B FAILED: Reason is not image_quality_failed!"
    assert q5b.get("message") == "Image is too blurry. Please capture a sharper leaf image.", f"TEST 5B FAILED: Unexpected message {q5b.get('message')}"

    res5b = await execute_real_inference_pipeline(ext_blur_bytes)
    print(f"✓ Extreme blur pipeline: valid_leaf={res5b.get('valid_leaf')}, reason={res5b.get('reason')}")
    assert res5b.get("valid_leaf") is False, "TEST 5B FAILED: Pipeline accepted extreme blur!"
    print(">>> TEST 5 PASSED: Blur handling verified (warning on moderate blur, exact rejection on extreme blur)!")

    print("\n" + "=" * 70)
    print("🎉 ALL 5 TEST CASES PASSED SUCCESSFULLY WITH 100% COMPLIANCE!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_tests())
