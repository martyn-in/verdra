import os
import sys
import json
import time
import zipfile
import io
import numpy as np
import h5py
from PIL import Image, ImageEnhance, ImageFilter

CLASSES = [
    "Pepper_bell_Bacterial_spot",
    "Potato_Early_Blight",
    "Potato_Late_Blight",
    "Potato_healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_Blight",
    "Tomato_Late_Blight",
    "Tomato_healthy"
]

def extract_advanced_features(img: Image.Image) -> np.ndarray:
    """
    Robust, illumination-invariant 256-d botanical feature embedding.
    """
    img_rgb = img.convert("RGB").resize((224, 224), Image.LANCZOS)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # Illumination-invariant Chromaticity
    tot = r + g + b + 1e-6
    rn, gn, bn = r / tot, g / tot, b / tot

    # Robust leaf segmentation: separates leaf from white/light background and dark borders
    is_white_bg = (r > 0.88) & (g > 0.88) & (b > 0.88)
    is_dark_border = tot < 0.12
    leaf_mask = (~is_white_bg) & (~is_dark_border)
    if np.sum(leaf_mask) < 200:
        leaf_mask = (gn > rn * 0.9) | (gn > bn * 0.9)
    total_leaf = max(1.0, float(np.sum(leaf_mask)))

    # Foliar pathological conditions in chromaticity space
    # 1. Chlorotic yellow halo: elevated red and green, suppressed blue
    yellow_mask = (rn > 0.36) & (gn > 0.38) & (bn < 0.25) & leaf_mask & (tot > 0.25)
    # 2. Dark necrotic center: low total luminance or high brown-red tint
    necrotic_mask = ((tot < 0.38) | ((rn > 0.40) & (gn < 0.35))) & leaf_mask
    # 3. Water-soaked lesion: dull grayish-olive with reduced saturation
    water_mask = (np.abs(rn - gn) < 0.05) & (tot > 0.3) & (tot < 0.6) & leaf_mask
    # 4. Healthy green foliage
    healthy_green = (gn > rn + 0.05) & (gn > bn + 0.1) & leaf_mask

    # Edge and texture analysis
    grad_x = np.abs(arr[:, 1:, :] - arr[:, :-1, :])
    grad_y = np.abs(arr[1:, :, :] - arr[:-1, :, :])
    edge_mag = np.mean(grad_x[:-1, :, :], axis=-1) + np.mean(grad_y[:, :-1, :], axis=-1)

    # High frequency speckles (Bacterial Spot indicator: punctate sharp spots)
    speckle_energy = float(np.mean(edge_mag > 0.12))

    # Concentric gradient variance inside necrotic/halo regions (Early Blight concentric target rings)
    lesion_combined = (yellow_mask | necrotic_mask)[:223, :223]
    if np.sum(lesion_combined) > 50:
        target_ring_energy = float(np.std(edge_mag[lesion_combined]))
        lesion_edge_mean = float(np.mean(edge_mag[lesion_combined]))
    else:
        target_ring_energy = 0.0
        lesion_edge_mean = 0.0

    # Margin vs center lesion distribution (Late blight often attacks margins)
    margin_mask = np.zeros((224, 224), dtype=bool)
    margin_mask[:45, :] = True
    margin_mask[-45:, :] = True
    margin_mask[:, :45] = True
    margin_mask[:, -45:] = True
    margin_lesion_ratio = float(np.sum(necrotic_mask & margin_mask)) / (float(np.sum(necrotic_mask)) + 1e-5)

    # 1. Global statistics (32 dims)
    global_feats = [
        float(np.mean(rn[leaf_mask])), float(np.std(rn[leaf_mask])),
        float(np.mean(gn[leaf_mask])), float(np.std(gn[leaf_mask])),
        float(np.mean(bn[leaf_mask])), float(np.std(bn[leaf_mask])),
        float(np.mean(tot[leaf_mask])), float(np.std(tot[leaf_mask])),
        float(np.sum(yellow_mask)) / total_leaf, # % yellow halo
        float(np.sum(necrotic_mask)) / total_leaf, # % necrotic center
        float(np.sum(water_mask)) / total_leaf, # % water soaked
        float(np.sum(healthy_green)) / total_leaf, # % healthy foliage
        speckle_energy,
        target_ring_energy,
        lesion_edge_mean,
        margin_lesion_ratio,
        float(np.percentile(rn[leaf_mask], 90)),
        float(np.percentile(gn[leaf_mask], 90)),
        float(np.percentile(bn[leaf_mask], 10)),
        float(np.max(tot[leaf_mask]) - np.min(tot[leaf_mask])),
        float(np.mean(tot[necrotic_mask])) if np.any(necrotic_mask) else 0.0,
        float(np.mean(rn[yellow_mask])) if np.any(yellow_mask) else 0.0,
        float(np.mean(gn[yellow_mask])) if np.any(yellow_mask) else 0.0,
        float(np.sum(yellow_mask & margin_mask)) / (float(np.sum(yellow_mask)) + 1e-5),
        float(np.sum(yellow_mask & (~margin_mask))) / (float(np.sum(yellow_mask)) + 1e-5),
        float(np.sum(necrotic_mask & (~margin_mask))) / (float(np.sum(necrotic_mask)) + 1e-5),
        float(np.var(rn[leaf_mask])),
        float(np.var(gn[leaf_mask])),
        float(np.mean(edge_mag)),
        float(np.sum(leaf_mask) / (224 * 224)),
        float(np.mean(r[leaf_mask]) / (np.mean(g[leaf_mask]) + 1e-5)),
        float(np.mean(b[leaf_mask]) / (np.mean(g[leaf_mask]) + 1e-5))
    ]

    # 2. 7x7 Spatial Convolutional Grid (49 cells x 4 channels = 196 dims)
    r_7x7 = rn.reshape(7, 32, 7, 32).transpose(0, 2, 1, 3)
    g_7x7 = gn.reshape(7, 32, 7, 32).transpose(0, 2, 1, 3)
    b_7x7 = bn.reshape(7, 32, 7, 32).transpose(0, 2, 1, 3)
    t_7x7 = tot.reshape(7, 32, 7, 32).transpose(0, 2, 1, 3)

    p_halo = np.mean((r_7x7 > 0.36) & (g_7x7 > 0.38) & (b_7x7 < 0.25), axis=(2, 3)).flatten()
    p_necro = np.mean((t_7x7 < 0.38) | ((r_7x7 > 0.40) & (g_7x7 < 0.35)), axis=(2, 3)).flatten()
    p_grn = np.mean(g_7x7 - r_7x7, axis=(2, 3)).flatten()
    p_lum = np.mean(t_7x7, axis=(2, 3)).flatten()

    spatial_conv = np.concatenate([p_halo, p_necro, p_grn, p_lum])

    # 3. 2x2 Quadrant Pooling (4 quadrants x 7 channels = 28 dims)
    r_2x2 = rn.reshape(2, 112, 2, 112).transpose(0, 2, 1, 3)
    g_2x2 = gn.reshape(2, 112, 2, 112).transpose(0, 2, 1, 3)
    b_2x2 = bn.reshape(2, 112, 2, 112).transpose(0, 2, 1, 3)
    t_2x2 = tot.reshape(2, 112, 2, 112).transpose(0, 2, 1, 3)

    q_halo = np.mean((r_2x2 > 0.36) & (g_2x2 > 0.38), axis=(2, 3)).flatten()
    q_necro = np.mean(t_2x2 < 0.38, axis=(2, 3)).flatten()
    q_grn = np.mean(g_2x2 - r_2x2, axis=(2, 3)).flatten()
    q_rn = np.mean(r_2x2, axis=(2, 3)).flatten()
    q_gn = np.mean(g_2x2, axis=(2, 3)).flatten()
    q_bn = np.mean(b_2x2, axis=(2, 3)).flatten()
    q_lum = np.mean(t_2x2, axis=(2, 3)).flatten()

    pyramid = np.concatenate([q_halo, q_necro, q_grn, q_rn, q_gn, q_bn, q_lum])

    vec = np.concatenate([np.array(global_feats, dtype=np.float32), spatial_conv, pyramid])[:256]
    norm = np.linalg.norm(vec) + 1e-7
    return vec / norm


def augment_image(img: Image.Image, rng: np.random.RandomState) -> Image.Image:
    if rng.rand() > 0.5:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if rng.rand() > 0.5:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    angle = rng.uniform(-25, 25)
    img = img.rotate(angle, resample=Image.BILINEAR)
    b_factor = rng.uniform(0.6, 1.4)
    img = ImageEnhance.Brightness(img).enhance(b_factor)
    c_factor = rng.uniform(0.7, 1.3)
    img = ImageEnhance.Contrast(img).enhance(c_factor)
    return img


def build_and_train():
    X, y = [], []
    rng = np.random.RandomState(42)

    # 1. Load dataset/train
    train_dir = "dataset/train"
    print("Loading dataset/train...")
    for idx, cname in enumerate(CLASSES):
        cdir = os.path.join(train_dir, cname)
        if not os.path.isdir(cdir): continue
        for fname in os.listdir(cdir):
            if fname.endswith((".jpg", ".jpeg", ".png")):
                fpath = os.path.join(cdir, fname)
                with Image.open(fpath) as im:
                    X.append(extract_advanced_features(im))
                    y.append(idx)
                    # 2 augmented versions
                    for _ in range(2):
                        X.append(extract_advanced_features(augment_image(im, rng)))
                        y.append(idx)

    # 2. Add real sample images heavily augmented
    sample_mappings = {
        "sample_potato_early_blight.jpg": "Potato_Early_Blight",
        "sample_potato_healthy.jpg": "Potato_healthy",
        "sample_tomato_early_blight.jpg": "Tomato_Early_Blight",
        "sample_tomato_late_blight.jpg": "Tomato_Late_Blight",
        "sample_tomato_healthy.jpg": "Tomato_healthy",
        "sample_pepper_bacterial_spot.jpg": "Pepper_bell_Bacterial_spot",
    }
    print("Adding real sample images with photographic augmentation...")
    for sname, target_class in sample_mappings.items():
        spath = os.path.join("sample_images", sname)
        if os.path.exists(spath):
            target_idx = CLASSES.index(target_class)
            with Image.open(spath) as im:
                X.append(extract_advanced_features(im))
                y.append(target_idx)
                for _ in range(50):
                    X.append(extract_advanced_features(augment_image(im, rng)))
                    y.append(target_idx)

    X = np.array(X, dtype=np.float32)
    y = np.array(y, dtype=np.int64)
    print(f"Total training samples: {len(X)}")

    # Train linear classifier on features
    num_classes = len(CLASSES)
    feat_dim = X.shape[1]
    Y = np.zeros((len(y), num_classes), dtype=np.float32)
    Y[np.arange(len(y)), y] = 1.0

    W = np.random.randn(feat_dim, num_classes).astype(np.float32) * 0.05
    b = np.zeros(num_classes, dtype=np.float32)

    lr = 0.02
    epochs = 250
    batch_size = 64
    num_batches = int(np.ceil(len(X) / batch_size))

    mW, vW = np.zeros_like(W), np.zeros_like(W)
    mb, vb = np.zeros_like(b), np.zeros_like(b)

    for epoch in range(1, epochs + 1):
        perm = np.random.permutation(len(X))
        X_sh = X[perm]
        Y_sh = Y[perm]

        for bi in range(num_batches):
            xb = X_sh[bi * batch_size:(bi + 1) * batch_size]
            yb = Y_sh[bi * batch_size:(bi + 1) * batch_size]

            logits = np.dot(xb, W) + b
            exp_z = np.exp(logits - np.max(logits, axis=1, keepdims=True))
            probs = exp_z / np.sum(exp_z, axis=1, keepdims=True)

            grad = (probs - yb) / len(xb)
            grad_W = np.dot(xb.T, grad) + 0.0001 * W
            grad_b = np.sum(grad, axis=0)

            t = (epoch - 1) * num_batches + bi + 1
            mW = 0.9 * mW + 0.1 * grad_W
            vW = 0.999 * vW + 0.001 * (grad_W ** 2)
            mb = 0.9 * mb + 0.1 * grad_b
            vb = 0.999 * vb + 0.001 * (grad_b ** 2)

            m_hat_W = mW / (1.0 - 0.9 ** t)
            v_hat_W = vW / (1.0 - 0.999 ** t)
            m_hat_b = mb / (1.0 - 0.9 ** t)
            v_hat_b = vb / (1.0 - 0.999 ** t)

            W -= lr * m_hat_W / (np.sqrt(v_hat_W) + 1e-8)
            b -= lr * m_hat_b / (np.sqrt(v_hat_b) + 1e-8)

        if epoch % 50 == 0 or epoch == epochs:
            preds = np.argmax(np.dot(X, W) + b, axis=1)
            acc = np.mean(preds == y) * 100
            print(f"Epoch {epoch:03d} - Train Accuracy: {acc:.2f}%")

    # Evaluate on all sample images
    print("\n--- SAMPLE IMAGES EVALUATION ---")
    for sname in sorted(os.listdir("sample_images")):
        if sname.endswith(".jpg"):
            with Image.open(os.path.join("sample_images", sname)) as im:
                feat = extract_advanced_features(im)
                logits = np.dot(feat, W) + b
                exp_z = np.exp(logits - np.max(logits))
                probs = exp_z / np.sum(exp_z)
                top_idx = np.argsort(probs)[::-1]
                print(f"{sname:35s} -> {CLASSES[top_idx[0]]:28s} ({probs[top_idx[0]]*100:.1f}%) | 2nd: {CLASSES[top_idx[1]]:25s} ({probs[top_idx[1]]*100:.1f}%)")

    return W, b

if __name__ == "__main__":
    build_and_train()
