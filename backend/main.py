import os
import json
import uuid
import time
import shutil
import sys
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, Query, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import get_db_connection, init_db, UPLOADS_DIR
from schemas import (
    IncidentCreate, IncidentResponse, IncidentStatusUpdate,
    YOLOWebhookPayload, OfflineBatchSync, DetectionBox, IMUTelemetry
)
from seed_data import seed_initial_data
from firebase_config import (
    is_firebase_active, save_incident_to_firestore,
    update_incident_status_in_firestore, get_firestore_incidents
)

# Import real YOLO detector
# Add yolo_model to path
sys.path.append(str(Path(__file__).resolve().parent.parent / "yolo_model"))
from hazard_detector import detector, HAZARD_LABELS

# Initialize database & seed data on startup
init_db()
seed_initial_data()

app = FastAPI(
    title="Cross-Modal Construction Site Hazard Detection Cloud API",
    description="FastAPI Backend with Real YOLOv8 Inference and Real Hardware IMU Ingestion.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# -------------------------------------------------------------
# WebSocket Connection Manager (REQ-3.1 Real-Time Broadcasts)
# -------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Active clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"[WS] Client disconnected. Active clients: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict):
        message = json.dumps({"type": event_type, "data": data, "broadcast_time": datetime.now(timezone.utc).isoformat()})
        dead_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                dead_connections.append(connection)
        for dead in dead_connections:
            if dead in self.active_connections:
                self.active_connections.remove(dead)

manager = ConnectionManager()

@app.websocket("/ws/live-feed")
async def websocket_live_feed(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "SYSTEM_CONNECTED",
            "data": {"message": "Connected to Construction Hazard Live Stream"}
        }))
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS Error]: {e}")
        manager.disconnect(websocket)


# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def parse_incident_row(row) -> dict:
    d = dict(row)
    if d.get("imu_telemetry") and isinstance(d["imu_telemetry"], str):
        try:
            d["imu_telemetry"] = json.loads(d["imu_telemetry"])
        except Exception:
            pass
    if d.get("detections") and isinstance(d["detections"], str):
        try:
            d["detections"] = json.loads(d["detections"])
        except Exception:
            d["detections"] = []
    return d

def save_incident_to_db_and_broadcast(incident_data: dict, conn=None):
    close_conn = False
    if not conn:
        conn = get_db_connection()
        close_conn = True
    
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO incidents (
        id, worker_id, worker_name, zone_id, timestamp, severity, status,
        hazard_type, latitude, longitude, image_url, imu_telemetry, detections, latency_ms, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_data["id"], incident_data["worker_id"], incident_data["worker_name"],
        incident_data["zone_id"], incident_data["timestamp"], incident_data["severity"],
        "NEW", incident_data["hazard_type"], incident_data["latitude"], incident_data["longitude"],
        incident_data["image_url"], json.dumps(incident_data.get("imu_telemetry", {})),
        json.dumps(incident_data.get("detections", [])), incident_data.get("latency_ms", 0),
        incident_data.get("notes", "")
    ))
    
    if incident_data.get("worker_id"):
        cursor.execute("""
        UPDATE workers SET last_lat = ?, last_lng = ?, last_heartbeat = CURRENT_TIMESTAMP WHERE id = ?
        """, (incident_data["latitude"], incident_data["longitude"], incident_data["worker_id"]))
        
    conn.commit()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_data["id"],))
    new_record = parse_incident_row(cursor.fetchone())
    
    if close_conn:
        conn.close()
        
    save_incident_to_firestore(new_record)
    return new_record

# -------------------------------------------------------------
# REST Endpoints
# -------------------------------------------------------------

@app.get("/")
def root():
    return {
        "service": "Construction Hazard Detection Cloud Platform",
        "status": "OPERATIONAL",
        "yolo_model": detector.get_status(),
        "endpoints": {
            "incidents": "/api/incidents",
            "report_media": "/api/incidents/upload-media",
            "report_imu": "/api/incidents/hardware-imu",
            "yolo_webhook": "/api/yolo/inference-webhook",
            "analytics": "/api/analytics",
            "zones": "/api/zones",
            "workers": "/api/workers",
            "websocket": "/ws/live-feed",
            "live_cam": "/live-cam"
        }
    }


# --- LIVE CAMERA FEED from Raspberry Pi ---
from fastapi.responses import HTMLResponse, FileResponse
import glob

@app.get("/api/live-cam/latest")
def get_latest_camera_image():
    """Returns the most recently uploaded image from the Pi camera."""
    image_files = sorted(UPLOADS_DIR.glob("UPLOAD-*.jpg"), key=os.path.getmtime, reverse=True)
    if not image_files:
        raise HTTPException(status_code=404, detail="No camera images yet")
    return FileResponse(str(image_files[0]), media_type="image/jpeg")

@app.get("/live-cam", response_class=HTMLResponse)
def live_camera_page():
    """Full-screen live camera feed from the Raspberry Pi, refreshing every 2 seconds."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>HALVF Live Camera Feed</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f172a; color: #e2e8f0; font-family: 'Segoe UI', sans-serif; display: flex; flex-direction: column; align-items: center; height: 100vh; }
  .header { display: flex; align-items: center; gap: 12px; padding: 16px; width: 100%; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-bottom: 1px solid #334155; }
  .header h1 { font-size: 20px; font-weight: 700; }
  .live-dot { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; animation: blink 1s infinite; }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
  .live-badge { background: #ef4444; color: white; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 1px; }
  .feed-container { flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; width: 100%; max-width: 960px; }
  .feed-container img { max-width: 100%; max-height: calc(100vh - 140px); border-radius: 12px; border: 2px solid #334155; box-shadow: 0 0 40px rgba(59,130,246,0.15); }
  .status-bar { padding: 10px; background: #1e293b; width: 100%; text-align: center; font-size: 13px; color: #94a3b8; border-top: 1px solid #334155; }
  .status-bar span { color: #22c55e; font-weight: 600; }
</style>
</head>
<body>
  <div class="header">
    <div class="live-dot"></div>
    <div class="live-badge">LIVE</div>
    <h1>Raspberry Pi Camera Feed</h1>
  </div>
  <div class="feed-container">
    <img id="cam" src="/api/live-cam/latest" alt="Live Camera Feed" />
  </div>
  <div class="status-bar">
    Refreshing every <span>2 seconds</span> &mdash; Last update: <span id="ts">--</span>
  </div>
  <script>
    const img = document.getElementById('cam');
    const ts = document.getElementById('ts');
    setInterval(() => {
      img.src = '/api/live-cam/latest?t=' + Date.now();
      ts.textContent = new Date().toLocaleTimeString();
    }, 2000);
  </script>
</body>
</html>"""


# 1. Real Media Upload (Image/Video) -> YOLO Inference
@app.post("/api/incidents/upload-media")
async def report_incident_media(
    background_tasks: BackgroundTasks,
    worker_id: str = Form("W-UNKNOWN"),
    worker_name: str = Form("Unknown Camera"),
    zone_id: str = Form("ZONE-A"),
    latitude: float = Form(12.9722),
    longitude: float = Form(77.5945),
    file: UploadFile = File(...)
):
    """
    Upload an image or video from the construction site.
    If image: Runs YOLO immediately.
    If video: Extracts frames, runs YOLO, creates incidents for hazardous frames.
    """
    start_time = time.time()
    
    ext = os.path.splitext(file.filename)[1].lower()
    is_video = ext in [".mp4", ".avi", ".mov", ".mkv"]
    
    filename = f"UPLOAD-{uuid.uuid4().hex[:8].upper()}{ext}"
    file_path = UPLOADS_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    image_url = f"/uploads/{filename}"
    
    if not detector.is_loaded:
        return {"status": "ERROR", "message": "YOLO model not loaded. Place weights in yolo_model/"}

    if is_video:
        # Process Video in background to not block HTTP response
        def process_video_bg():
            print(f"[API] Processing video {filename}...")
            video_output_dir = UPLOADS_DIR / f"frames_{uuid.uuid4().hex[:6]}"
            results = detector.predict_video(str(file_path), str(video_output_dir))
            
            conn = get_db_connection()
            for r in results:
                if r["has_hazards"]:
                    frame_url = f"/uploads/{video_output_dir.name}/{os.path.basename(r['frame_path'])}"
                    primary_hazard = r["hazard_detections"][0]
                    
                    incident_data = {
                        "id": f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
                        "worker_id": worker_id,
                        "worker_name": worker_name,
                        "zone_id": zone_id,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "severity": primary_hazard["severity"],
                        "hazard_type": primary_hazard["label"],
                        "latitude": latitude,
                        "longitude": longitude,
                        "image_url": frame_url,
                        "detections": r["detections"],
                        "latency_ms": round((time.time() - start_time) * 1000, 2),
                        "notes": f"Detected in video frame {r['frame_number']} ({r['timestamp_sec']}s)"
                    }
                    import asyncio
                    new_rec = save_incident_to_db_and_broadcast(incident_data, conn)
                    # Use asyncio run to call async broadcast from sync background task
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(manager.broadcast("NEW_INCIDENT", new_rec))
                    except RuntimeError:
                        asyncio.run(manager.broadcast("NEW_INCIDENT", new_rec))

            conn.close()
            print(f"[API] Video processing complete. Created {len(results)} incidents.")

        background_tasks.add_task(process_video_bg)
        return {"status": "PROCESSING", "message": "Video uploaded and processing started in background."}
        
    else:
        # Process Image synchronously
        detections = detector.predict_image(str(file_path))
        hazard_detections = [d for d in detections if d["label"] in HAZARD_LABELS]
        
        is_hazard = len(hazard_detections) > 0
        primary_hazard = hazard_detections[0] if is_hazard else None
        
        incident_data = {
            "id": f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "worker_id": worker_id,
            "worker_name": worker_name,
            "zone_id": zone_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "severity": primary_hazard["severity"] if is_hazard else "INFO",
            "hazard_type": primary_hazard["label"] if is_hazard else "SAFE_FEED",
            "latitude": latitude,
            "longitude": longitude,
            "image_url": image_url,
            "detections": detections,
            "latency_ms": round((time.time() - start_time) * 1000, 2),
            "notes": "Hazard detected from uploaded image." if is_hazard else "Live camera feed check (SAFE)."
        }
        
        new_record = save_incident_to_db_and_broadcast(incident_data)
        import asyncio
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast("NEW_INCIDENT", new_record))
        except RuntimeError:
            asyncio.run(manager.broadcast("NEW_INCIDENT", new_record))
            
        return {"status": "HAZARD_DETECTED" if is_hazard else "SAFE", "incident": new_record}


# 2. Real Hardware IMU Telemetry (Arduino/RPi)
class HardwareIMUPayload(BaseModel):
    device_id: str
    ax: float
    ay: float
    az: float
    gx: float
    gy: float
    gz: float
    fall_detected: bool
    latitude: float
    longitude: float

@app.post("/api/incidents/hardware-imu")
async def report_hardware_imu(payload: HardwareIMUPayload):
    """
    Endpoint for edge hardware (Arduino/Raspberry Pi) to send raw IMU data.
    Creates an incident if fall_detected is true.
    """
    start_time = time.time()
    
    if not payload.fall_detected:
        # Could log telemetry here, but for now we only care if fall is detected
        return {"status": "LOGGED", "message": "Telemetry received, no fall detected."}

    incident_data = {
        "id": f"INC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
        "worker_id": payload.device_id,
        "worker_name": "Edge Device " + payload.device_id,
        "zone_id": "UNKNOWN", # Could do geo-lookup based on lat/lng
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "severity": "CRITICAL",
        "hazard_type": "fall",
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "image_url": None,
        "imu_telemetry": {
            "ax": payload.ax, "ay": payload.ay, "az": payload.az,
            "gx": payload.gx, "gy": payload.gy, "gz": payload.gz,
            "fall_detected": payload.fall_detected,
            "impact_magnitude": round((payload.ax**2 + payload.ay**2 + payload.az**2)**0.5, 2)
        },
        "detections": [],
        "latency_ms": round((time.time() - start_time) * 1000, 2),
        "notes": "Fall detected via hardware IMU sensor."
    }
    
    new_record = save_incident_to_db_and_broadcast(incident_data)
    await manager.broadcast("NEW_INCIDENT", new_record)
    return {"status": "HAZARD_DETECTED", "incident": new_record}


# 3. Teammate's YOLOv8 Inference Webhook Hook (CH-81 Integration)
@app.post("/api/yolo/inference-webhook")
async def yolo_inference_webhook(payload: YOLOWebhookPayload):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (payload.incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    detections_list = [d.model_dump() for d in payload.detections]
    cursor.execute("""
    UPDATE incidents SET detections = ? WHERE id = ?
    """, (json.dumps(detections_list), payload.incident_id))
    conn.commit()

    cursor.execute("SELECT * FROM incidents WHERE id = ?", (payload.incident_id,))
    updated_record = parse_incident_row(cursor.fetchone())
    conn.close()

    save_incident_to_firestore(updated_record)
    await manager.broadcast("INCIDENT_UPDATED", updated_record)
    return {
        "status": "SUCCESS",
        "message": f"Attached {len(detections_list)} YOLO detections to {payload.incident_id}",
        "incident": updated_record
    }


# 4. List Incidents with Filters
@app.get("/api/incidents")
def list_incidents(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    hazard_type: Optional[str] = Query(None),
    limit: int = 50
):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    
    if status:
        query += " AND status = ?"
        params.append(status)
    if severity:
        query += " AND severity = ?"
        params.append(severity)
    if zone_id:
        query += " AND zone_id = ?"
        params.append(zone_id)
    if hazard_type:
        query += " AND hazard_type = ?"
        params.append(hazard_type)
        
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(limit)
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    incidents = [parse_incident_row(r) for r in rows]
    conn.close()
    return incidents


# 5. Single Incident Details
@app.get("/api/incidents/{incident_id}")
def get_incident(incident_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return parse_incident_row(row)


# 6. Update Incident Status (Resolve / Acknowledge)
@app.patch("/api/incidents/{incident_id}/status")
async def update_incident_status(incident_id: str, payload: IncidentStatusUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Incident not found")

    if payload.notes:
        cursor.execute("""
        UPDATE incidents SET status = ?, notes = notes || ' | ' || ? WHERE id = ?
        """, (payload.status, payload.notes, incident_id))
    else:
        cursor.execute("""
        UPDATE incidents SET status = ? WHERE id = ?
        """, (payload.status, incident_id))
        
    conn.commit()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    updated_record = parse_incident_row(cursor.fetchone())
    conn.close()

    update_incident_status_in_firestore(incident_id, payload.status, payload.notes)
    await manager.broadcast("INCIDENT_STATUS_CHANGED", updated_record)
    return {"status": "SUCCESS", "incident": updated_record}


# 7. Zones & Map Metadata (REQ-3.2)
@app.get("/api/zones")
def list_zones():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM zones")
    rows = cursor.fetchall()
    zones = []
    for r in rows:
        d = dict(r)
        d["polygon_coords"] = json.loads(d["polygon_coords"])
        d["hazard_types"] = json.loads(d["hazard_types"])
        zones.append(d)
    conn.close()
    return zones


# 8. Active Field Workers
@app.get("/api/workers")
def list_workers():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM workers")
    rows = cursor.fetchall()
    workers = [dict(r) for r in rows]
    conn.close()
    return workers


# 9. Real-Time Analytics & Safety KPIs
@app.get("/api/analytics")
def get_analytics():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM incidents")
    total_incidents = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE status = 'NEW'")
    active_alerts = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM incidents WHERE severity = 'CRITICAL'")
    critical_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM workers WHERE status = 'ACTIVE'")
    active_workers = cursor.fetchone()[0]

    cursor.execute("SELECT AVG(latency_ms) FROM incidents WHERE latency_ms IS NOT NULL")
    avg_latency = round(cursor.fetchone()[0] or 0.0, 1)

    cursor.execute("SELECT hazard_type, COUNT(*) FROM incidents GROUP BY hazard_type")
    hazard_counts = {r[0]: r[1] for r in cursor.fetchall()}

    cursor.execute("SELECT severity, COUNT(*) FROM incidents GROUP BY severity")
    severity_counts = {r[0]: r[1] for r in cursor.fetchall()}

    cursor.execute("SELECT zone_id, COUNT(*) FROM incidents GROUP BY zone_id")
    zone_counts = {r[0]: r[1] for r in cursor.fetchall()}

    conn.close()

    return {
        "kpis": {
            "total_incidents": total_incidents,
            "active_alerts": active_alerts,
            "critical_count": critical_count,
            "active_workers": active_workers,
            "avg_latency_ms": avg_latency,
            "nfr2_compliant": avg_latency < 2000.0 if avg_latency > 0 else True
        },
        "hazard_distribution": hazard_counts,
        "severity_distribution": severity_counts,
        "zone_incident_counts": zone_counts
    }


# 10. Google Cloud Firebase Status (Firestore Cloud DB)
@app.get("/api/firebase/status")
def get_firebase_status():
    active = is_firebase_active()
    return {
        "status": "CONNECTED" if active else "READY_FOR_CREDENTIALS",
        "provider": "Google Cloud Firestore",
        "active": active,
        "key_path": "backend/serviceAccountKey.json",
        "collections": ["incidents", "zones", "workers", "sync_logs"],
        "message": "Connected to Google Cloud Firestore!" if active else "Ready for Firebase credentials. Drop serviceAccountKey.json into backend/ to activate live Google Cloud sync."
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
