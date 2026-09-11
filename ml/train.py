"""
AgriVisionAI — Model Training Pipeline
Transfer learning with MobileNetV2 on PlantVillage dataset.

Usage:
    python train.py --data_dir ../dataset --epochs 25 --batch_size 32

Prerequisites:
    1. Download PlantVillage dataset
    2. Organize into dataset/train/, dataset/validation/, dataset/test/
    3. See ml/README.md for detailed instructions
"""
import argparse
import json
import os
import sys
import numpy as np

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ModelCheckpoint,
    ReduceLROnPlateau,
)


def create_data_generators(data_dir: str, img_size: int = 224, batch_size: int = 32):
    """Create training and validation data generators with augmentation."""
    train_datagen = keras.preprocessing.image.ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=20,
        width_shift_range=0.1,
        height_shift_range=0.1,
        horizontal_flip=True,
        zoom_range=0.15,
        brightness_range=[0.8, 1.2],
        fill_mode="nearest",
    )

    val_datagen = keras.preprocessing.image.ImageDataGenerator(rescale=1.0 / 255)

    train_dir = os.path.join(data_dir, "train")
    val_dir = os.path.join(data_dir, "validation")

    if not os.path.exists(train_dir):
        print(f"Error: Training directory not found: {train_dir}")
        print("Please organize your dataset as described in ml/README.md")
        sys.exit(1)

    train_generator = train_datagen.flow_from_directory(
        train_dir,
        target_size=(img_size, img_size),
        batch_size=batch_size,
        class_mode="categorical",
        shuffle=True,
    )

    val_generator = val_datagen.flow_from_directory(
        val_dir,
        target_size=(img_size, img_size),
        batch_size=batch_size,
        class_mode="categorical",
        shuffle=False,
    )

    return train_generator, val_generator


def build_model(num_classes: int, img_size: int = 224):
    """Build MobileNetV2 transfer learning model."""
    base_model = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(img_size, img_size, 3),
    )

    # Freeze base model layers initially
    base_model.trainable = False

    model = keras.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(256, activation="relu"),
        layers.BatchNormalization(),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation="softmax"),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model, base_model


def fine_tune_model(model, base_model, fine_tune_at: int = 100):
    """Unfreeze top layers of base model for fine-tuning."""
    base_model.trainable = True
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=1e-4),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def train(args):
    """Main training function."""
    print("=" * 60)
    print("🌿 AgriVisionAI — Model Training Pipeline")
    print("=" * 60)

    # Create data generators
    print(f"\n📂 Loading dataset from: {args.data_dir}")
    train_gen, val_gen = create_data_generators(
        args.data_dir, args.img_size, args.batch_size
    )

    num_classes = train_gen.num_classes
    class_names = list(train_gen.class_indices.keys())

    print(f"   Classes: {num_classes}")
    print(f"   Training samples: {train_gen.samples}")
    print(f"   Validation samples: {val_gen.samples}")

    # Save class names
    class_names_path = os.path.join(os.path.dirname(__file__), "class_names.json")
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"   Class names saved to: {class_names_path}")

    # Build model
    print(f"\n🏗️  Building MobileNetV2 model...")
    model, base_model = build_model(num_classes, args.img_size)
    model.summary()

    # Callbacks
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    os.makedirs(model_dir, exist_ok=True)
    model_path = os.path.join(model_dir, "agri_vision_model.keras")

    callbacks = [
        EarlyStopping(
            monitor="val_accuracy",
            patience=5,
            restore_best_weights=True,
            verbose=1,
        ),
        ModelCheckpoint(
            model_path,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1,
        ),
    ]

    # Phase 1: Train with frozen base
    print(f"\n🚀 Phase 1: Training classification head ({args.epochs} epochs)...")
    history1 = model.fit(
        train_gen,
        validation_data=val_gen,
        epochs=args.epochs,
        callbacks=callbacks,
        verbose=1,
    )

    # Phase 2: Fine-tune
    if args.fine_tune:
        print(f"\n🔧 Phase 2: Fine-tuning top layers ({args.fine_tune_epochs} epochs)...")
        model = fine_tune_model(model, base_model, fine_tune_at=args.fine_tune_at)

        history2 = model.fit(
            train_gen,
            validation_data=val_gen,
            epochs=args.fine_tune_epochs,
            callbacks=callbacks,
            verbose=1,
        )

    # Save final model
    model.save(model_path)
    print(f"\n💾 Model saved to: {model_path}")

    # Save training metrics
    metrics = {
        "num_classes": num_classes,
        "class_names": class_names,
        "img_size": args.img_size,
        "training_samples": train_gen.samples,
        "validation_samples": val_gen.samples,
        "final_train_accuracy": float(history1.history["accuracy"][-1]),
        "final_val_accuracy": float(history1.history["val_accuracy"][-1]),
        "final_train_loss": float(history1.history["loss"][-1]),
        "final_val_loss": float(history1.history["val_loss"][-1]),
    }

    metrics_path = os.path.join(os.path.dirname(__file__), "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"📊 Metrics saved to: {metrics_path}")

    print("\n✅ Training complete!")
    print(f"   Best validation accuracy: {max(history1.history['val_accuracy']):.4f}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgriVisionAI Model Training")
    parser.add_argument("--data_dir", type=str, default="../dataset",
                       help="Path to dataset directory")
    parser.add_argument("--epochs", type=int, default=20,
                       help="Number of training epochs (phase 1)")
    parser.add_argument("--batch_size", type=int, default=32,
                       help="Batch size")
    parser.add_argument("--img_size", type=int, default=224,
                       help="Input image size")
    parser.add_argument("--fine_tune", action="store_true",
                       help="Enable fine-tuning phase")
    parser.add_argument("--fine_tune_epochs", type=int, default=10,
                       help="Number of fine-tuning epochs")
    parser.add_argument("--fine_tune_at", type=int, default=100,
                       help="Layer to start fine-tuning from")

    args = parser.parse_args()
    train(args)
