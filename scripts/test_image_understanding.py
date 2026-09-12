"""
Verdra — Comprehensive Test Suite for Image Understanding Validation Layer
Tests all required cases from user prompt:
1. Human photo -> Rejected as human / INVALID_INPUT, disease model NOT run
2. Dog photo   -> Rejected as animal / INVALID_INPUT, disease model NOT run
3. Car photo   -> Rejected as vehicle / INVALID_INPUT, disease model NOT run
4. Flower photo -> Rejected as flower / INVALID_INPUT, disease model NOT run
5. Tomato leaf  -> Classified as crop leaf, runs disease model -> Tomato prediction
6. Potato leaf  -> Classified as crop leaf, runs disease model -> Potato prediction
7. Pepper leaf  -> Classified as crop leaf, runs disease model -> Pepper prediction
"""
import sys
import os
import asyncio
import io
import numpy as np
from PIL import Image, ImageDraw

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

from services import image_understanding_service
from routes.predict import execute_real_inference_pipeline


def make_human_photo() -> bytes:
    """Realistic human portrait image."""
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
    """Realistic animal/dog photo with fur striations and animal muzzle."""
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


def make_car_photo() -> bytes:
    """Realistic vehicle/car photo with metallic body, windshield, and wheels."""
    img = Image.new("RGB", (320, 240), (150, 180, 210))
    d = ImageDraw.Draw(img)
    # Ground asphalt
    d.rectangle([0, 180, 320, 240], fill=(60, 60, 65))
    # Red car body
    d.rectangle([40, 110, 280, 180], fill=(200, 30, 30))
    # Windshield / cabin
    d.polygon([(80, 110), (110, 60), (210, 60), (240, 110)], fill=(40, 70, 100))
    # Wheels
    d.ellipse([65, 160, 115, 210], fill=(15, 15, 15))
    d.ellipse([80, 175, 100, 195], fill=(200, 200, 205))
    d.ellipse([205, 160, 255, 210], fill=(15, 15, 15))
    d.ellipse([220, 175, 240, 195], fill=(200, 200, 205))
    # Headlight
    d.rectangle([270, 120, 280, 140], fill=(255, 255, 200))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def make_flower_photo() -> bytes:
    """Realistic vibrant flower with bright pink petals and yellow center."""
    img = Image.new("RGB", (300, 300), (35, 65, 30))
    d = ImageDraw.Draw(img)
    cx, cy = 150, 150
    petal_color = (255, 40, 130)  # Vivid pink/magenta
    for angle in np.linspace(0, 2 * np.pi, 9, endpoint=False):
        px = int(cx + 65 * np.cos(angle))
        py = int(cy + 65 * np.sin(angle))
        d.ellipse([px - 32, py - 32, px + 32, py + 32], fill=petal_color)
    # Bright center stamen
    d.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=(255, 220, 20))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


async def run_all_tests():
    print("=" * 70)
    print("🌿 VERDRA — TESTING ALL 7 IMAGE UNDERSTANDING VALIDATION CASES")
    print("=" * 70)

    # -------------------------------------------------------------
    # TEST 1: HUMAN PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 1: Human Photo ---")
    human_bytes = make_human_photo()
    res1 = await execute_real_inference_pipeline(human_bytes)
    print(f"Status:          {res1.get('status')}")
    print(f"Detected Object: {res1.get('detected_object')}")
    print(f"Confidence:      {res1.get('confidence')}")
    print(f"Message:         {res1.get('message')}")
    print(f"Disease run:     {res1.get('prediction')}")
    assert res1.get("status") == "INVALID_INPUT", f"Expected INVALID_INPUT, got {res1.get('status')}"
    assert res1.get("detected_object") == "human", f"Expected human, got {res1.get('detected_object')}"
    assert res1.get("prediction") is None, "Disease model must NOT run on human photo"
    print("✅ TEST 1 PASSED: Correctly identified human and blocked disease model.")

    # -------------------------------------------------------------
    # TEST 2: DOG / ANIMAL PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 2: Dog / Animal Photo ---")
    dog_bytes = make_dog_photo()
    res2 = await execute_real_inference_pipeline(dog_bytes)
    print(f"Status:          {res2.get('status')}")
    print(f"Detected Object: {res2.get('detected_object')}")
    print(f"Confidence:      {res2.get('confidence')}")
    print(f"Message:         {res2.get('message')}")
    print(f"Disease run:     {res2.get('prediction')}")
    assert res2.get("status") == "INVALID_INPUT", f"Expected INVALID_INPUT, got {res2.get('status')}"
    assert res2.get("detected_object") == "animal", f"Expected animal, got {res2.get('detected_object')}"
    assert res2.get("prediction") is None, "Disease model must NOT run on animal photo"
    print("✅ TEST 2 PASSED: Correctly identified animal and blocked disease model.")

    # -------------------------------------------------------------
    # TEST 3: CAR / VEHICLE PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 3: Car / Vehicle Photo ---")
    car_bytes = make_car_photo()
    res3 = await execute_real_inference_pipeline(car_bytes)
    print(f"Status:          {res3.get('status')}")
    print(f"Detected Object: {res3.get('detected_object')}")
    print(f"Confidence:      {res3.get('confidence')}")
    print(f"Message:         {res3.get('message')}")
    print(f"Disease run:     {res3.get('prediction')}")
    assert res3.get("status") == "INVALID_INPUT", f"Expected INVALID_INPUT, got {res3.get('status')}"
    assert res3.get("detected_object") == "vehicle", f"Expected vehicle, got {res3.get('detected_object')}"
    assert res3.get("prediction") is None, "Disease model must NOT run on vehicle photo"
    print("✅ TEST 3 PASSED: Correctly identified vehicle and blocked disease model.")

    # -------------------------------------------------------------
    # TEST 4: FLOWER PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 4: Flower Photo ---")
    flower_bytes = make_flower_photo()
    res4 = await execute_real_inference_pipeline(flower_bytes)
    print(f"Status:          {res4.get('status')}")
    print(f"Detected Object: {res4.get('detected_object')}")
    print(f"Confidence:      {res4.get('confidence')}")
    print(f"Message:         {res4.get('message')}")
    print(f"Disease run:     {res4.get('prediction')}")
    assert res4.get("status") == "INVALID_INPUT", f"Expected INVALID_INPUT, got {res4.get('status')}"
    assert res4.get("detected_object") == "flower", f"Expected flower, got {res4.get('detected_object')}"
    assert res4.get("prediction") is None, "Disease model must NOT run on flower photo"
    print("✅ TEST 4 PASSED: Correctly identified flower and blocked disease model.")

    # -------------------------------------------------------------
    # TEST 5: TOMATO LEAF PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 5: Tomato Leaf Photo ---")
    with open(os.path.join(PROJECT_ROOT, "sample_images", "sample_tomato_healthy.jpg"), "rb") as f:
        tomato_bytes = f.read()
    res5 = await execute_real_inference_pipeline(tomato_bytes, crop="tomato")
    print(f"Status:          {res5.get('status')}")
    print(f"Detected Object: {res5.get('detected_object')}")
    print(f"Disease Pred:    {res5.get('prediction')}")
    print(f"Confidence:      {res5.get('confidence') * 100:.1f}%")
    assert res5.get("status") in ("CONFIDENT", "UNCERTAIN"), f"Expected CONFIDENT/UNCERTAIN, got {res5.get('status')}"
    assert res5.get("detected_object") == "crop leaf", f"Expected crop leaf, got {res5.get('detected_object')}"
    assert res5.get("prediction") is not None, "Disease model MUST run on valid tomato leaf"
    print("✅ TEST 5 PASSED: Valid tomato leaf processed through disease model.")

    # -------------------------------------------------------------
    # TEST 6: POTATO LEAF PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 6: Potato Leaf Photo ---")
    with open(os.path.join(PROJECT_ROOT, "sample_images", "sample_potato_early_blight.jpg"), "rb") as f:
        potato_bytes = f.read()
    res6 = await execute_real_inference_pipeline(potato_bytes, crop="potato")
    print(f"Status:          {res6.get('status')}")
    print(f"Detected Object: {res6.get('detected_object')}")
    print(f"Disease Pred:    {res6.get('prediction')}")
    print(f"Confidence:      {res6.get('confidence') * 100:.1f}%")
    assert res6.get("status") in ("CONFIDENT", "UNCERTAIN"), f"Expected CONFIDENT/UNCERTAIN, got {res6.get('status')}"
    assert res6.get("detected_object") == "crop leaf", f"Expected crop leaf, got {res6.get('detected_object')}"
    assert res6.get("prediction") is not None, "Disease model MUST run on valid potato leaf"
    print("✅ TEST 6 PASSED: Valid potato leaf processed through disease model.")

    # -------------------------------------------------------------
    # TEST 7: PEPPER LEAF PHOTO
    # -------------------------------------------------------------
    print("\n--- TEST 7: Pepper Leaf Photo ---")
    with open(os.path.join(PROJECT_ROOT, "sample_images", "sample_pepper_bacterial_spot.jpg"), "rb") as f:
        pepper_bytes = f.read()
    res7 = await execute_real_inference_pipeline(pepper_bytes, crop="pepper")
    print(f"Status:          {res7.get('status')}")
    print(f"Detected Object: {res7.get('detected_object')}")
    print(f"Disease Pred:    {res7.get('prediction')}")
    print(f"Confidence:      {res7.get('confidence') * 100:.1f}%")
    assert res7.get("status") in ("CONFIDENT", "UNCERTAIN"), f"Expected CONFIDENT/UNCERTAIN, got {res7.get('status')}"
    assert res7.get("detected_object") == "crop leaf", f"Expected crop leaf, got {res7.get('detected_object')}"
    assert res7.get("prediction") is not None, "Disease model MUST run on valid pepper leaf"
    print("✅ TEST 7 PASSED: Valid pepper leaf processed through disease model.")

    print("\n" + "=" * 70)
    print("🎉 ALL 7 TEST CASES PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
