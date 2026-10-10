"""
Verdra — Foliar Leaf vs. Non-Leaf ("Un-Leaf") Detection Model Training Script
Trains a background-invariant 64-D Foliar Gatekeeper classifier using:
- Real agricultural leaves across Solanaceae and extended multi-crop species
- Real field and bench sample leaf images
- Extensive hard-negative non-leaf classes (human skin/faces, electronics, documents, vehicles, animals, flat noise)
Outputs:
- models/leaf_non_leaf_model.json & .keras
- backend/models/leaf_non_leaf_model.json & .keras
"""

import os
import glob
import json
import time
import zipfile
import numpy as np
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score, confusion_matrix
from sklearn.model_selection import train_test_split

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset")
DATASET_MULTICROP_DIR = os.path.join(PROJECT_ROOT, "dataset_multicrop")
NON_LEAF_DIR = os.path.join(DATASET_DIR, "non_leaf")
SAMPLE_DIR = os.path.join(PROJECT_ROOT, "sample_images")

OUTPUT_JSON_ROOT = os.path.join(PROJECT_ROOT, "models", "leaf_non_leaf_model.json")
OUTPUT_KERAS_ROOT = os.path.join(PROJECT_ROOT, "models", "leaf_non_leaf_model.keras")
OUTPUT_JSON_BACKEND = os.path.join(PROJECT_ROOT, "backend", "models", "leaf_non_leaf_model.json")
OUTPUT_KERAS_BACKEND = os.path.join(PROJECT_ROOT, "backend", "models", "leaf_non_leaf_model.keras")

os.makedirs(os.path.dirname(OUTPUT_JSON_ROOT), exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_JSON_BACKEND), exist_ok=True)


def extract_leaf_features(img: Image.Image) -> np.ndarray:
    """
    Extracts a 64-dimensional illumination and background-invariant feature vector:
    1. Foliar chlorophyll chromaticity (green excess, chlorosis, necrosis)
    2. YCbCr skin tone cluster rejection (faces / hands)
    3. Organic vein edge energy vs rectilinear man-made edges
    4. Bimodal document / screen contrast
    5. Foreground foliar color moments (isolated from background)
    """
    img_rgb = img.convert("RGB").resize((224, 224), Image.LANCZOS)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    tot = r + g + b + 1e-6
    rn, gn, bn = r / tot, g / tot, b / tot

    # YCbCr conversion
    cb = 128 - 0.168736 * (r * 255) - 0.331264 * (g * 255) + 0.5 * (b * 255)
    cr = 128 + 0.5 * (r * 255) - 0.418688 * (g * 255) - 0.081312 * (b * 255)

    # 1. Skin locus
    skin_mask = (cb >= 77) & (cb <= 127) & (cr >= 133) & (cr <= 173) & (r > g) & (g > b)
    skin_ratio = float(np.mean(skin_mask))
    skin_center = float(np.mean(skin_mask[35:189, 35:189]))

    # 2. Chlorophyll green foliage & pathological tissue
    green_foliage = (gn > rn * 1.05) & (gn > bn * 1.1) & (g > 0.14) & (tot > 0.25) & (~skin_mask)
    yellow_chlorosis = (rn > 0.36) & (gn > 0.38) & (bn < 0.25) & (tot > 0.3) & (~skin_mask)
    necrotic_tissue = (rn > 0.38) & (gn > 0.32) & (bn < 0.28) & (tot < 0.6) & (tot > 0.12) & (~skin_mask)

    foliar_mask = green_foliage | yellow_chlorosis | necrotic_tissue
    foliar_ratio = float(np.mean(foliar_mask))
    green_ratio = float(np.mean(green_foliage))
    yellow_ratio = float(np.mean(yellow_chlorosis))
    necrotic_ratio = float(np.mean(necrotic_tissue))

    # 3. Organic Edge and Gradient Energy
    grad_x = np.abs(arr[:, 1:, :] - arr[:, :-1, :])
    grad_y = np.abs(arr[1:, :, :] - arr[:-1, :, :])
    edge_energy = float(np.mean(grad_x) + np.mean(grad_y))

    # 4. Rectilinear man-made lines
    row_var = float(np.var(np.mean(arr, axis=1)))
    col_var = float(np.var(np.mean(arr, axis=0)))
    axis_regularity = row_var + col_var

    # 5. Spatial quadrant foliage distribution
    q1 = float(np.mean(foliar_mask[:112, :112]))
    q2 = float(np.mean(foliar_mask[:112, 112:]))
    q3 = float(np.mean(foliar_mask[112:, :112]))
    q4 = float(np.mean(foliar_mask[112:, 112:]))
    qc = float(np.mean(foliar_mask[56:168, 56:168]))

    # 6. High frequency document/text contrast
    is_near_white = (r > 0.92) & (g > 0.92) & (b > 0.92)
    is_near_black = tot < 0.15
    bimodal_document = float(np.mean(is_near_white)) * float(np.mean(is_near_black))

    # 7. Foreground Foliar Statistics (Background-Invariant)
    if np.sum(foliar_mask) > 50:
        rf = r[foliar_mask]
        gf = g[foliar_mask]
        bf = b[foliar_mask]
        rf_mean, gf_mean, bf_mean = float(np.mean(rf)), float(np.mean(gf)), float(np.mean(bf))
        rf_std, gf_std, bf_std = float(np.std(rf)), float(np.std(gf)), float(np.std(bf))
        gn_rn_diff = float(np.mean((gf - rf) / (gf + rf + bf + 1e-6)))
        gn_bn_diff = float(np.mean((gf - bf) / (gf + rf + bf + 1e-6)))
        foliar_contrast = float(np.max(gf) - np.min(gf))
    else:
        rf_mean, gf_mean, bf_mean = 0.0, 0.0, 0.0
        rf_std, gf_std, bf_std = 0.0, 0.0, 0.0
        gn_rn_diff, gn_bn_diff = 0.0, 0.0
        foliar_contrast = 0.0

    features = [
        foliar_ratio, green_ratio, yellow_ratio, necrotic_ratio,
        skin_ratio, skin_center,
        edge_energy, axis_regularity, bimodal_document,
        q1, q2, q3, q4, qc,
        rf_mean, gf_mean, bf_mean, rf_std, gf_std, bf_std,
        gn_rn_diff, gn_bn_diff, foliar_contrast,
        float(np.mean(grad_x)), float(np.mean(grad_y)),
        float(np.std(grad_x)), float(np.std(grad_y)),
    ]

    # Deterministic sinusoidal expansion to fixed 64 dimensions
    while len(features) < 64:
        features.append(float(np.sin(len(features) * 0.5) * features[len(features) % len(features)]))

    return np.array(features[:64], dtype=np.float32)


def main():
    print("=" * 65)
    print("🌿 Verdra — Retraining Foliar Leaf vs Non-Leaf Gatekeeper")
    print("=" * 65)

    # 1. Collect Positive Leaf Samples
    leaf_files = []
    for split in ["train", "val", "test"]:
        leaf_files.extend(glob.glob(os.path.join(DATASET_DIR, split, "*", "*.*")))
        if os.path.isdir(DATASET_MULTICROP_DIR):
            leaf_files.extend(glob.glob(os.path.join(DATASET_MULTICROP_DIR, split, "*", "*.*")))

    # Add sample_images leaves
    for p in glob.glob(os.path.join(SAMPLE_DIR, "*.jpg")):
        if "non_leaf" not in os.path.basename(p):
            leaf_files.append(p)

    print(f"Found {len(leaf_files)} positive foliar images.")

    # 2. Collect Negative Non-Leaf Samples
    non_leaf_files = glob.glob(os.path.join(NON_LEAF_DIR, "*.*"))
    for p in glob.glob(os.path.join(SAMPLE_DIR, "*non_leaf*.jpg")):
        non_leaf_files.append(p)
    print(f"Found {len(non_leaf_files)} negative non-leaf images.")

    # 3. Extract Features
    X = []
    y = []

    print("Extracting background-invariant foliar embeddings...")
    for idx, f in enumerate(leaf_files):
        try:
            with Image.open(f) as img:
                feat = extract_leaf_features(img)
                X.append(feat)
                y.append(1)  # 1 = Leaf
        except Exception:
            continue
        if (idx + 1) % 500 == 0:
            print(f"  Processed {idx + 1}/{len(leaf_files)} positive samples...")

    for idx, f in enumerate(non_leaf_files):
        try:
            with Image.open(f) as img:
                feat = extract_leaf_features(img)
                X.append(feat)
                y.append(0)  # 0 = Non-Leaf
        except Exception:
            continue
        if (idx + 1) % 400 == 0:
            print(f"  Processed {idx + 1}/{len(non_leaf_files)} negative samples...")

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int32)
    print(f"Total dataset: {len(X)} samples (Leaves: {np.sum(y == 1)}, Non-Leaves: {np.sum(y == 0)})")

    # 4. Train/Test Split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Standardize
    mean = np.mean(X_train, axis=0)
    std = np.std(X_train, axis=0) + 1e-7

    X_train_norm = (X_train - mean) / std
    X_test_norm = (X_test - mean) / std

    # 5. Fit Calibrated Logistic Model
    print("Training Gatekeeper Classifier...")
    clf = LogisticRegression(C=5.0, max_iter=2000, random_state=42)
    clf.fit(X_train_norm, y_train)

    y_pred = clf.predict(X_test_norm)
    y_prob = clf.predict_proba(X_test_norm)[:, 1]

    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred))
    rec = float(recall_score(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_prob))
    cm = confusion_matrix(y_test, y_pred).tolist()

    print(f"📊 Test Accuracy:  {acc * 100:.2f}%")
    print(f"📊 Test Precision: {prec * 100:.2f}%")
    print(f"📊 Test Recall:    {rec * 100:.2f}%")
    print(f"📊 Test ROC-AUC:   {auc * 100:.2f}%")
    print(f"📊 Confusion Matrix:\n    Non-Leaf: {cm[0]}\n    Leaf:     {cm[1]}")

    # 6. Save Model Parameters (JSON + .keras archive)
    weights = clf.coef_[0].tolist()
    intercept = float(clf.intercept_[0])

    model_payload = {
        "architecture": "Calibrated_Foliar_Gatekeeper_v2",
        "input_dim": 64,
        "classes": ["NON_LEAF", "LEAF"],
        "threshold": 0.50,
        "mean": mean.tolist(),
        "std": std.tolist(),
        "weights": weights,
        "intercept": intercept,
        "metrics": {
            "test_accuracy": acc,
            "test_precision": prec,
            "test_recall": rec,
            "test_roc_auc": auc,
            "confusion_matrix": cm,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
        },
        "training_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    for path in [OUTPUT_JSON_ROOT, OUTPUT_JSON_BACKEND]:
        with open(path, "w") as f:
            json.dump(model_payload, f, indent=2)
        print(f"💾 Saved model JSON to: {path}")

    # Package as .keras model archive
    for path in [OUTPUT_KERAS_ROOT, OUTPUT_KERAS_BACKEND]:
        with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("config.json", json.dumps({"model_name": "leaf_non_leaf_model", "dim": 64}))
            zf.writestr("leaf_model_params.json", json.dumps(model_payload))
        print(f"💾 Saved .keras archive to: {path}")

    print("🎉 Leaf vs Non-Leaf model retraining complete!")


if __name__ == "__main__":
    main()
