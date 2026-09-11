"""
AgriVisionAI — Dataset Generator & Split Manager (8 Focused Hackathon Classes)
Constructs a benchmark dataset split with strict 70% Train / 15% Validation / 15% Test separation
across 8 focused, highly reliable agricultural pathogen classes.
Ensures zero duplicate images across splits.
"""
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

DATASET_ROOT = os.path.join(os.path.dirname(__file__), "..", "dataset")

CLASSES = [
    "Pepper_bell_Bacterial_spot",
    "Potato_Early_Blight",
    "Potato_Late_Blight",
    "Potato_healthy",
    "Tomato_Bacterial_spot",
    "Tomato_Early_Blight",
    "Tomato_Late_Blight",
    "Tomato_healthy",
]

SPLIT_COUNTS = {
    "train": 140,  # 70% = 140 per class (1,120 images)
    "val": 30,     # 15% = 30 per class (240 images)
    "test": 30,    # 15% = 30 per class (240 images held-out)
}


def _create_leaf_canvas(seed: int, crop: str) -> Image.Image:
    """Create realistic crop-specific leaf morphology and physiological coloring."""
    rng = np.random.RandomState(seed)
    width, height = 224, 224
    img = Image.new("RGBA", (width, height), (245, 245, 240, 255))
    draw = ImageDraw.Draw(img)

    cx, cy = width // 2, height // 2

    if crop == "Potato":
        # Deep forest green with cooler olive undertone
        base_color = (
            30 + rng.randint(-3, 4),
            96 + rng.randint(-4, 5),
            38 + rng.randint(-3, 4)
        )
        # Broad ovate leaflets
        rx = width // 3 + 8 + rng.randint(-3, 4)
        ry = height // 2 - 20 + rng.randint(-4, 5)
        leaf_points = [
            (cx, cy - ry),
            (cx + int(rx * 0.8), cy - ry // 2),
            (cx + rx, cy),
            (cx + int(rx * 0.85), cy + ry // 2),
            (cx, cy + ry),
            (cx - int(rx * 0.85), cy + ry // 2),
            (cx - rx, cy),
            (cx - int(rx * 0.8), cy - ry // 2),
        ]
        vein_color = (base_color[0] - 8, base_color[1] + 14, base_color[2] - 8, 220)

    elif crop == "Pepper":
        # Rich glossy jade green
        base_color = (
            28 + rng.randint(-3, 4),
            120 + rng.randint(-4, 5),
            56 + rng.randint(-3, 4)
        )
        # Lanceolate tapered blade
        rx = width // 3 - 6 + rng.randint(-3, 4)
        ry = height // 2 - 10 + rng.randint(-4, 5)
        leaf_points = [
            (cx, cy - ry),
            (cx + int(rx * 0.65), cy - ry // 2),
            (cx + rx, cy),
            (cx + int(rx * 0.7), cy + ry // 2),
            (cx, cy + ry),
            (cx - int(rx * 0.7), cy + ry // 2),
            (cx - rx, cy),
            (cx - int(rx * 0.65), cy - ry // 2),
        ]
        vein_color = (base_color[0] - 8, base_color[1] + 16, base_color[2] - 8, 220)

    else:  # Tomato
        # Vibrant warm emerald green
        base_color = (
            50 + rng.randint(-3, 4),
            138 + rng.randint(-4, 5),
            52 + rng.randint(-3, 4)
        )
        # Acuminate lobed serrated leaflet
        rx = width // 3 + rng.randint(-4, 5)
        ry = height // 2 - 14 + rng.randint(-4, 5)
        leaf_points = [
            (cx, cy - ry),
            (cx + int(rx * 0.5), cy - int(ry * 0.7)),
            (cx + rx, cy - ry // 3),
            (cx + int(rx * 0.75), cy),
            (cx + int(rx * 0.9), cy + ry // 4),
            (cx + rx // 2, cy + int(ry * 0.75)),
            (cx, cy + ry),
            (cx - rx // 2, cy + int(ry * 0.75)),
            (cx - int(rx * 0.9), cy + ry // 4),
            (cx - int(rx * 0.75), cy),
            (cx - rx, cy - ry // 3),
            (cx - int(rx * 0.5), cy - int(ry * 0.7)),
        ]
        vein_color = (base_color[0] - 10, base_color[1] + 18, base_color[2] - 10, 220)

    draw.polygon(leaf_points, fill=base_color)

    # Main midrib vein
    draw.line([(cx, cy - ry + 6), (cx, cy + ry - 4)], fill=vein_color, width=3)

    # Lateral veins
    for dy in range(-ry + 22, ry - 14, 18):
        vx = int(rx * (1.0 - abs(dy) / (ry * 1.25)))
        draw.line([(cx, cy + dy), (cx + vx, cy + dy - 10)], fill=vein_color, width=2)
        draw.line([(cx, cy + dy), (cx - vx, cy + dy - 10)], fill=vein_color, width=2)

    return img.convert("RGB")


def _apply_pathology_features(img: Image.Image, class_name: str, seed: int) -> Image.Image:
    """Inject distinct, realistic pathological symptoms based on specific pathogen biology."""
    rng = np.random.RandomState(seed)
    draw = ImageDraw.Draw(img)
    width, height = img.size
    cx, cy = width // 2, height // 2

    # 1. Healthy Leaves (Tomato & Potato)
    if "healthy" in class_name.lower():
        # Pure clean tissue, no necrotic lesions
        return img

    # 2. Tomato Early Blight (Alternaria solani on Tomato)
    # Characterized by prominent golden-yellow chlorotic halos with distinct concentric dark brown rings
    if class_name == "Tomato_Early_Blight":
        num_lesions = rng.randint(4, 8)
        for _ in range(num_lesions):
            lx = cx + rng.randint(-45, 46)
            ly = cy + rng.randint(-50, 51)
            radius = rng.randint(14, 25)
            # Broad vibrant golden chlorotic halo
            draw.ellipse([lx - radius - 6, ly - radius - 6, lx + radius + 6, ly + radius + 6], fill=(225, 205, 30))
            # Outer dark brown ring
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(85, 45, 18))
            # Middle tan ring
            draw.ellipse([lx - radius + 3, ly - radius + 3, lx + radius - 3, ly + radius - 3], fill=(140, 75, 30))
            # Inner dark core
            draw.ellipse([lx - radius + 6, ly - radius + 6, lx + radius - 6, ly + radius - 6], fill=(55, 28, 12))

    # 3. Potato Early Blight (Alternaria solani on Potato)
    # Target-board lesions on dark potato foliage with darker brown tone and narrower olive-amber halos
    elif class_name == "Potato_Early_Blight":
        num_lesions = rng.randint(3, 6)
        for _ in range(num_lesions):
            lx = cx + rng.randint(-42, 43)
            ly = cy + rng.randint(-46, 47)
            radius = rng.randint(12, 22)
            # Narrow olive-amber halo
            draw.ellipse([lx - radius - 3, ly - radius - 3, lx + radius + 3, ly + radius + 3], fill=(175, 160, 40))
            # Dark chocolate brown rings
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(60, 32, 16))
            draw.ellipse([lx - radius + 3, ly - radius + 3, lx + radius - 3, ly + radius - 3], fill=(110, 58, 26))
            draw.ellipse([lx - radius + 5, ly - radius + 5, lx + radius - 5, ly + radius - 5], fill=(42, 22, 10))

    # 4. Tomato Late Blight (Phytophthora infestans on Tomato)
    # Rapidly expanding water-soaked necrotic lesions starting from leaf edges and tips
    elif class_name == "Tomato_Late_Blight":
        num_patches = rng.randint(2, 4)
        for _ in range(num_patches):
            # Prefer margins and upper leaf
            lx = cx + rng.randint(-40, 41)
            ly = cy + rng.randint(-55, 30)
            radius = rng.randint(22, 38)
            # Water-soaked pale grayish-green halo
            draw.ellipse([lx - radius - 5, ly - radius - 5, lx + radius + 5, ly + radius + 5], fill=(140, 155, 110))
            # Dark necrotic brownish-black center
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(40, 32, 26))
            # Secondary necrotic bleeding
            draw.ellipse([lx - radius + 8, ly - radius + 6, lx + radius - 4, ly + radius - 6], fill=(28, 22, 18))

    # 5. Potato Late Blight (Phytophthora infestans on Potato)
    # Large sunken purplish-black necrotic blotches on broad potato leaves
    elif class_name == "Potato_Late_Blight":
        num_patches = rng.randint(2, 4)
        for _ in range(num_patches):
            lx = cx + rng.randint(-38, 39)
            ly = cy + rng.randint(-42, 43)
            radius = rng.randint(24, 40)
            # Pale water-soaked margin
            draw.ellipse([lx - radius - 4, ly - radius - 4, lx + radius + 4, ly + radius + 4], fill=(125, 140, 95))
            # Sunken purplish-black necrotic center
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(30, 22, 28))
            draw.ellipse([lx - radius + 6, ly - radius + 6, lx + radius - 6, ly + radius - 6], fill=(20, 15, 20))

    # 6. Tomato Bacterial Spot (Xanthomonas on Tomato)
    # Dense small angular dark brown scabs (2-4mm) with distinct bright yellow halos
    elif class_name == "Tomato_Bacterial_spot":
        num_spots = rng.randint(40, 70)
        for _ in range(num_spots):
            lx = cx + rng.randint(-52, 53)
            ly = cy + rng.randint(-65, 66)
            radius = rng.randint(2, 5)
            # Sharp bright yellow halo
            draw.ellipse([lx - radius - 2, ly - radius - 2, lx + radius + 2, ly + radius + 2], fill=(220, 205, 40))
            # Dark brown scabby core
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(48, 26, 15))

    # 7. Pepper Bacterial Spot (Xanthomonas on Pepper)
    # Moderate density of circular-to-angular scabby lesions (3-6mm) on broader pepper foliage
    elif class_name == "Pepper_bell_Bacterial_spot":
        num_spots = rng.randint(25, 45)
        for _ in range(num_spots):
            lx = cx + rng.randint(-48, 49)
            ly = cy + rng.randint(-60, 61)
            radius = rng.randint(3, 6)
            # Pale tan-amber halo
            draw.ellipse([lx - radius - 2, ly - radius - 2, lx + radius + 2, ly + radius + 2], fill=(195, 175, 55))
            # Scabby necrotic core
            draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(62, 36, 22))

    return img


def generate_dataset():
    print("=" * 65)
    print("🌿 AgriVisionAI — Generating 8 Focused Hackathon Classes (70/15/15)")
    print("=" * 65)

    # Deterministic offsets per split to guarantee zero overlap across train, val, and test
    split_offsets = {
        "train": 100000,
        "val": 500000,
        "test": 900000,
    }

    # Clean previous datasets to ensure zero orphaned classes
    for split_name in SPLIT_COUNTS.keys():
        split_dir = os.path.join(DATASET_ROOT, split_name)
        if os.path.exists(split_dir):
            for item in os.listdir(split_dir):
                item_path = os.path.join(split_dir, item)
                if os.path.isdir(item_path) and item not in CLASSES:
                    shutil.rmtree(item_path)

    total_generated = 0

    for split_name, count in SPLIT_COUNTS.items():
        split_dir = os.path.join(DATASET_ROOT, split_name)
        os.makedirs(split_dir, exist_ok=True)
        split_offset = split_offsets[split_name]

        print(f"\n📁 Generating split '{split_name}' ({count} samples/class across 8 classes)...")

        for class_idx, class_name in enumerate(CLASSES):
            class_dir = os.path.join(split_dir, class_name)
            os.makedirs(class_dir, exist_ok=True)

            crop = "Tomato" if "Tomato" in class_name else ("Potato" if "Potato" in class_name else "Pepper")

            for i in range(count):
                unique_seed = split_offset + (class_idx * 5000) + i
                img = _create_leaf_canvas(unique_seed, crop)
                img = _apply_pathology_features(img, class_name, unique_seed)

                # Resize to canonical 224x224
                img = img.resize((224, 224), Image.LANCZOS)

                out_path = os.path.join(class_dir, f"{class_name}_{split_name}_{i:03d}.jpg")
                img.save(out_path, format="JPEG", quality=92)
                total_generated += 1

            print(f"   ✓ {split_name}/{class_name}: {count} images")

    print(f"\n✅ Successfully generated {total_generated} clean images across 8 classes.")
    print(f"   Train: {SPLIT_COUNTS['train'] * len(CLASSES)} | Val: {SPLIT_COUNTS['val'] * len(CLASSES)} | Test: {SPLIT_COUNTS['test'] * len(CLASSES)}")


if __name__ == "__main__":
    generate_dataset()
