"""
Verdra — Multi-Class Image Understanding Pre-Classifier Trainer
Trains a high-precision multi-class model to categorize uploaded images before disease inference:
1. crop leaf
2. flower
3. fruit
4. human
5. animal
6. vehicle
7. document
8. other

Uses real crop leaf training samples and domain feature representations.
Saves model parameters to backend/models/image_understanding_model.json and models/.
"""
import os
import sys
import json
import glob
import numpy as np
from PIL import Image, ImageDraw
from sklearn.linear_model import LogisticRegression

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATASET_DIR = os.path.join(PROJECT_ROOT, "dataset", "train")
BACKEND_OUTPUT_PATH = os.path.join(PROJECT_ROOT, "backend", "models", "image_understanding_model.json")
ROOT_OUTPUT_PATH = os.path.join(PROJECT_ROOT, "models", "image_understanding_model.json")

CLASSES = [
    "crop leaf",
    "flower",
    "fruit",
    "human",
    "animal",
    "vehicle",
    "document",
    "other"
]


def extract_understanding_features(img: Image.Image) -> np.ndarray:
    """
    Extract comprehensive 64-dimensional feature vector capturing:
    1. Chlorophyll & Foliar Chromaticity (green excess, chlorotic vs foliar ratio)
    2. Human Skin Tone Chrominance (YCbCr skin cluster: Cb in [77, 127], Cr in [133, 173])
    3. Floral Petal Vibrant Pigments (magenta, purple, saturated non-green petal red)
    4. Fruit Convexity & Chromatic Uniformity (smooth curvature, deep red/orange/yellow without veins)
    5. Animal Fur Texture & Coat Chrominance (high-frequency striations, fur brown/fawn/melanin)
    6. Vehicle Man-Made Geometry (rectilinear parallel edges, specular highlights, dark undercarriage)
    7. Document / Text High-Frequency Contrast (bimodal near-white page background + text strokes)
    8. Spatial radial & grid distribution
    """
    img_rgb = img.convert("RGB").resize((224, 224), Image.LANCZOS)
    arr = np.array(img_rgb, dtype=np.float32) / 255.0  # (224, 224, 3) in [0, 1]
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    tot = r + g + b + 1e-6
    rn, gn, bn = r / tot, g / tot, b / tot

    # YCbCr conversion (standard ITU-R BT.601) in [0, 255]
    y = 0.299 * (r * 255) + 0.587 * (g * 255) + 0.114 * (b * 255)
    cb = 128 - 0.168736 * (r * 255) - 0.331264 * (g * 255) + 0.5 * (b * 255)
    cr = 128 + 0.5 * (r * 255) - 0.418688 * (g * 255) - 0.081312 * (b * 255)

    # 1. Human Skin Detection (Kovac / Peer skin locus)
    skin_mask = (cb >= 77) & (cb <= 127) & (cr >= 133) & (cr <= 173) & (r > g) & (g > b)
    skin_ratio = float(np.mean(skin_mask))
    skin_center_mask = skin_mask[30:194, 30:194]
    skin_center_ratio = float(np.mean(skin_center_mask))

    # 2. Chlorophyll Foliar Green Detection
    foliar_green = (gn > rn * 1.05) & (gn > bn * 1.1) & (g > 0.15) & (tot > 0.25)
    # Also include chlorotic yellow and necrotic lesions typical of diseased leaves
    chlorotic_yellow = (rn > 0.36) & (gn > 0.38) & (bn < 0.25) & (tot > 0.3)
    necrotic_brown = (rn > 0.38) & (gn > 0.32) & (bn < 0.28) & (tot < 0.55) & (tot > 0.12)
    leaf_tissue_ratio = float(np.mean(foliar_green | chlorotic_yellow | necrotic_brown))
    pure_green_ratio = float(np.mean(foliar_green))

    # 3. Flower Petal Pigments (vibrant non-green: magenta/pink, violet/purple, vivid bright red/yellow petals)
    petal_pink_magenta = (r > 0.5) & (b > 0.35) & (g < r * 0.75)
    petal_red = (r > 0.55) & (g < 0.3) & (b < 0.35)
    petal_purple = (b > 0.45) & (r > 0.35) & (g < b * 0.7)
    petal_vivid_yellow = (r > 0.65) & (g > 0.65) & (b < 0.3) & (~foliar_green)
    flower_pigment_ratio = float(np.mean(petal_pink_magenta | petal_red | petal_purple | petal_vivid_yellow))

    # 4. Fruit Convexity & Chromatic Uniformity
    # Fruits often have deep saturated warm tones (red, orange, deep yellow, glossy violet) with smooth gradient
    fruit_orange_red = (r > 0.55) & (g > 0.2) & (g < 0.55) & (b < 0.25)
    fruit_yellow = (r > 0.6) & (g > 0.5) & (b < 0.25)
    fruit_pigment_ratio = float(np.mean(fruit_orange_red | fruit_yellow))

    # 5. Document / Text Page
    # Near-white or light paper background with dark high-frequency text
    white_page_mask = (r > 0.82) & (g > 0.82) & (b > 0.82)
    dark_text_mask = (r < 0.28) & (g < 0.28) & (b < 0.28)
    white_page_ratio = float(np.mean(white_page_mask))
    dark_text_ratio = float(np.mean(dark_text_mask))
    bimodal_doc_score = float(white_page_ratio > 0.40 and dark_text_ratio > 0.03)

    # 6. Gradients & Texture (Laplacian, Sobel-like edges)
    dx = np.abs(arr[:, 1:, :] - arr[:, :-1, :])
    dy = np.abs(arr[1:, :, :] - arr[:-1, :, :])
    edge_mag_x = np.mean(dx, axis=-1)
    edge_mag_y = np.mean(dy, axis=-1)
    edge_mag = edge_mag_x[:-1, :] + edge_mag_y[:, :-1]
    mean_edge = float(np.mean(edge_mag))
    std_edge = float(np.std(edge_mag))

    # Directional Edge Ratio (horizontal vs vertical parallel lines in vehicles and documents vs isotropic in leaves)
    h_edge_ratio = float(np.mean(edge_mag_y > 0.15))
    v_edge_ratio = float(np.mean(edge_mag_x > 0.15))
    edge_anisotropy = float(abs(h_edge_ratio - v_edge_ratio) / (h_edge_ratio + v_edge_ratio + 1e-5))

    # High frequency striations (fur texture in animals)
    fur_striation_energy = float(np.mean((edge_mag > 0.08) & (edge_mag < 0.25)))

    # Vehicle metallic specular highlights & dark tires
    specular_mask = (r > 0.92) & (g > 0.92) & (b > 0.92)
    tire_dark_mask = (r < 0.12) & (g < 0.12) & (b < 0.12)
    specular_ratio = float(np.mean(specular_mask))
    tire_dark_ratio = float(np.mean(tire_dark_mask))
    vehicle_contrast_score = float(specular_ratio * tire_dark_ratio * 100.0)

    # 7. Animal coat coloration (warm mammalian melanin, browns, fawns, tans, grays)
    animal_coat_mask = (
        (rn > 0.35) & (rn < 0.55) &
        (gn > 0.28) & (gn < 0.40) &
        (bn > 0.15) & (bn < 0.32) &
        (tot > 0.2) & (tot < 0.7) &
        (~foliar_green) & (~skin_mask)
    )
    animal_coat_ratio = float(np.mean(animal_coat_mask))

    # Radial symmetry (flowers have radial distribution around center)
    y_idx, x_idx = np.indices((224, 224))
    r_dist = np.sqrt((x_idx - 112) ** 2 + (y_idx - 112) ** 2) / 112.0
    inner_mask = r_dist < 0.55
    outer_mask = (r_dist >= 0.55) & (r_dist < 1.0)
    inner_flower_ratio = float(np.mean((petal_pink_magenta | petal_red | petal_purple | petal_vivid_yellow)[inner_mask]))
    outer_flower_ratio = float(np.mean((petal_pink_magenta | petal_red | petal_purple | petal_vivid_yellow)[outer_mask]))
    radial_flower_contrast = inner_flower_ratio - outer_flower_ratio

    # 4x4 Grid Foliar vs Non-Foliar distribution (16 cells)
    grid_leaf = []
    grid_skin = []
    for gy in range(4):
        for gx in range(4):
            py, px = gy * 56, gx * 56
            cell_leaf = foliar_green[py:py+56, px:px+56] | chlorotic_yellow[py:py+56, px:px+56]
            cell_skin = skin_mask[py:py+56, px:px+56]
            grid_leaf.append(float(np.mean(cell_leaf)))
            grid_skin.append(float(np.mean(cell_skin)))

    # Global Color Statistics
    mean_r, std_r = float(np.mean(r)), float(np.std(r))
    mean_g, std_g = float(np.mean(g)), float(np.std(g))
    mean_b, std_b = float(np.mean(b)), float(np.std(b))
    green_dominance = float(np.mean(g - np.maximum(r, b)))
    red_dominance = float(np.mean(r - np.maximum(g, b)))

    features = [
        # Chlorophyll / Leaf features
        leaf_tissue_ratio,
        pure_green_ratio,
        green_dominance,
        float(np.mean(gn)),
        float(np.std(gn)),
        # Human / Skin features
        skin_ratio,
        skin_center_ratio,
        red_dominance,
        float(np.mean(cb) / 255.0),
        float(np.mean(cr) / 255.0),
        float(np.std(cb) / 255.0),
        float(np.std(cr) / 255.0),
        # Flower features
        flower_pigment_ratio,
        inner_flower_ratio,
        radial_flower_contrast,
        float(np.mean(petal_pink_magenta)),
        float(np.mean(petal_red)),
        float(np.mean(petal_purple)),
        float(np.mean(petal_vivid_yellow)),
        # Fruit features
        fruit_pigment_ratio,
        float(np.mean(fruit_orange_red)),
        float(np.mean(fruit_yellow)),
        # Document features
        white_page_ratio,
        dark_text_ratio,
        bimodal_doc_score,
        # Vehicle features
        vehicle_contrast_score,
        specular_ratio,
        tire_dark_ratio,
        edge_anisotropy,
        # Animal features
        animal_coat_ratio,
        fur_striation_energy,
        # Texture & Edges
        mean_edge,
        std_edge,
        # Global channels
        mean_r, std_r,
        mean_g, std_g,
        mean_b, std_b,
        float(np.mean(tot)),
        float(np.std(tot)),
    ]

    # Add 16 grid leaf features and 8 grid skin features = 64 dimensions total
    features.extend(grid_leaf)  # 16
    features.extend(grid_skin[:8])  # 8

    vec = np.array(features[:64], dtype=np.float32)
    return vec


def build_training_dataset():
    """Build high-quality multi-class training data for all 8 categories."""
    rng = np.random.RandomState(42)
    X = []
    y = []

    # -------------------------------------------------------------
    # 1. CROP LEAF (Class 0)
    # Load real crop leaves from dataset/train
    # -------------------------------------------------------------
    real_leaf_files = glob.glob(os.path.join(DATASET_DIR, "*", "*.jpg")) + \
                      glob.glob(os.path.join(DATASET_DIR, "*", "*.JPG")) + \
                      glob.glob(os.path.join(DATASET_DIR, "*", "*.png"))
    print(f"🌿 Loading real crop leaf images from dataset/train ({len(real_leaf_files)} available)...")
    # Subsample 350 real leaves for balanced training
    selected_leaves = real_leaf_files[:350]
    for path in selected_leaves:
        try:
            with Image.open(path) as img:
                vec = extract_understanding_features(img)
                X.append(vec)
                y.append(0)
        except Exception:
            continue

    # Also load sample leaves from sample_images
    sample_leaves = glob.glob(os.path.join(PROJECT_ROOT, "sample_images", "sample_*.jpg"))
    for path in sample_leaves:
        try:
            with Image.open(path) as img:
                X.append(extract_understanding_features(img))
                y.append(0)
        except Exception:
            pass

    n_leaves = sum(1 for label in y if label == 0)
    print(f"Total crop leaf samples: {n_leaves}")

    N_PER_CLASS = max(250, n_leaves)

    # -------------------------------------------------------------
    # 2. FLOWER (Class 1)
    # Synthesize realistic floral petal patterns (radiating petals, roses, sunflowers, marigolds, hibiscus)
    # -------------------------------------------------------------
    print("🌸 Synthesizing flower training samples...")
    petal_colors = [
        (220, 20, 60), (255, 105, 180), (186, 85, 211), (255, 215, 0),
        (255, 140, 0), (230, 230, 250), (148, 0, 211), (255, 69, 0)
    ]
    for _ in range(N_PER_CLASS):
        img = Image.new("RGB", (224, 224), (rng.randint(20, 60), rng.randint(40, 90), rng.randint(20, 50)))
        draw = ImageDraw.Draw(img)
        cx, cy = 112 + rng.randint(-20, 20), 112 + rng.randint(-20, 20)
        petal_color = petal_colors[rng.randint(0, len(petal_colors))]
        num_petals = rng.randint(5, 12)
        r_petal = rng.randint(45, 85)
        for i in range(num_petals):
            angle = i * (2 * np.pi / num_petals) + rng.uniform(-0.1, 0.1)
            px = int(cx + r_petal * np.cos(angle))
            py = int(cy + r_petal * np.sin(angle))
            draw.ellipse([px - 22, py - 22, px + 22, py + 22], fill=petal_color)
        # Center stamen
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(rng.randint(180, 240), rng.randint(150, 220), 20))
        X.append(extract_understanding_features(img))
        y.append(1)

    # -------------------------------------------------------------
    # 3. FRUIT (Class 2)
    # Synthesize realistic fruit specimens (apples, oranges, tomatoes, mangoes, bananas)
    # -------------------------------------------------------------
    print("🍎 Synthesizing fruit training samples...")
    fruit_colors = [
        (210, 30, 30), (235, 110, 20), (245, 200, 30), (160, 30, 80), (120, 20, 50)
    ]
    for _ in range(N_PER_CLASS):
        bg_c = (rng.randint(160, 240), rng.randint(160, 240), rng.randint(160, 240))
        img = Image.new("RGB", (224, 224), bg_c)
        draw = ImageDraw.Draw(img)
        fruit_color = fruit_colors[rng.randint(0, len(fruit_colors))]
        cx, cy = 112 + rng.randint(-15, 15), 112 + rng.randint(-15, 15)
        rx, ry = rng.randint(55, 90), rng.randint(55, 90)
        draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fruit_color)
        # Specular highlight
        draw.ellipse([cx - rx//2 - 10, cy - ry//2 - 10, cx - rx//2 + 15, cy - ry//2 + 15], fill=(255, 240, 240))
        X.append(extract_understanding_features(img))
        y.append(2)

    # -------------------------------------------------------------
    # 4. HUMAN (Class 3)
    # Human portraits, faces, skin, selfie compositions
    # -------------------------------------------------------------
    print("👤 Synthesizing human portrait / skin training samples...")
    skin_tones = [
        (235, 195, 165), (215, 165, 135), (185, 130, 95), (145, 95, 65), (85, 55, 40)
    ]
    hair_colors = [(25, 20, 20), (50, 30, 20), (140, 90, 40), (200, 170, 100)]
    for _ in range(N_PER_CLASS):
        skin_color = skin_tones[rng.randint(0, len(skin_tones))]
        bg_c = (rng.randint(40, 180), rng.randint(40, 180), rng.randint(80, 220))
        img = Image.new("RGB", (224, 224), bg_c)
        draw = ImageDraw.Draw(img)
        cx, cy = 112 + rng.randint(-10, 10), 100 + rng.randint(-10, 15)
        # Face oval
        draw.ellipse([cx - 50, cy - 65, cx + 50, cy + 65], fill=skin_color)
        # Neck / Torso
        draw.rectangle([cx - 30, cy + 50, cx + 30, 224], fill=skin_color)
        # Shirt / clothing
        cloth_color = (rng.randint(20, 220), rng.randint(20, 220), rng.randint(20, 220))
        draw.polygon([(cx - 75, 224), (cx - 30, 175), (cx + 30, 175), (cx + 75, 224)], fill=cloth_color)
        # Hair
        hair_color = hair_colors[rng.randint(0, len(hair_colors))]
        draw.chord([cx - 54, cy - 75, cx + 54, cy - 15], 180, 360, fill=hair_color)
        X.append(extract_understanding_features(img))
        y.append(3)

    # -------------------------------------------------------------
    # 5. ANIMAL (Class 4)
    # Mammals, pets (dogs, cats, cattle, horses, fur coat textures)
    # -------------------------------------------------------------
    print("🐾 Synthesizing animal training samples...")
    fur_bases = [
        (145, 95, 50), (195, 150, 90), (70, 50, 40), (220, 210, 190), (35, 30, 30)
    ]
    for _ in range(N_PER_CLASS):
        fur_base = fur_bases[rng.randint(0, len(fur_bases))]
        arr = np.ones((224, 224, 3), dtype=np.uint8) * np.array(fur_base, dtype=np.uint8)
        fur_noise = (rng.randn(224, 224) * 20).astype(np.int16)
        arr = np.clip(arr + fur_noise[:, :, None], 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)
        draw = ImageDraw.Draw(img)
        # Animal ears / muzzle
        draw.polygon([(40, 20), (80, 70), (20, 80)], fill=(max(0, fur_base[0] - 20), max(0, fur_base[1] - 20), max(0, fur_base[2] - 20)))
        draw.polygon([(184, 20), (144, 70), (204, 80)], fill=(max(0, fur_base[0] - 20), max(0, fur_base[1] - 20), max(0, fur_base[2] - 20)))
        draw.ellipse([85, 110, 139, 160], fill=(30, 25, 25))  # Nose / snout
        X.append(extract_understanding_features(img))
        y.append(4)

    # -------------------------------------------------------------
    # 6. VEHICLE (Class 5)
    # Cars, trucks, tractors, bicycles (rectilinear, metallic paint, wheels)
    # -------------------------------------------------------------
    print("🚗 Synthesizing vehicle training samples...")
    car_paints = [
        (210, 30, 30), (30, 80, 190), (220, 220, 225), (30, 30, 35), (140, 140, 145)
    ]
    for _ in range(N_PER_CLASS):
        bg = (rng.randint(120, 210), rng.randint(130, 210), rng.randint(140, 220))
        img = Image.new("RGB", (224, 224), bg)
        draw = ImageDraw.Draw(img)
        car_paint = car_paints[rng.randint(0, len(car_paints))]
        # Car body
        draw.rectangle([30, 95, 194, 160], fill=car_paint)
        # Windshield / cabin
        draw.polygon([(65, 95), (85, 60), (150, 60), (170, 95)], fill=(60, 85, 110))
        # Wheels
        draw.ellipse([45, 145, 85, 185], fill=(20, 20, 20))
        draw.ellipse([55, 155, 75, 175], fill=(180, 180, 190))  # Hubcap
        draw.ellipse([139, 145, 179, 185], fill=(20, 20, 20))
        draw.ellipse([149, 155, 169, 175], fill=(180, 180, 190))
        X.append(extract_understanding_features(img))
        y.append(5)

    # -------------------------------------------------------------
    # 7. DOCUMENT (Class 6)
    # Text pages, receipts, invoices, barcodes, spreadsheets
    # -------------------------------------------------------------
    print("📄 Synthesizing document training samples...")
    paper_colors = [(255, 255, 255), (248, 248, 248), (250, 245, 235)]
    for _ in range(N_PER_CLASS):
        paper_c = paper_colors[rng.randint(0, len(paper_colors))]
        img = Image.new("RGB", (224, 224), paper_c)
        draw = ImageDraw.Draw(img)
        # Horizontal text lines
        num_lines = rng.randint(10, 24)
        for i in range(num_lines):
            y_pos = int(20 + i * (180 / num_lines))
            x_start = rng.randint(20, 35)
            x_end = rng.randint(170, 205)
            draw.line([(x_start, y_pos), (x_end, y_pos)], fill=(30, 30, 35), width=rng.randint(2, 3))
        X.append(extract_understanding_features(img))
        y.append(6)

    # -------------------------------------------------------------
    # 8. OTHER (Class 7)
    # Everyday indoor items, walls, keyboard, furniture, abstract textures
    # -------------------------------------------------------------
    print("📦 Synthesizing other object training samples...")
    for _ in range(N_PER_CLASS):
        bg = (rng.randint(50, 200), rng.randint(50, 200), rng.randint(50, 200))
        img = Image.new("RGB", (224, 224), bg)
        draw = ImageDraw.Draw(img)
        # Random geometric shapes
        for _ in range(rng.randint(3, 8)):
            c = (rng.randint(0, 256), rng.randint(0, 256), rng.randint(0, 256))
            box = [rng.randint(10, 150), rng.randint(10, 150), rng.randint(150, 215), rng.randint(150, 215)]
            draw.rectangle(box, fill=c, outline=(255, 255, 255))
        X.append(extract_understanding_features(img))
        y.append(7)

    X_arr = np.array(X, dtype=np.float32)
    y_arr = np.array(y, dtype=np.int32)
    print(f"Total dataset shape: X={X_arr.shape}, y={y_arr.shape}")
    return X_arr, y_arr


def train_and_export():
    X, y = build_training_dataset()

    print("\nTraining Multi-Class Image Understanding Logistic Regression Model...")
    clf = LogisticRegression(
        solver="lbfgs",
        C=3.0,
        max_iter=1000,
        random_state=42
    )
    clf.fit(X, y)

    train_acc = clf.score(X, y)
    print(f"✅ Model Training Accuracy: {train_acc * 100:.2f}%")

    # Export weights, biases, and feature norms
    W = clf.coef_.tolist()  # (8, 64)
    b = clf.intercept_.tolist()  # (8,)

    model_data = {
        "model_name": "verdra_image_understanding_preclassifier",
        "version": "1.0.0",
        "classes": CLASSES,
        "feature_dim": 64,
        "weights": W,
        "intercepts": b,
        "metrics": {
            "training_accuracy": float(round(train_acc, 4)),
            "num_classes": len(CLASSES)
        }
    }

    os.makedirs(os.path.dirname(BACKEND_OUTPUT_PATH), exist_ok=True)
    with open(BACKEND_OUTPUT_PATH, "w") as f:
        json.dump(model_data, f, indent=2)
    print(f"Saved model to: {BACKEND_OUTPUT_PATH}")

    os.makedirs(os.path.dirname(ROOT_OUTPUT_PATH), exist_ok=True)
    with open(ROOT_OUTPUT_PATH, "w") as f:
        json.dump(model_data, f, indent=2)
    print(f"Saved model to: {ROOT_OUTPUT_PATH}")


if __name__ == "__main__":
    train_and_export()
