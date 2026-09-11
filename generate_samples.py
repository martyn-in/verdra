"""
AgriVisionAI — Synthetic High-Quality Sample Leaf Image Generator
Generates realistic crop leaf images with distinct disease lesion patterns for testing and demonstration.
"""
import os
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def create_leaf_base(width=400, height=400, base_color=(46, 125, 50)):
    """Create a leaf shape with natural green gradient and vein structure."""
    img = Image.new("RGBA", (width, height), (245, 245, 240, 255))
    draw = ImageDraw.Draw(img)

    # Leaf boundary points (curved elliptical leaf)
    cx, cy = width // 2, height // 2
    rx, ry = width // 3, height // 2 - 20

    # Draw leaf body
    leaf_shape = [
        (cx, cy - ry),
        (cx + rx, cy - ry // 3),
        (cx + int(rx * 0.9), cy + ry // 4),
        (cx + rx // 2, cy + int(ry * 0.7)),
        (cx, cy + ry),
        (cx - rx // 2, cy + int(ry * 0.7)),
        (cx - int(rx * 0.9), cy + ry // 4),
        (cx - rx, cy - ry // 3),
    ]
    draw.polygon(leaf_shape, fill=base_color)

    # Main central vein
    draw.line([(cx, cy - ry + 15), (cx, cy + ry - 10)], fill=(76, 175, 80, 255), width=4)

    # Secondary lateral veins
    for y_offset in range(-ry + 50, ry - 30, 35):
        y_pos = cy + y_offset
        draw.line([(cx, y_pos), (cx + rx - 20, y_pos - 25)], fill=(67, 160, 71, 200), width=2)
        draw.line([(cx, y_pos), (cx - rx + 20, y_pos - 25)], fill=(67, 160, 71, 200), width=2)

    return img.convert("RGB")


def add_early_blight_lesions(img):
    """Add characteristic concentric target-board ring lesions with yellow halos."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    cx, cy = w // 2, h // 2

    lesion_centers = [
        (cx - 45, cy - 60, 28),
        (cx + 50, cy + 20, 35),
        (cx - 30, cy + 70, 22),
        (cx + 35, cy - 80, 18),
    ]

    for lx, ly, radius in lesion_centers:
        # Yellow chlorotic halo
        draw.ellipse([lx - radius - 8, ly - radius - 8, lx + radius + 8, ly + radius + 8], fill=(189, 183, 62))
        # Dark brown outer ring
        draw.ellipse([lx - radius, ly - radius, lx + radius, ly + radius], fill=(78, 48, 32))
        # Concentric lighter ring
        draw.ellipse([lx - radius + 5, ly - radius + 5, lx + radius - 5, ly + radius - 5], fill=(110, 75, 45))
        # Darker inner ring
        draw.ellipse([lx - radius + 10, ly - radius + 10, lx + radius - 10, ly + radius - 10], fill=(55, 32, 20))
        # Central necrotic spot
        draw.ellipse([lx - 4, ly - 4, lx + 4, ly + 4], fill=(30, 18, 12))

    return img.filter(ImageFilter.SMOOTH)


def add_late_blight_lesions(img):
    """Add irregular water-soaked, dark purplish-brown necrotic patches with pale borders."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    cx, cy = w // 2, h // 2

    # Irregular patches
    patches = [
        [(cx - 80, cy - 40), (cx - 20, cy - 70), (cx + 10, cy - 30), (cx - 50, cy + 10)],
        [(cx + 20, cy + 10), (cx + 90, cy + 40), (cx + 60, cy + 90), (cx + 10, cy + 60)],
        [(cx - 40, cy + 60), (cx + 20, cy + 100), (cx - 10, cy + 120), (cx - 60, cy + 90)],
    ]

    for pts in patches:
        # Chlorotic border
        draw.polygon(pts, fill=(160, 168, 65))
        # Water-soaked dark lesion
        shrunk = [(p[0] * 0.9 + cx * 0.1, p[1] * 0.9 + cy * 0.1) for p in pts]
        draw.polygon(shrunk, fill=(58, 42, 30))

    return img.filter(ImageFilter.GaussianBlur(radius=1.5))


def add_bacterial_spots(img):
    """Add small, angular dark brown-black spots with translucent yellow margins."""
    draw = ImageDraw.Draw(img)
    w, h = img.size
    cx, cy = w // 2, h // 2

    np.random.seed(42)
    for _ in range(35):
        ox = np.random.randint(-75, 75)
        oy = np.random.randint(-110, 110)
        size = np.random.randint(4, 10)
        # Yellow margin
        draw.ellipse([cx + ox - size - 2, cy + oy - size - 2, cx + ox + size + 2, cy + oy + size + 2], fill=(195, 185, 70))
        # Black/dark brown spot
        draw.ellipse([cx + ox - size, cy + oy - size, cx + ox + size, cy + oy + size], fill=(40, 30, 25))

    return img.filter(ImageFilter.SMOOTH)


def generate_all_samples():
    output_dir = os.path.join(os.path.dirname(__file__), "sample_images")
    public_dir = os.path.join(os.path.dirname(__file__), "frontend", "public", "sample_images")
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)

    samples = [
        ("sample_tomato_healthy.jpg", create_leaf_base(base_color=(46, 139, 87))),
        ("sample_tomato_early_blight.jpg", add_early_blight_lesions(create_leaf_base(base_color=(56, 125, 60)))),
        ("sample_tomato_late_blight.jpg", add_late_blight_lesions(create_leaf_base(base_color=(50, 115, 55)))),
        ("sample_pepper_bacterial_spot.jpg", add_bacterial_spots(create_leaf_base(base_color=(40, 120, 50)))),
        ("sample_potato_healthy.jpg", create_leaf_base(base_color=(43, 132, 60))),
        ("sample_potato_early_blight.jpg", add_early_blight_lesions(create_leaf_base(base_color=(48, 120, 55)))),
    ]

    for filename, image in samples:
        filepath = os.path.join(output_dir, filename)
        image.save(filepath, "JPEG", quality=95)
        pubpath = os.path.join(public_dir, filename)
        image.save(pubpath, "JPEG", quality=95)
        print(f"✅ Generated: {filename}")

    print(f"\n🎉 Saved {len(samples)} sample leaf images to {output_dir}/ and {public_dir}/")


if __name__ == "__main__":
    generate_all_samples()
