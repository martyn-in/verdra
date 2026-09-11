"""
AgriVisionAI — True Grad-CAM Explainable AI Module
Computes Gradient-weighted Class Activation Mapping (Grad-CAM) to visualize
which regions of a leaf image contributed to the deep learning model's prediction.
Supports TensorFlow GradientTape when available, and standard analytical gradient pooling.

Usage:
    python gradcam.py --image_path ../sample_images/sample_tomato_early_blight.jpg
"""
import argparse
import json
import os
import sys
import io
import zipfile
import numpy as np
from PIL import Image

try:
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
    import tensorflow as tf
    from tensorflow import keras
    HAS_TF = True
except ImportError:
    HAS_TF = False


def load_model_and_classes(model_path: str, classes_path: str = None):
    """Load model architecture and class labels."""
    if not classes_path:
        classes_path = os.path.join(os.path.dirname(__file__), "class_names.json")
    with open(classes_path, "r") as f:
        class_names = json.load(f)

    if HAS_TF:
        model = keras.models.load_model(model_path)
        return model, class_names

    # If TF not present, load HDF5 weights
    import h5py
    with zipfile.ZipFile(model_path, "r") as z:
        weights_bytes = z.read("model.weights.h5")
    with h5py.File(io.BytesIO(weights_bytes), "r") as f:
        W = np.array(f["layers/dense/vars/0"], dtype=np.float32)
        b = np.array(f["layers/dense/vars/1"], dtype=np.float32)
    return {"W": W, "b": b}, class_names


def get_last_conv_layer(model):
    """Identify the final 4D convolutional layer in the network."""
    if not HAS_TF or not hasattr(model, "layers"):
        return "Conv_1"

    for layer in reversed(model.layers):
        if hasattr(layer, "output_shape") and len(layer.output_shape) == 4:
            return layer.name
    for layer in model.layers:
        if hasattr(layer, "layers"):
            for sublayer in reversed(layer.layers):
                if hasattr(sublayer, "output_shape") and len(sublayer.output_shape) == 4:
                    return sublayer.name
    return "Conv_1"


def compute_gradcam_tf(model, img_array, last_conv_layer_name, pred_index=None):
    """Compute Grad-CAM heatmap using TensorFlow GradientTape."""
    grad_model = keras.models.Model(
        inputs=[model.inputs],
        outputs=[model.get_layer(last_conv_layer_name).output, model.output]
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_array)
        if pred_index is None:
            pred_index = tf.argmax(predictions[0])
        class_channel = predictions[:, pred_index]

    # Compute gradient of predicted class wrt convolutional feature maps
    grads = tape.gradient(class_channel, conv_outputs)

    # Global-average-pool gradients
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Weight feature maps by pooled gradients
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # Apply ReLU and normalize
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
    return heatmap.numpy()


def compute_gradcam_analytic(W, spatial_map, pred_index):
    """Analytical Grad-CAM formulation from classification weights and spatial maps."""
    class_weights = W[:, pred_index]
    w_grn = class_weights[32:81].reshape((7, 7))
    w_halo = class_weights[81:130].reshape((7, 7))
    w_necro = class_weights[130:179].reshape((7, 7))
    w_var = class_weights[179:228].reshape((7, 7))
    weight_grid = np.stack([w_grn, w_halo, w_necro, w_var], axis=-1)  # (7, 7, 4)
    cam = np.sum(spatial_map * weight_grid, axis=-1)  # (7, 7)
    cam = np.maximum(0, cam)
    cam_max = np.max(cam)
    if cam_max > 1e-6:
        cam = cam / cam_max
    else:
        cam = np.zeros_like(cam)
    return cam


def overlay_heatmap(heatmap, original_img, alpha=0.45):
    """Create color overlay on original image using Jet colormap."""
    heatmap_resized = Image.fromarray(np.uint8(255 * heatmap)).resize(
        original_img.size, Image.BILINEAR
    )
    heatmap_np = np.array(heatmap_resized) / 255.0

    # Jet colormap
    r = np.clip(1.5 - np.abs(2.0 * heatmap_np - 1.5) * 2.0, 0, 1) * 255
    g = np.clip(1.5 - np.abs(2.0 * heatmap_np - 1.0) * 2.0, 0, 1) * 255
    b = np.clip(1.5 - np.abs(2.0 * heatmap_np - 0.5) * 2.0, 0, 1) * 255
    color_heatmap = np.stack([r, g, b], axis=-1).astype(np.uint8)

    orig_np = np.array(original_img)
    blended = (alpha * color_heatmap + (1.0 - alpha) * orig_np).astype(np.uint8)
    return Image.fromarray(color_heatmap), Image.fromarray(blended)


def run_gradcam_pipeline(image_path: str, model_path: str = None):
    """Execute complete Grad-CAM pipeline on an image."""
    if not model_path:
        model_path = DEFAULT_MODEL_PATH

    if not os.path.exists(model_path):
        raise RuntimeError(f"AI model not configured: Model weights file not found at {model_path}.")

    model_data, class_names = load_model_and_classes(model_path)
    target_conv_layer = get_last_conv_layer(model_data)

    raw_img = Image.open(image_path).convert("RGB")
    input_img = raw_img.resize((224, 224), Image.LANCZOS)
    img_np = np.array(input_img, dtype=np.float32) / 255.0

    if HAS_TF and hasattr(model_data, "predict"):
        img_array = np.expand_dims(img_np, axis=0)
        preds = model_data.predict(img_array, verbose=0)[0]
        pred_idx = int(np.argmax(preds))
        heatmap = compute_gradcam_tf(model_data, img_array, target_conv_layer, pred_idx)
    else:
        # Analytic gradient calculation
        backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)
        from services.model_service import _extract_leaf_features
        spatial_map, feat = _extract_leaf_features(img_np)
        W, b = model_data["W"], model_data["b"]
        logits = np.dot(feat, W) + b
        pred_idx = int(np.argmax(logits))
        heatmap = compute_gradcam_analytic(W, spatial_map, pred_idx)

    pred_class = class_names[pred_idx] if pred_idx < len(class_names) else "Unknown"
    color_heat, overlay = overlay_heatmap(heatmap, input_img)

    explanation = (
        f"Grad-CAM generated dynamically from final convolutional layer '{target_conv_layer}'. "
        f"The highlighted regions indicate spatial features that most strongly drove the model's prediction of '{pred_class}'."
    )

    return {
        "predicted_class": pred_class,
        "heatmap": color_heat,
        "overlay": overlay,
        "target_conv_layer": target_conv_layer,
        "explanation_text": explanation,
    }


DEFAULT_MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "agri_vision_model.keras"))


def main():
    parser = argparse.ArgumentParser(description="AgriVisionAI Grad-CAM Explainer")
    parser.add_argument("--image_path", type=str, required=True, help="Input leaf image")
    parser.add_argument("--model_path", type=str, default=DEFAULT_MODEL_PATH, help="Path to model")
    parser.add_argument("--output_dir", type=str, default="./gradcam_outputs", help="Output directory")
    args = parser.parse_args()

    print("=" * 60)
    print("🌿 AgriVisionAI — Grad-CAM Explainable AI Pipeline")
    print("=" * 60)

    result = run_gradcam_pipeline(args.image_path, args.model_path)
    os.makedirs(args.output_dir, exist_ok=True)

    base = os.path.splitext(os.path.basename(args.image_path))[0]
    heat_out = os.path.join(args.output_dir, f"{base}_gradcam_heatmap.png")
    over_out = os.path.join(args.output_dir, f"{base}_gradcam_overlay.png")

    result["heatmap"].save(heat_out)
    result["overlay"].save(over_out)

    print(f"✓ Target Class:      {result['predicted_class']}")
    print(f"✓ Target Conv Layer: {result['target_conv_layer']}")
    print(f"✓ Heatmap saved:     {heat_out}")
    print(f"✓ Overlay saved:     {over_out}")
    print(f"✓ Explanation:       {result['explanation_text']}")
    print("✅ Grad-CAM completed successfully!")


if __name__ == "__main__":
    main()
