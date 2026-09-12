"""
Verdra — Comprehensive OpenAI Vision & Pre-Validation Test Suite
Validates the 8 exact required specimens:
1. Bottle     -> Rejection: Not a leaf (Disease model NOT called)
2. Phone      -> Rejection: Not a leaf (Disease model NOT called)
3. Human      -> Rejection: Not a leaf (Disease model NOT called)
4. Dog        -> Rejection: Not a leaf (Disease model NOT called)
5. Mango Leaf -> Rejection: Unsupported crop (Disease model NOT called)
6. Tomato Leaf -> Accepted: Supported crop -> Disease model called
7. Potato Leaf -> Accepted: Supported crop -> Disease model called
8. Pepper Leaf -> Accepted: Supported crop -> Disease model called
"""
import sys
import os
import io
import asyncio
import numpy as np
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

from services import openai_vision_service
from routes.predict import execute_real_inference_pipeline


def make_bottle_photo() -> bytes:
    """Generate a realistic water bottle image (cylindrical with neck & body)."""
    img = Image.new("RGB", (300, 300), (245, 245, 245))
    d = ImageDraw.Draw(img)
    # Bottle cap
    d.rectangle([135, 20, 165, 45], fill=(30, 90, 180))
    # Bottle neck
    d.rectangle([138, 45, 162, 90], fill=(160, 200, 235))
    # Bottle shoulder
    d.polygon([(138, 90), (162, 90), (210, 140), (90, 140)], fill=(160, 200, 235))
    # Bottle body
    d.rectangle([90, 140, 210, 270], fill=(160, 200, 235))
    # Label
    d.rectangle([92, 175, 208, 225], fill=(240, 240, 250))
    d.line([(105, 195), (195, 195)], fill=(30, 90, 180), width=3)
    d.line([(105, 205), (170, 205)], fill=(80, 80, 80), width=2)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_phone_photo() -> bytes:
    """Generate a realistic smartphone image (vertical dark rectangle with screen & bezel)."""
    img = Image.new("RGB", (300, 300), (230, 225, 215))
    d = ImageDraw.Draw(img)
    # Phone chassis
    d.rounded_rectangle([95, 30, 205, 270], radius=16, fill=(25, 25, 28))
    # Screen
    d.rectangle([105, 55, 195, 245], fill=(15, 18, 22))
    # Speaker slot / camera notch
    d.line([(135, 42), (165, 42)], fill=(60, 60, 65), width=3)
    d.ellipse([145, 252, 155, 262], fill=(45, 45, 50))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_human_photo() -> bytes:
    """Generate a realistic human portrait with face and skin tones."""
    img = Image.new("RGB", (300, 300), (90, 140, 200))
    d = ImageDraw.Draw(img)
    # Face skin tone
    d.ellipse([70, 40, 230, 220], fill=(215, 165, 135))
    # Neck & shoulders
    d.rectangle([110, 200, 190, 270], fill=(215, 165, 135))
    d.polygon([(40, 300), (110, 250), (190, 250), (260, 300)], fill=(40, 50, 70))
    # Eyes & mouth
    d.ellipse([100, 100, 130, 120], fill=(30, 30, 30))
    d.ellipse([170, 100, 200, 120], fill=(30, 30, 30))
    d.line([(120, 165), (180, 165)], fill=(180, 60, 60), width=4)
    # Hair
    d.chord([65, 25, 235, 120], 180, 360, fill=(30, 25, 25))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_dog_photo() -> bytes:
    """Generate a realistic dog/animal portrait with coat and fur striations."""
    rng = np.random.RandomState(42)
    fur_base = (165, 110, 60)
    arr = np.ones((300, 300, 3), dtype=np.uint8) * np.array(fur_base, dtype=np.uint8)
    fur_noise = (rng.randn(300, 300) * 22).astype(np.int16)
    arr = np.clip(arr + fur_noise[:, :, None], 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    d = ImageDraw.Draw(img)
    # Dog ears
    d.polygon([(50, 30), (110, 110), (30, 120)], fill=(120, 75, 40))
    d.polygon([(250, 30), (190, 110), (270, 120)], fill=(120, 75, 40))
    # Dog eyes
    d.ellipse([95, 130, 125, 155], fill=(20, 15, 10))
    d.ellipse([175, 130, 205, 155], fill=(20, 15, 10))
    # Snout & black nose
    d.ellipse([115, 160, 185, 230], fill=(130, 85, 45))
    d.ellipse([135, 175, 165, 195], fill=(15, 15, 15))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_mango_leaf_photo() -> bytes:
    """
    Generate a lanceolate mango leaf specimen (elongated slender aspect ratio > 3.0:1,
    smooth entire margins, prominent central pale midrib).
    """
    img = Image.new("RGB", (300, 300), (235, 235, 230))
    d = ImageDraw.Draw(img)
    # Slender lanceolate leaf: width ~60, height ~240 (ratio 4.0:1)
    pts = [
        (150, 25),   # Acute apex
        (178, 90),
        (182, 150),
        (175, 210),
        (152, 265),  # Petiole base
        (148, 265),
        (125, 210),
        (118, 150),
        (122, 90),
    ]
    d.polygon(pts, fill=(45, 120, 35))
    # Lighter green midrib
    d.line([(150, 30), (150, 265)], fill=(120, 175, 80), width=3)
    # Secondary penniveined lateral veins
    for y in range(60, 240, 20):
        d.line([(150, y), (175, y - 8)], fill=(75, 145, 55), width=1)
        d.line([(150, y), (125, y - 8)], fill=(75, 145, 55), width=1)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def get_real_sample_leaf(crop_name: str) -> bytes:
    """Load a real leaf image from public samples or dataset."""
    filename_map = {
        "tomato": "sample_tomato_healthy.jpg",
        "potato": "sample_potato_early_blight.jpg",
        "pepper": "sample_pepper_bacterial_spot.jpg",
    }
    sample_file = os.path.join(PROJECT_ROOT, "sample_images", filename_map[crop_name])
    if not os.path.exists(sample_file):
        sample_file = os.path.join(PROJECT_ROOT, "frontend", "public", "sample_images", filename_map[crop_name])
    with open(sample_file, "rb") as f:
        return f.read()


async def run_openai_vision_test_suite():
    print("=" * 75)
    print("🌿 VERDRA — OPENAI VISION PRE-VALIDATION TEST SUITE (8 SPECIMENS)")
    print("=" * 75)

    test_cases = [
        ("Bottle", make_bottle_photo, False, "not_leaf"),
        ("Phone", make_phone_photo, False, "not_leaf"),
        ("Human", make_human_photo, False, "not_leaf"),
        ("Dog", make_dog_photo, False, "not_leaf"),
        ("Mango leaf", make_mango_leaf_photo, False, "unsupported_crop"),
        ("Tomato leaf", lambda: get_real_sample_leaf("tomato"), True, None),
        ("Potato leaf", lambda: get_real_sample_leaf("potato"), True, None),
        ("Pepper leaf", lambda: get_real_sample_leaf("pepper"), True, None),
    ]

    all_passed = True

    for idx, (name, img_func, should_call_model, expected_reason) in enumerate(test_cases, 1):
        print(f"\n[{idx}/8] TESTING: {name.upper()}")
        print("-" * 50)
        img_bytes = img_func()

        # Step 1: Pre-validation endpoint check
        check_res = await openai_vision_service.analyze_image_with_openai(img_bytes)
        det_obj = check_res.get("object", check_res.get("detected_object"))
        det_plant = check_res.get("plant", check_res.get("detected_plant"))
        crop_sup = check_res.get("crop_supported", check_res.get("supported_crop"))
        action = check_res.get("action")
        conf = check_res.get("confidence")

        print(f"  [image-check] Object:         {det_obj}")
        print(f"  [image-check] Plant:          {det_plant}")
        print(f"  [image-check] Crop Supported: {crop_sup}")
        print(f"  [image-check] Action:         {action}")
        print(f"  [image-check] Confidence:     {conf:.2f}")

        # Step 2: Full Inference Pipeline Execution
        crop_arg = name.split()[0].lower() if should_call_model else "auto"
        res = await execute_real_inference_pipeline(img_bytes, crop=crop_arg)
        model_called = res.get("disease_model_called", False)

        print(f"  [pipeline]    Status:         {res.get('status')}")
        print(f"  [pipeline]    Model Called:   {model_called}")
        if model_called:
            print(f"  [pipeline]    Disease Pred:   {res.get('prediction')}")
            print(f"  [pipeline]    Confidence:     {res.get('confidence', 0)*100:.1f}%")
            print(f"  [pipeline]    Grad-CAM:       {bool(res.get('gradcam_url'))}")
            print(f"  [pipeline]    Severity:       {res.get('severity', {}).get('level')}")
            print(f"  [pipeline]    Weather Risk:   {res.get('risk', {}).get('level')}")
        else:
            print(f"  [pipeline]    Reason:         {res.get('reason')}")
            print(f"  [pipeline]    Advisory:       {repr(res.get('message'))}")

        # Assertions
        if should_call_model:
            if not model_called:
                print(f"❌ FAIL: Disease model should have been called for {name}")
                all_passed = False
            elif res.get("status") not in ("CONFIDENT", "UNCERTAIN"):
                print(f"❌ FAIL: Expected CONFIDENT or UNCERTAIN, got {res.get('status')}")
                all_passed = False
            else:
                print(f"✅ PASS: {name} validated and successfully diagnosed by disease model.")
        else:
            if model_called:
                print(f"❌ FAIL: Disease model MUST NOT be called for {name}")
                all_passed = False
            elif res.get("reason") != expected_reason:
                print(f"❌ FAIL: Expected reason '{expected_reason}', got '{res.get('reason')}'")
                all_passed = False
            else:
                print(f"✅ PASS: {name} correctly intercepted and blocked before disease model.")

    print("\n" + "=" * 75)
    if all_passed:
        print("🎉 ALL 8/8 VALIDATION SPECIMENS PASSED PERFECTLY!")
        print("Only supported crop leaves (Tomato, Potato, Pepper) reached disease model.")
    else:
        print("❌ ONE OR MORE TESTS FAILED.")
    print("=" * 75)
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(run_openai_vision_test_suite())
    sys.exit(0 if success else 1)
