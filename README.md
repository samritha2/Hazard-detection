# HazardSense: Cross-Modal Construction Site Hazard Detection System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19.2+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Ultralytics YOLO](https://img.shields.io/badge/YOLO-v8%20%2F%20v11-00FFFF?style=flat&logo=yolo&logoColor=black)](https://github.com/ultralytics/ultralytics)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Standard-IEEE%20830--1998-blue.svg)](#)

An IEEE Std 830-1998 compliant full-stack telemetry and AI perception platform for real-time construction site safety monitoring, incident triage, and edge worker protection.

---

## 📑 Table of Contents

- [Overview & Architecture](#-overview--architecture)
- [System Requirements & Prerequisites](#-system-requirements--prerequisites)
- [Frontend Setup & Node Modules Guide](#-frontend-setup--node-modules-guide)
  - [Installation & Dependency Resolution](#1-installation--dependency-resolution)
  - [Node Modules Troubleshooting](#2-node-modules-troubleshooting)
  - [Available Frontend NPM Scripts](#3-available-frontend-npm-scripts)
- [Backend Setup Guide](#-backend-setup-guide)
- [Quick Start: Master Runner](#-quick-start-master-runner)
- [YOLOv8 / Visual Inference Pipeline](#-yolov8--visual-inference-pipeline)
- [Hardware & Mobile Edge Integration](#-hardware--mobile-edge-integration)
- [Testing & Verification](#-testing--verification)
- [Repository Structure](#-repository-structure)

---

## 🏗️ Overview & Architecture

HazardSense addresses high-risk construction environments by fusing **cross-modal sensory signals**:
1. **Edge Kinematics (IMU)**: 50 Hz Accelerometer & Gyroscope stream ($a_x, a_y, a_z, g_x, g_y, g_z$) detecting sudden falls, freefall velocity loss, and high-G kinetic impacts.
2. **Visual AI (YOLOv8 / YOLO11)**: On-demand and edge camera snapshots analyzed for PPE compliance (`no_ppe`, `ppe_safe`), perimeter hazards (`exposed_edge`, `trench`), slip/trip risks (`spill`, `debris`), and fallen workers.
3. **Real-Time Cloud Hub (FastAPI)**: Asynchronous REST & WebSocket pipeline delivering sub-200ms telemetry broadcasts to safety supervisors.
4. **Safety Management Web Dashboard (React 19 + Vite)**: Interactive spatial floorplans, live incident tickers, telemetry charts, and bounding box inspection modals.

---

## 💻 System Requirements & Prerequisites

Ensure the following tools are installed before setting up the project:

- **Node.js**: `v18.x` or later (LTS `v20.x` or `v22.x` recommended)
- **NPM**: `v9.x` or later (bundled with Node.js)
- **Python**: `3.10` to `3.14`
- **Git**: For version control
- *(Optional)* **Flutter SDK**: `>= 3.0.0` (only required if building `mobile_edge_app`)

---

## 📦 Frontend Setup & Node Modules Guide

The frontend is a modern Single Page Application built with **React 19**, **Vite 8**, and **Tailwind CSS**.

### 1. Installation & Dependency Resolution

1. Open your terminal and change into the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install all required `node_modules`:
   ```bash
   npm install
   ```
   > **Tip**: If you prefer reproducible clean installs based strictly on `package-lock.json`, run:
   > ```bash
   > npm ci
   > ```

3. Verify installation:
   After `npm install` finishes, a `node_modules/` folder will be populated with all packages, including:
   - `react` & `react-dom` (v19)
   - `leaflet` & `react-leaflet` (spatial maps)
   - `framer-motion` (smooth animations)
   - `lucide-react` (icons)
   - `tailwindcss` & `postcss` (styling)

### 2. Node Modules Troubleshooting

If you encounter issues when installing or updating dependencies:

- **Missing or Corrupted Dependencies**:
  Delete the cache and reinstall cleanly:
  ```bash
  # Windows PowerShell
  Remove-Item -Recurse -Force node_modules, package-lock.json
  npm install
  ```
  ```bash
  # macOS / Linux
  rm -rf node_modules package-lock.json
  npm install
  ```

- **PowerShell Execution Policy Restrictions (Windows)**:
  If running `npm` commands throws an execution policy error in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  ```

- **Port Conflict (Port 5173 in use)**:
  Vite automatically increments to port `5174` if `5173` is busy. To specify a custom port:
  ```bash
  npm run dev -- --port 3000
  ```

- **Checking Node Version Compatibility**:
  ```bash
  node -v
  npm -v
  ```
  If your Node version is older than v18, please update via [nodejs.org](https://nodejs.org/) or [nvm](https://github.com/nvm-sh/nvm).

### 3. Available Frontend NPM Scripts

Run these scripts from within the `frontend/` directory:

| Command | Action | URL / Output |
| :--- | :--- | :--- |
| `npm run dev` | Starts Vite hot-reloading development server | `http://localhost:5173` |
| `npm run build` | Builds optimized production bundle | `frontend/dist/` |
| `npm run preview` | Locally serves and tests the production build | `http://localhost:4173` |
| `npm run lint` | Fast static analysis via Oxlint | Terminal report |

---

## 🐍 Backend Setup Guide

The backend is built with **FastAPI** providing REST endpoints and a WebSocket server.

1. Navigate to the repository root or `backend` folder:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r ../requirements.txt
   ```
   *(Or `pip install fastapi uvicorn websockets pydantic python-multipart ultralytics opencv-python-headless requests pytest httpx`)*

4. Start the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - **Interactive Swagger Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **ReDoc API Spec**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
   - **WebSocket Stream**: `ws://localhost:8000/ws/live-feed`

---

## ⚡ Quick Start: Master Runner

To start both the backend API and frontend dashboard concurrently with a single command:

```bash
# From the root directory:
python run_app.py
```

This launches:
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)

Press `Ctrl + C` in the terminal to stop both services gracefully.

---

## 👁️ YOLOv8 / Visual Inference Pipeline

The system includes a dedicated inference hook for custom YOLO models (`halvf_hazard.pt` or `best.pt`).

### Placing Model Weights
Place your trained weights in `yolo_model/`:
```
hazard_system/
└── yolo_model/
    ├── best.pt              # Trained YOLOv8/YOLO11 weights
    ├── hazard_detector.py   # Inference loader & bounding box mapper
    └── README.md
```

### External Webhook Endpoint
External training pipelines or edge inference scripts can post predictions directly:

`POST http://localhost:8000/api/yolo/inference-webhook`

```python
import requests

payload = {
    "incident_id": "INC-2026-001",
    "model_version": "yolov8n-custom-hazard",
    "inference_time_ms": 32.5,
    "detections": [
        {
            "label": "spill",
            "confidence": 0.94,
            "bbox": [0.20, 0.55, 0.60, 0.35],
            "severity": "HIGH"
        },
        {
            "label": "exposed-wiring",
            "confidence": 0.96,
            "bbox": [0.30, 0.40, 0.40, 0.45],
            "severity": "CRITICAL"
        }
    ]
}

response = requests.post("http://localhost:8000/api/yolo/inference-webhook", json=payload)
print(response.json())
```
*The web dashboard instantly renders the bounding boxes over WebSockets in real time.*

---

## 📡 Hardware & Mobile Edge Integration

- **Raspberry Pi GY-91 (MPU9250)**:
  Deploy [`rpi_imu_reader.py`](rpi_imu_reader.py) or [`rpi_halvf_deploy.py`](rpi_halvf_deploy.py) to read I2C accelerations, compute Sum Vector Magnitude ($SVM$), and transmit telemetry alerts when acceleration exceeds thresholds.
- **Flutter Mobile Edge App**:
  Located in [`mobile_edge_app/`](mobile_edge_app/). Features zero-touch camera activation on shock, encrypted offline SQLite queue, and automatic background synchronization.

---

## 🧪 Testing & Verification

Run the automated backend test suite with `pytest`:

```bash
cd backend
python -m pytest test_api.py -v
```

To run linting on the React frontend:
```bash
cd frontend
npm run lint
```

---

## 📂 Repository Structure

```
hazard_system/
├── .gitignore                    # Global git ignore configuration
├── README.md                     # Project documentation & setup instructions
├── requirements.txt              # Root Python dependencies
├── run_app.py                    # Dual-process master runner
├── dashboard.html                # Standalone lightweight web viewer
├── rpi_halvf_deploy.py           # Raspberry Pi deployment script
├── rpi_imu_reader.py             # Raspberry Pi GY-91 sensor reader
├── scan_pi.py                    # Local network Pi scanner
│
├── backend/                      # FastAPI Cloud Engine
│   ├── main.py                   # REST endpoints & WebSocket broadcast hub
│   ├── database.py               # SQLite schema & connection helpers
│   ├── schemas.py                # Pydantic data schemas
│   ├── seed_data.py              # Default zones & workers
│   ├── test_api.py               # Automated pytest suite
│   ├── firebase_config.py        # Optional Firestore synchronization
│   ├── realtime_edge_simulator.py# Simulated worker & hazard generator
│   └── serviceAccountKey.example.json # Firebase config template
│
├── frontend/                     # React 19 + Vite Dashboard
│   ├── package.json              # NPM scripts and dependencies
│   ├── vite.config.js            # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS design tokens
│   ├── src/
│   │   ├── App.jsx               # Main dashboard controller
│   │   ├── components/           # UI widgets, map view, analytics, feed
│   │   └── lib/                  # Helper utilities
│   └── public/                   # Static assets & SVG icons
│
├── mobile_edge_app/              # Flutter Edge Client
│   ├── lib/                      # Kinematic threshold & camera triggers
│   └── pubspec.yaml              # Dart dependencies
│
├── yolo_model/                   # Computer Vision Pipeline
│   ├── hazard_detector.py        # YOLOv8 inference wrapper
│   ├── best.pt                   # Pretrained weights
│   └── README.md                 # Model training guide
│
└── database/                     # Spatial Database Engine
    ├── schema_postgis.sql        # PostGIS PostgreSQL schema
    └── postgis_service.py        # Spatial query generator
```

---

## 📄 License

Developed for academic and industrial research in construction safety telemetry and AI computer vision.
