"""
Verdra — Multi-Crop Agricultural Vision Model Trainer (17 Comprehensive Benchmark Classes)
Expands model coverage beyond Solanaceae to Corn/Maize, Apple, and Grape:
1. Pepper_bell_Bacterial_spot
2. Potato_Early_Blight
3. Potato_Late_Blight
4. Potato_healthy
5. Tomato_Bacterial_spot
6. Tomato_Early_Blight
7. Tomato_Late_Blight
8. Tomato_healthy
9. Corn_Common_Rust
10. Corn_Northern_Leaf_Blight
11. Corn_healthy
12. Apple_Scab
13. Apple_Black_Rot
14. Apple_healthy
15. Grape_Black_Rot
16. Grape_Esca
17. Grape_healthy

Outputs:
- models/multi_crop_vision_model.keras
- models/multi_crop_classes.json
- models/multi_crop_metrics.json
- backend/models/multi_crop_vision_model.keras
- backend/models/multi_crop_classes.json
- backend/models/multi_crop_metrics.json
"""
import os
import sys
import json
import time
import zipfile
import glob
import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "ml"))
from train_model import extract_features

DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset_multicrop")

OUTPUT_KERAS_ROOT = os.path.join(PROJECT_ROOT, "models", "multi_crop_vision_model.keras")
OUTPUT_CLASSES_ROOT = os.path.join(PROJECT_ROOT, "models", "multi_crop_classes.json")
OUTPUT_METRICS_ROOT = os.path.join(PROJECT_ROOT, "models", "multi_crop_metrics.json")

OUTPUT_KERAS_BACKEND = os.path.join(PROJECT_ROOT, "backend", "models", "multi_crop_vision_model.keras")
OUTPUT_CLASSES_BACKEND = os.path.join(PROJECT_ROOT, "backend", "models", "multi_crop_classes.json")
OUTPUT_METRICS_BACKEND = os.path.join(PROJECT_ROOT, "backend", "models", "multi_crop_metrics.json")


def load_multicrop_split(split_name: str, class_names: list[str]):
    X, y = [], []
    split_dir = os.path.join(DATASET_DIR, split_name)
    for class_idx, class_name in enumerate(class_names):
        folder = os.path.join(split_dir, class_name)
        if not os.path.isdir(folder):
            continue
        files = sorted(glob.glob(os.path.join(folder, "*.*")))
        for f in files:
            try:
                with Image.open(f) as img:
                    feat = extract_features(img)
                    X.append(feat)
                    y.append(class_idx)
            except Exception:
                continue
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def main():
    print("=" * 70)
    print("🌾 Training Verdra Multi-Crop Vision Model (17 Classes across 5 Crop Types)")
    print("=" * 70)

    # 1. Discover classes
    train_dir = os.path.join(DATASET_DIR, "train")
    class_names = sorted([d for d in os.listdir(train_dir) if os.path.isdir(os.path.join(train_dir, d))])
    num_classes = len(class_names)
    print(f"Loaded {num_classes} agricultural pathogen classes:")
    for i, c in enumerate(class_names):
        print(f"  [{i:02d}] {c}")

    # 2. Load splits
    print("\nLoading and extracting 256-D MobileNetV2 Conv_1 features...")
    X_train, y_train = load_multicrop_split("train", class_names)
    X_val, y_val = load_multicrop_split("val", class_names)
    X_test, y_test = load_multicrop_split("test", class_names)

    print(f"Train samples: {len(X_train)} | Val samples: {len(X_val)} | Test samples: {len(X_test)}")

    # Combine train + val for maximum weight calibration
    X_full_train = np.vstack([X_train, X_val])
    y_full_train = np.concatenate([y_train, y_val])

    # Feature normalizer
    mean = np.mean(X_full_train, axis=0)
    std = np.std(X_full_train, axis=0) + 1e-7

    X_train_norm = (X_full_train - mean) / std
    X_test_norm = (X_test - mean) / std

    # 3. Train high-capacity Softmax classifier
    print("\nTraining Multi-Class Neural Softmax Head (L2 regularized, C=2.0)...")
    clf = LogisticRegression(
        C=2.0,
        max_iter=1500,
        solver="lbfgs",
        random_state=42,
    )
    clf.fit(X_train_norm, y_full_train)

    # 4. Evaluate on Independent Held-Out Test Set
    y_pred = clf.predict(X_test_norm)
    y_probs = clf.predict_proba(X_test_norm)

    test_acc = float(accuracy_score(y_test, y_pred))
    test_prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    test_rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    test_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))

    # Top-3 Accuracy
    top3_correct = 0
    for i in range(len(y_test)):
        top3_classes = np.argsort(y_probs[i])[-3:]
        if y_test[i] in top3_classes:
            top3_correct += 1
    top3_acc = float(top3_correct / len(y_test))

    print("\n" + "=" * 50)
    print("📈 Evaluation on Independent Test Set:")
    print(f"   Top-1 Accuracy:  {test_acc * 100:.2f}%")
    print(f"   Top-3 Accuracy:  {top3_acc * 100:.2f}%")
    print(f"   Macro Precision: {test_prec * 100:.2f}%")
    print(f"   Macro Recall:    {test_rec * 100:.2f}%")
    print(f"   Macro F1 Score:  {test_f1 * 100:.2f}%")
    print("=" * 50)

    # 5. Package Weights into .keras format
    # Weight shape: (256, num_classes)
    weights = clf.coef_.T.astype(np.float32)  # shape (256, 17)
    bias = clf.intercept_.astype(np.float32)   # shape (17,)

    # Bake normalizer into weights so inference directly runs on raw features:
    W_baked = (weights / std[:, None]).astype(np.float32)
    b_baked = (bias - np.dot(mean / std, weights)).astype(np.float32)

    model_metadata = {
        "architecture": "MobileNetV2_MultiCrop_TransferLearning_v2",
        "backbone": "MobileNetV2_Conv_1",
        "input_shape": [224, 224, 3],
        "feature_dim": 256,
        "num_classes": num_classes,
        "classes": class_names,
        "feature_mean": mean.tolist(),
        "feature_std": std.tolist(),
        "weights": W_baked.tolist(),
        "bias": b_baked.tolist(),
        "is_baked_normalized": True,
        "metrics": {
            "top1_accuracy": test_acc,
            "top3_accuracy": top3_acc,
            "precision": test_prec,
            "recall": test_rec,
            "f1_score": test_f1,
            "test_samples": len(y_test),
        },
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    # Save classes JSON
    for path in [OUTPUT_CLASSES_ROOT, OUTPUT_CLASSES_BACKEND]:
        with open(path, "w") as f:
            json.dump(class_names, f, indent=2)
        print(f"💾 Saved class names: {path}")

    # Save metrics JSON
    for path in [OUTPUT_METRICS_ROOT, OUTPUT_METRICS_BACKEND]:
        with open(path, "w") as f:
            json.dump(model_metadata["metrics"], f, indent=2)
        print(f"💾 Saved metrics: {path}")

    # Save .keras archive with both h5 and json payloads
    bio = io.BytesIO()
    with h5py.File(bio, "w") as h5f:
        grp = h5f.create_group("layers/dense/vars")
        grp.create_dataset("0", data=weights)
        grp.create_dataset("1", data=bias)
    h5_bytes = bio.getvalue()

    metadata_bytes = json.dumps({
        "classes": class_names,
        "metrics": model_metadata["metrics"],
        "feature_dim": 256,
        "created_at": model_metadata["created_at"],
    }).encode("utf-8")

    for path in [OUTPUT_KERAS_ROOT, OUTPUT_KERAS_BACKEND]:
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("config.json", json.dumps({"model_name": "multi_crop_vision_model", "classes": class_names}))
            zf.writestr("metadata.json", metadata_bytes)
            zf.writestr("model_weights.json", json.dumps(model_metadata))
            zf.writestr("model.weights.h5", h5_bytes)
        print(f"💾 Saved .keras model archive: {path}")

    print("\n🎉 Multi-Crop Agricultural Vision Model successfully built and saved!")


if __name__ == "__main__":
    main()
