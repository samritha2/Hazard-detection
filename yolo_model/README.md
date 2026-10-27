# YOLOv8 Hazard Detection Pipeline (CH-81 / REQ-2.3)

Guide for building and training the YOLO model for the Construction Hazard Detection System.

---

## 🛠️ Step 1: Where to Train / Build the Model

Your teammate can train the model using **Google Colab (Free GPU)**, **Kaggle Notebooks**, or locally using Python:

```bash
pip install ultralytics
```

### Dataset:
Use a Construction Safety & Hazard dataset (e.g. from [Roboflow Universe](https://universe.roboflow.com/) or Kaggle) labeled with classes:
- `slip-fall`
- `unsafe-edge`
- `exposed-wiring`
- `spill`
- `debris`
- `missing-helmet`

### Training Command (Python / Colab):
```python
from ultralytics import YOLO

# 1. Load base pre-trained YOLOv8 model
model = YOLO("yolov8n.pt")  # Nano or small (yolov8s.pt)

# 2. Train on construction hazard dataset
results = model.train(
    data="hazard_dataset.yaml",
    epochs=50,
    imgsz=640,
    batch=16,
    device=0  # GPU
)
```

---

## 📂 Step 2: Where to Put the Trained Weights in This Project

Once training finishes, YOLO generates a file called **`best.pt`**.

Your teammate simply puts that file in this folder:
```
hazard_system/
└── yolo_model/
    ├── best.pt              <-- Put trained model file here!
    ├── hazard_detector.py   <-- Loads best.pt and formats bounding boxes
    └── README.md
```

---

## 🚀 Step 3: How the Backend & Website Use It

Whenever a worker's camera snaps a hazard photo:
1. FastAPI calls [`hazard_detector.py`](hazard_detector.py).
2. The detector extracts bounding boxes `[x, y, width, height]` and confidence scores.
3. The React website automatically draws these bounding boxes in real-time on the **Command Map** and **Detection Inspector**!
