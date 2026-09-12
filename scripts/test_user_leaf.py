import os
import sys
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
from services import image_quality_service, leaf_validator_service, model_service

screenshot_path = "/Users/apple/.gemini/antigravity-ide/brain/91990813-bc9a-485f-aa89-5064f42aab10/.user_uploaded/media_1789192036645.jpg"
im = Image.open(screenshot_path)
# Crop the camera preview box showing the user's hand holding the leaf
# Image size is (576, 1280)
crop_box = (58, 115, 520, 285)
leaf_crop = im.crop(crop_box)
out_path = os.path.join(os.path.dirname(__file__), "user_leaf_sample.jpg")
leaf_crop.save(out_path)
print(f"Saved cropped user leaf to {out_path}, size={leaf_crop.size}")

with open(out_path, "rb") as f:
    b = f.read()

q = image_quality_service.check_image_quality(b)
print("Quality result:", q)

l = leaf_validator_service.predict(b)
print("Leaf Validator result:", l)

m_loaded = model_service.is_model_loaded()
print("Model loaded:", m_loaded)
if not m_loaded:
    model_service.load_model()
try:
    pred = model_service.predict(b)
    print("Model Prediction:", pred)
except Exception as e:
    print("Prediction error:", e)
