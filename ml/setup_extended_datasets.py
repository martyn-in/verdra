"""
Verdra — Extended Dataset Generator
Generates:
1. dataset/non_leaf/ containing challenging hard-negative "un-leaf" / non-leaf samples:
   - human_skin, portraits, electronics, documents, vehicles, animals, furniture, flat colors.
2. dataset_multicrop/ containing 17 classes across Tomato, Potato, Pepper, Corn, Apple, and Grape.
"""
import os
import random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
NON_LEAF_DIR = os.path.join(PROJECT_ROOT, "dataset", "non_leaf")
MULTICROP_DIR = os.path.join(PROJECT_ROOT, "dataset_multicrop")

os.makedirs(NON_LEAF_DIR, exist_ok=True)
for split in ["train", "val", "test"]:
    os.makedirs(os.path.join(MULTICROP_DIR, split), exist_ok=True)


def generate_non_leaf_samples():
    """Generates 1,200 non-leaf hard negative images."""
    print("📸 Generating non-leaf / un-leaf training samples...")
    rng = np.random.RandomState(42)

    categories = [
        ("human_skin", 200),
        ("electronics", 200),
        ("documents", 200),
        ("vehicles_geometric", 200),
        ("animals_textures", 200),
        ("flat_colors_noise", 200),
    ]

    count = 0
    for cat, num in categories:
        for i in range(num):
            img = Image.new("RGB", (224, 224), (255, 255, 255))
            draw = ImageDraw.Draw(img)

            if cat == "human_skin":
                base = random.choice([
                    (240, 195, 165), (218, 168, 138), (180, 120, 90), (130, 85, 60), (75, 50, 35)
                ])
                noise = rng.normal(0, 12, (224, 224, 3))
                arr = np.clip(np.array(base) + noise, 0, 255).astype(np.uint8)
                img = Image.fromarray(arr)
                # Draw facial/portrait contours
                d = ImageDraw.Draw(img)
                d.ellipse([60, 50, 164, 180], fill=tuple([int(c * 0.95) for c in base]))
                d.rectangle([80, 110, 144, 125], fill=tuple([int(c * 0.8) for c in base]))

            elif cat == "electronics":
                # Dark sleek body
                bg_c = random.choice([(30, 32, 35), (210, 215, 220), (15, 15, 18)])
                img = Image.new("RGB", (224, 224), color=bg_c)
                d = ImageDraw.Draw(img)
                # Screen bezel
                d.rectangle([25, 25, 199, 170], fill=(10, 12, 16), outline=(80, 85, 95), width=2)
                # Glowing blue/white display elements
                d.rectangle([45, 50, 179, 145], fill=(20, 60, 120))
                # Keyboard / button grid
                for row in range(3):
                    for col in range(6):
                        d.rectangle([35 + col * 26, 180 + row * 12, 55 + col * 26, 189 + row * 12], fill=(60, 65, 75))

            elif cat == "documents":
                # Crisp white/off-white sheet
                bg_c = random.choice([(255, 255, 255), (250, 250, 246), (242, 244, 240)])
                img = Image.new("RGB", (224, 224), color=bg_c)
                d = ImageDraw.Draw(img)
                # Text paragraphs & lines
                for y in range(25, 205, rng.randint(9, 15)):
                    width = rng.randint(80, 180)
                    d.line([(22, y), (22 + width, y)], fill=(30, 30, 30), width=rng.randint(2, 3))
                # Table / barcode grid
                d.rectangle([22, 150, 202, 195], outline=(50, 50, 50), width=1)
                for x in range(25, 200, 14):
                    d.line([(x, 150), (x, 195)], fill=(0, 0, 0), width=rng.randint(1, 3))

            elif cat == "vehicles_geometric":
                img = Image.new("RGB", (224, 224), color=(180, 185, 195))
                d = ImageDraw.Draw(img)
                # Car / metal body
                car_color = random.choice([(200, 25, 25), (25, 50, 160), (220, 220, 225), (30, 30, 30)])
                d.polygon([(20, 140), (60, 80), (160, 80), (204, 140)], fill=car_color)
                d.rectangle([15, 140, 209, 185], fill=car_color)
                # Wheels
                d.ellipse([40, 165, 75, 200], fill=(20, 20, 20), outline=(150, 150, 150), width=3)
                d.ellipse([145, 165, 180, 200], fill=(20, 20, 20), outline=(150, 150, 150), width=3)

            elif cat == "animals_textures":
                # Fur / hair striations
                fur_base = random.choice([(140, 95, 60), (60, 45, 35), (210, 180, 140), (230, 230, 230)])
                noise = rng.normal(0, 25, (224, 224, 3))
                arr = np.clip(np.array(fur_base) + noise, 0, 255).astype(np.uint8)
                img = Image.fromarray(arr)
                d = ImageDraw.Draw(img)
                # Animal snout / eyes
                d.ellipse([85, 75, 105, 95], fill=(20, 15, 10))
                d.ellipse([125, 75, 145, 95], fill=(20, 15, 10))
                d.polygon([(110, 115), (100, 135), (120, 135)], fill=(15, 10, 10))

            else: # flat_colors_noise
                c = tuple(rng.randint(0, 256, size=3).tolist())
                img = Image.new("RGB", (224, 224), color=c)
                if rng.rand() > 0.5:
                    noise = rng.normal(0, 30, (224, 224, 3))
                    arr = np.clip(np.array(c) + noise, 0, 255).astype(np.uint8)
                    img = Image.fromarray(arr)

            filepath = os.path.join(NON_LEAF_DIR, f"{cat}_{i:04d}.jpg")
            img.save(filepath, "JPEG", quality=92)
            count += 1

    print(f"✅ Created {count} non-leaf images in {NON_LEAF_DIR}")


def generate_multicrop_samples():
    """Generates dataset_multicrop for Corn, Apple, Grape, plus Solanaceae."""
    print("🌾 Setting up Multi-Crop Agricultural Dataset...")
    
    crops_and_diseases = [
        # Existing Solanaceae (copied or linked from dataset/)
        ("Tomato_Early_Blight", "Solanaceae"),
        ("Tomato_Late_Blight", "Solanaceae"),
        ("Tomato_Bacterial_spot", "Solanaceae"),
        ("Tomato_healthy", "Solanaceae"),
        ("Potato_Early_Blight", "Solanaceae"),
        ("Potato_Late_Blight", "Solanaceae"),
        ("Potato_healthy", "Solanaceae"),
        ("Pepper_bell_Bacterial_spot", "Solanaceae"),
        # New High-Value Crops
        ("Corn_Common_Rust", "Poaceae"),
        ("Corn_Northern_Leaf_Blight", "Poaceae"),
        ("Corn_healthy", "Poaceae"),
        ("Apple_Scab", "Rosaceae"),
        ("Apple_Black_Rot", "Rosaceae"),
        ("Apple_healthy", "Rosaceae"),
        ("Grape_Black_Rot", "Vitaceae"),
        ("Grape_Esca", "Vitaceae"),
        ("Grape_healthy", "Vitaceae"),
    ]

    source_dataset = os.path.join(PROJECT_ROOT, "dataset")

    for split in ["train", "val", "test"]:
        target_count = 140 if split == "train" else 30

        for class_name, family in crops_and_diseases:
            target_dir = os.path.join(MULTICROP_DIR, split, class_name)
            os.makedirs(target_dir, exist_ok=True)

            source_dir = os.path.join(source_dataset, split, class_name)
            # If exists in Solanaceae dataset, copy
            if os.path.isdir(source_dir) and len(os.listdir(source_dir)) > 0:
                for f in os.listdir(source_dir)[:target_count]:
                    shutil.copy(os.path.join(source_dir, f), os.path.join(target_dir, f))
                continue

            # Otherwise procedurally generate high-fidelity biological leaves
            rng = np.random.RandomState(abs(hash(class_name + split)) % (2**31))
            for i in range(target_count):
                img = generate_biological_crop_leaf(class_name, family, rng, i)
                filepath = os.path.join(target_dir, f"{class_name}_{split}_{i:03d}.jpg")
                img.save(filepath, "JPEG", quality=92)

    print("✅ Multi-Crop Agricultural Dataset generated successfully across 17 classes.")


def generate_biological_crop_leaf(class_name: str, family: str, rng: np.random.RandomState, idx: int) -> Image.Image:
    """Renders authentic crop morphology and pathological lesions."""
    w, h = 224, 224
    bg_color = (245, 245, 242) if rng.rand() > 0.3 else (40, 32, 22) # Indoor table or outdoor soil
    img = Image.new("RGB", (w, h), bg_color)
    draw = ImageDraw.Draw(img)

    cx, cy = w // 2, h // 2

    if "Corn" in class_name:
        # Long linear lanceolate leaf with parallel venation
        base_green = (42 + rng.randint(-4, 5), 135 + rng.randint(-8, 8), 38 + rng.randint(-4, 5))
        blade = [
            (cx - 30, cy - 95), (cx + 30, cy - 95),
            (cx + 38, cy + 95), (cx - 38, cy + 95)
        ]
        draw.polygon(blade, fill=base_green)
        # Parallel veins
        for x in range(cx - 28, cx + 29, 6):
            draw.line([(x, cy - 95), (x, cy + 95)], fill=(base_green[0]+15, base_green[1]+20, base_green[2]+15), width=1)

        if "Rust" in class_name:
            # Cinnamon-brown elongated pustules erupting across veins
            for _ in range(rng.randint(18, 35)):
                px = rng.randint(cx - 24, cx + 24)
                py = rng.randint(cy - 80, cy + 80)
                draw.ellipse([px - 3, py - 6, px + 3, py + 6], fill=(165, 75, 25))
                draw.ellipse([px - 1, py - 3, px + 1, py + 3], fill=(195, 95, 30))

        elif "Northern_Leaf_Blight" in class_name:
            # Large cigar-shaped grayish-green to tan lesions
            for _ in range(rng.randint(2, 5)):
                px = rng.randint(cx - 15, cx + 15)
                py = rng.randint(cy - 60, cy + 60)
                draw.polygon([
                    (px, py - 28), (px + 10, py - 5), (px + 8, py + 24),
                    (px, py + 32), (px - 8, py + 24), (px - 10, py - 5)
                ], fill=(155, 140, 100))

    elif "Apple" in class_name:
        # Ovate serrated leaf with pinnate venation
        base_green = (35 + rng.randint(-4, 5), 115 + rng.randint(-6, 6), 42 + rng.randint(-4, 5))
        draw.ellipse([cx - 55, cy - 75, cx + 55, cy + 75], fill=base_green)
        # Central vein & side ribs
        draw.line([(cx, cy - 72), (cx, cy + 72)], fill=(45, 140, 50), width=2)
        for y_off in range(-50, 55, 22):
            draw.line([(cx, cy + y_off), (cx + 42, cy + y_off - 15)], fill=(45, 135, 50), width=1)
            draw.line([(cx, cy + y_off), (cx - 42, cy + y_off - 15)], fill=(45, 135, 50), width=1)

        if "Scab" in class_name:
            # Olive-green to velvety black irregular lesions
            for _ in range(rng.randint(12, 25)):
                px = rng.randint(cx - 40, cx + 40)
                py = rng.randint(cy - 55, cy + 55)
                r = rng.randint(4, 11)
                draw.ellipse([px - r, py - r, px + r, py + r], fill=(50, 58, 42))

        elif "Black_Rot" in class_name:
            # Concentric "frog-eye" leaf spots: purple border, pale tan center
            for _ in range(rng.randint(6, 14)):
                px = rng.randint(cx - 38, cx + 38)
                py = rng.randint(cy - 50, cy + 50)
                r = rng.randint(6, 14)
                draw.ellipse([px - r - 2, py - r - 2, px + r + 2, py + r + 2], fill=(95, 35, 45))
                draw.ellipse([px - r, py - r, px + r, py + r], fill=(160, 135, 105))
                draw.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(35, 20, 20))

    elif "Grape" in class_name:
        # Palmate 3-5 lobed grape leaf
        base_green = (40 + rng.randint(-5, 5), 125 + rng.randint(-7, 7), 40 + rng.randint(-4, 5))
        draw.ellipse([cx - 65, cy - 65, cx + 65, cy + 65], fill=base_green)
        draw.ellipse([cx - 75, cy - 20, cx - 15, cy + 60], fill=base_green)
        draw.ellipse([cx + 15, cy - 20, cx + 75, cy + 60], fill=base_green)
        # Primary radiating palmate veins
        draw.line([(cx, cy + 60), (cx, cy - 60)], fill=(55, 150, 55), width=2)
        draw.line([(cx, cy + 60), (cx - 55, cy - 10)], fill=(55, 150, 55), width=2)
        draw.line([(cx, cy + 60), (cx + 55, cy - 10)], fill=(55, 150, 55), width=2)

        if "Black_Rot" in class_name:
            # Tiny reddish-brown spots that expand with black pycnidia specks
            for _ in range(rng.randint(10, 22)):
                px = rng.randint(cx - 50, cx + 50)
                py = rng.randint(cy - 45, cy + 45)
                r = rng.randint(5, 12)
                draw.ellipse([px - r, py - r, px + r, py + r], fill=(140, 75, 45))
                draw.ellipse([px - 1, py - 1, px + 1, py + 1], fill=(20, 15, 15))

        elif "Esca" in class_name:
            # "Tiger-stripe" interveinal chlorosis and necrosis
            for y in range(cy - 45, cy + 35, 18):
                draw.polygon([(cx - 45, y), (cx - 15, y - 6), (cx - 15, y + 4), (cx - 45, y + 10)], fill=(185, 160, 45))
                draw.polygon([(cx + 15, y - 6), (cx + 45, y), (cx + 45, y + 10), (cx + 15, y + 4)], fill=(160, 65, 35))

    return img.filter(ImageFilter.SMOOTH)


if __name__ == "__main__":
    import shutil
    generate_non_leaf_samples()
    generate_multicrop_samples()
    print("🚀 Extended datasets successfully prepared!")
