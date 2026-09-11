import os
import sys
import numpy as np
from PIL import Image

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(PROJECT_ROOT, "ml"))
from train_model import load_dataset, extract_features

X_train, y_train = load_dataset("train", augment=False)
X_test, y_test = load_dataset("test", augment=False)

print(f"Leaf train shape: {X_train.shape}")
print(f"Leaf test shape: {X_test.shape}")

# Compute class centroids and overall leaf centroid
centroids = []
for c in range(8):
    centroids.append(np.mean(X_train[y_train == c], axis=0))
centroids = np.array(centroids)  # (8, 256)
# Normalize centroids
centroids = centroids / (np.linalg.norm(centroids, axis=1, keepdims=True) + 1e-7)

# Leaf test set similarities
test_sims = np.max(np.dot(X_test, centroids.T), axis=1)
print(f"Test Leaf Similarity: min={np.min(test_sims):.4f}, mean={np.mean(test_sims):.4f}, 5th percentile={np.percentile(test_sims, 5):.4f}")

# Create non-leaf test images:
# 1. White text / document
img_doc = Image.new("RGB", (224, 224), color=(240, 240, 240))
arr_doc = np.array(img_doc)
arr_doc[40:50, 20:200] = 0
arr_doc[80:90, 20:200] = 0
arr_doc[120:130, 20:200] = 0
img_doc = Image.fromarray(arr_doc)

# 2. Human skin portrait
img_skin = Image.new("RGB", (224, 224), color=(210, 160, 130))

# 3. Blue sky / ocean
img_blue = Image.new("RGB", (224, 224), color=(70, 130, 200))

# 4. Red car / metal
img_car = Image.new("RGB", (224, 224), color=(180, 20, 20))

# 5. Dark indoor room / keyboard
img_room = Image.new("RGB", (224, 224), color=(30, 35, 40))

# 6. Green wall (to test that green alone does not pass)
img_green_wall = Image.new("RGB", (224, 224), color=(50, 160, 60))

non_leaf_imgs = {
    "Document/Text": img_doc,
    "Skin/Portrait": img_skin,
    "Blue Sky/Ocean": img_blue,
    "Red Car": img_car,
    "Dark Room/Tech": img_room,
    "Flat Green Wall": img_green_wall,
}

print("\n--- Non-Leaf Tests ---")
for name, img in non_leaf_imgs.items():
    feat = extract_features(img)
    sim = np.max(np.dot(centroids, feat))
    print(f"{name}: similarity={sim:.4f}")
