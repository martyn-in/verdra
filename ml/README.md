# 🌿 AgriVisionAI — Machine Learning Pipeline

Comprehensive documentation for training, evaluating, deploying, and explaining the deep learning crop disease detection model.

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Supported Crops & Diseases](#supported-crops--diseases)
3. [Dataset Setup (PlantVillage)](#dataset-setup-plantvillage)
4. [Training the Model](#training-the-model)
5. [Model Evaluation](#model-evaluation)
6. [Inference Engine](#inference-engine)
7. [Explainable AI (Grad-CAM)](#explainable-ai-grad-cam)
8. [Exporting to TFLite & Edge Deployment](#exporting-to-tflite--edge-deployment)

---

## 🧠 Architecture Overview

AgriVisionAI uses **Transfer Learning** with **MobileNetV2** pre-trained on ImageNet.
MobileNetV2 was selected for:
- **Low latency inference** (<150ms on CPU, <25ms on GPU).
- **Lightweight footprint** (~14MB footprint), making it ideal for edge and mobile deployments for farmers with low-bandwidth connectivity.
- **Inverted residual blocks** with linear bottlenecks that retain fine-grained visual features necessary for leaf lesion recognition.

### Network Topology:
```
Input: (224, 224, 3) Leaf Image
   │
   ▼
[Data Augmentation: Flip, Zoom, Shift, Rotation, Brightness]
   │
   ▼
[MobileNetV2 Backbone (Frozen initially, then Fine-tuned)]
   │
   ▼
[GlobalAveragePooling2D]
   │
   ▼
[Dense(256, activation='relu')]
   │
   ▼
[BatchNormalization + Dropout(0.4)]
   │
   ▼
[Dense(15, activation='softmax')] -> Class Probabilities
```

---

## 🌾 Supported Crops & Diseases (15 Classes)

Mapped in `class_names.json`:
1. `Pepper__bell___Bacterial_spot`
2. `Pepper__bell___healthy`
3. `Potato___Early_blight`
4. `Potato___Late_blight`
5. `Potato___healthy`
6. `Tomato___Bacterial_spot`
7. `Tomato___Early_blight`
8. `Tomato___Late_blight`
9. `Tomato___Leaf_Mold`
10. `Tomato___Septoria_leaf_spot`
11. `Tomato___Spider_mites_Two_spotted_spider_mite`
12. `Tomato___Target_Spot`
13. `Tomato___Tomato_Yellow_Leaf_Curl_Virus`
14. `Tomato___Tomato_mosaic_virus`
15. `Tomato___healthy`

---

## 📂 Dataset Setup (PlantVillage)

Download the open-source **PlantVillage** dataset from Kaggle or Torchvision.

Organize the directory structure:
```
dataset/
├── train/
│   ├── Pepper__bell___Bacterial_spot/
│   ├── Tomato___Early_blight/
│   └── ...
├── validation/
│   ├── Pepper__bell___Bacterial_spot/
│   ├── Tomato___Early_blight/
│   └── ...
└── test/
    ├── Pepper__bell___Bacterial_spot/
    ├── Tomato___Early_blight/
    └── ...
```

---

## 🚀 Training the Model

Run the training pipeline with automated data augmentation, two-phase learning rate scheduling, and early stopping:

```bash
# Basic usage
python train.py --data_dir ../dataset --epochs 25 --batch_size 32

# With fine-tuning of top backbone layers
python train.py --data_dir ../dataset --epochs 30 --fine_tune --lr 0.0001
```

### Training Features:
- **Real-time data augmentation**: Random rotations (20°), horizontal flips, width/height shifts (10%), zoom (15%), and brightness adjustments (0.8–1.2).
- **Callbacks**:
  - `ModelCheckpoint`: Saves best weights based on `val_accuracy`.
  - `EarlyStopping`: Halts training if validation loss plateaus for 5 epochs.
  - `ReduceLROnPlateau`: Halves learning rate when validation loss stalls for 2 epochs.

---

## 📊 Model Evaluation

Run evaluation against the held-out test split:

```bash
python evaluate.py --model_path ../models/agri_vision_model.keras --data_dir ../dataset
```

Generates:
- Top-1 and Top-3 Accuracy
- Precision, Recall, and F1-score per disease class
- Confusion matrix plot saved to `confusion_matrix.png`

---

## 🔍 Inference Engine

Test single images or directories directly via CLI:

```bash
# Single image test
python inference.py --model_path ../models/agri_vision_model.keras --image_path ../sample_images/sample_tomato_early_blight.jpg

# Directory batch test
python inference.py --model_path ../models/agri_vision_model.keras --image_path ../sample_images/ --top_k 3
```

---

## 🎯 Explainable AI (Grad-CAM)

Gradient-weighted Class Activation Mapping computes the gradient of the target class score with respect to the feature map of the last convolutional layer (`Conv_1` in MobileNetV2):

$$L_{Grad-CAM}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$$

Where:
$$\alpha_k^c = \frac{1}{Z} \sum_i \sum_j \frac{\partial y^c}{\partial A_{i,j}^k}$$

Run Grad-CAM generation:
```bash
python gradcam.py --image_path ../sample_images/sample_tomato_early_blight.jpg --output_dir ./gradcam_outputs/
```
Outputs:
1. `<filename>_original.png`: Standardized leaf image.
2. `<filename>_heatmap.png`: Thermal gradient intensity map.
3. `<filename>_overlay.png`: Visual overlay spotlighting lesions for farmer inspection.

---

## 📱 Exporting to TFLite & Edge Deployment

To deploy on Android / iOS or low-power edge microcontrollers (Raspberry Pi / ESP32-CAM):

```python
import tensorflow as tf

model = tf.keras.models.load_model('../models/agri_vision_model.keras')
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]  # 8-bit dynamic range quantization
tflite_quant_model = converter.convert()

with open('../models/agri_vision_model.tflite', 'wb') as f:
    f.write(tflite_quant_model)
```
Reduces model size from ~14MB down to ~3.8MB with <0.5% accuracy loss.
