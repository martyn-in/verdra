"""
AgriVisionAI — Standalone Model Inference Script
Loads trained model and runs inference on a single image or directory of images.

Usage:
    python inference.py --model_path ../models/agri_vision_model.keras --image_path ../sample_images/sample_tomato_early_blight.jpg
    python inference.py --model_path ../models/agri_vision_model.keras --image_path ../sample_images/ --top_k 3
"""
import argparse
import json
import os
import sys
import numpy as np
from PIL import Image

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
from tensorflow import keras


def load_classes(class_names_path: str = None):
    if not class_names_path:
        class_names_path = os.path.join(os.path.dirname(__file__), "class_names.json")
    with open(class_names_path, "r") as f:
        return json.load(f)


def preprocess_image(image_path: str, target_size: tuple = (224, 224)):
    """Load and preprocess image for MobileNetV2."""
    img = Image.open(image_path).convert("RGB")
    img = img.resize(target_size)
    img_array = np.array(img, dtype=np.float32) / 255.0
    img_batch = np.expand_dims(img_array, axis=0)
    return img_batch, img


def predict_single(model, image_path: str, class_names: list, top_k: int = 3):
    """Predict class for a single image."""
    img_batch, _ = preprocess_image(image_path)
    preds = model.predict(img_batch, verbose=0)[0]

    # Get top-k indices
    top_indices = np.argsort(preds)[::-1][:top_k]

    results = []
    for idx in top_indices:
        results.append({
            "class_name": class_names[idx] if idx < len(class_names) else f"Class_{idx}",
            "confidence": float(preds[idx]),
            "percentage": f"{preds[idx] * 100:.2f}%"
        })

    return results


def main():
    parser = argparse.ArgumentParser(description="AgriVisionAI Model Inference")
    parser.add_argument("--model_path", type=str, default="../models/agri_vision_model.keras", help="Path to trained model")
    parser.add_argument("--image_path", type=str, required=True, help="Path to image file or directory")
    parser.add_argument("--classes_path", type=str, default=None, help="Path to class_names.json")
    parser.add_argument("--top_k", type=int, default=3, help="Number of top predictions to display")
    args = parser.parse_args()

    print("=" * 60)
    print("🌿 AgriVisionAI — Model Inference Engine")
    print("=" * 60)

    # Verify model exists
    if not os.path.exists(args.model_path):
        print(f"❌ Error: Model not found at {args.model_path}")
        sys.exit(1)

    print(f"📦 Loading model: {args.model_path}")
    model = keras.models.load_model(args.model_path)
    class_names = load_classes(args.classes_path)
    print(f"✅ Loaded {len(class_names)} classes.")

    # Process image(s)
    if os.path.isdir(args.image_path):
        image_files = [
            os.path.join(args.image_path, f)
            for f in os.listdir(args.image_path)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]
        print(f"\n🔍 Processing {len(image_files)} images in {args.image_path}...")
        for img_file in image_files:
            print(f"\n📸 Image: {os.path.basename(img_file)}")
            results = predict_single(model, img_file, class_names, top_k=args.top_k)
            for i, res in enumerate(results, 1):
                print(f"   {i}. {res['class_name']}: {res['percentage']} (conf: {res['confidence']:.4f})")
    elif os.path.isfile(args.image_path):
        print(f"\n📸 Analyzing: {args.image_path}")
        results = predict_single(model, args.image_path, class_names, top_k=args.top_k)
        print("\n--- Predictions ---")
        for i, res in enumerate(results, 1):
            status = "🌱 Healthy" if "healthy" in res['class_name'].lower() else "⚠️ Diseased"
            print(f"   {i}. [{status}] {res['class_name']}: {res['percentage']}")
    else:
        print(f"❌ Error: Invalid image path: {args.image_path}")
        sys.exit(1)


if __name__ == "__main__":
    main()
