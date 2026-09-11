import os
import sys
import numpy as np
from PIL import Image, ImageDraw
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "ml"))
from train_model import load_dataset, extract_features

# 1. Load real positive leaf samples
X_leaf_train, _ = load_dataset("train", augment=False)
X_leaf_test, _ = load_dataset("test", augment=False)

# 2. Synthesize diverse realistic non-leaf samples (man-made, text, skin, natural non-leaf, objects)
neg_samples = []
rng = np.random.RandomState(42)

def make_sample(draw_fn):
    img = Image.new("RGB", (224, 224), color=(255, 255, 255))
    draw_fn(img)
    return extract_features(img)

import random

# Non-leaf generators:
# A. Solid and gradient colors (all hues: green wall, red, blue, yellow, white, black, grey)
for _ in range(150):
    c = tuple(rng.randint(0, 256, size=3).tolist())
    img = Image.new("RGB", (224, 224), color=c)
    neg_samples.append(extract_features(img))

# B. Documents / Text / UI / Diagrams
for _ in range(150):
    bg = random.choice([(255, 255, 255), (240, 240, 240), (20, 20, 25)])
    fg = (0, 0, 0) if bg[0] > 100 else (255, 255, 255)
    img = Image.new("RGB", (224, 224), color=bg)
    draw = ImageDraw.Draw(img)
    for _ in range(rng.randint(5, 20)):
        y = rng.randint(10, 210)
        draw.line([(rng.randint(10, 50), y), (rng.randint(150, 210), y)], fill=fg, width=rng.randint(1, 4))
    neg_samples.append(extract_features(img))

# C. Man-made geometric shapes (cars, buildings, furniture, screens, boxes)
for _ in range(200):
    img = Image.new("RGB", (224, 224), color=tuple(rng.randint(50, 200, size=3).tolist()))
    draw = ImageDraw.Draw(img)
    for _ in range(rng.randint(3, 10)):
        bbox = [rng.randint(0, 150), rng.randint(0, 150), rng.randint(150, 224), rng.randint(150, 224)]
        draw.rectangle(bbox, outline=tuple(rng.randint(0, 256, size=3).tolist()), fill=tuple(rng.randint(0, 256, size=3).tolist()))
    neg_samples.append(extract_features(img))

# D. Skin tones / Human portraits / clothing
for _ in range(150):
    skin_base = random.choice([
        (230, 190, 160), (210, 160, 130), (170, 110, 80), (120, 75, 50), (70, 45, 30)
    ])
    noise = rng.normal(0, 8, (224, 224, 3))
    arr = np.clip(np.array(skin_base) + noise, 0, 255).astype(np.uint8)
    img = Image.fromarray(arr)
    neg_samples.append(extract_features(img))

# E. Skies, water, roads, landscape non-foliage
for _ in range(150):
    arr = np.zeros((224, 224, 3), dtype=np.uint8)
    top_c = random.choice([(60, 120, 210), (135, 206, 235), (20, 30, 60)])
    bot_c = random.choice([(180, 210, 240), (240, 240, 250), (80, 80, 80)])
    for y in range(224):
        alpha = y / 224.0
        arr[y, :, :] = [int(top_c[i] * (1 - alpha) + bot_c[i] * alpha) for i in range(3)]
    img = Image.fromarray(arr)
    neg_samples.append(extract_features(img))

# F. Indoor textures (wood, marble, carpet, tile grid)
for _ in range(150):
    img = Image.new("RGB", (224, 224), color=(180, 140, 100))
    draw = ImageDraw.Draw(img)
    # Grid tile
    step = rng.randint(20, 60)
    for x in range(0, 224, step):
        draw.line([(x, 0), (x, 224)], fill=(120, 90, 60), width=2)
    for y in range(0, 224, step):
        draw.line([(0, y), (224, y)], fill=(120, 90, 60), width=2)
    neg_samples.append(extract_features(img))

X_neg = np.array(neg_samples, dtype=np.float32)
print(f"Positive leaf samples (train): {len(X_leaf_train)}")
print(f"Positive leaf samples (test):  {len(X_leaf_test)}")
print(f"Negative non-leaf samples:     {len(X_neg)}")

# Train/test split for negatives
np.random.seed(42)
perm = np.random.permutation(len(X_neg))
n_train_neg = int(len(X_neg) * 0.75)
X_neg_train = X_neg[perm[:n_train_neg]]
X_neg_test = X_neg[perm[n_train_neg:]]

# Combine
X_tr = np.vstack([X_leaf_train, X_neg_train])
y_tr = np.concatenate([np.ones(len(X_leaf_train)), np.zeros(len(X_neg_train))])

X_te = np.vstack([X_leaf_test, X_neg_test])
y_te = np.concatenate([np.ones(len(X_leaf_test)), np.zeros(len(X_neg_test))])

# Train Logistic Regression Leaf Detector
clf = LogisticRegression(C=10.0, max_iter=1000, random_state=42)
clf.fit(X_tr, y_tr)

probs_te = clf.predict_proba(X_te)[:, 1]
preds_te = (probs_te >= 0.5).astype(int)

print("\n--- Test Set Evaluation ---")
print(classification_report(y_te, preds_te, target_names=["Non-Leaf", "Leaf"], digits=4))

# Check leaf test probabilities
leaf_test_probs = clf.predict_proba(X_leaf_test)[:, 1]
print(f"Leaf test prob min:  {np.min(leaf_test_probs):.4f}")
print(f"Leaf test prob mean: {np.mean(leaf_test_probs):.4f}")

# Check non-leaf test probabilities
neg_test_probs = clf.predict_proba(X_neg_test)[:, 1]
print(f"Non-leaf test prob max:  {np.max(neg_test_probs):.4f}")
print(f"Non-leaf test prob mean: {np.mean(neg_test_probs):.4f}")
