from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime

class DetectionBox(BaseModel):
    label: str               # e.g., 'spill', 'debris', 'exposed-wiring', 'unsafe-edge', 'slip-fall'
    confidence: float        # e.g., 0.92
    bbox: List[float]        # [x, y, width, height] normalized (0.0 to 1.0) or absolute px
    severity: Optional[str] = "HIGH"

class IMUTelemetry(BaseModel):
    ax: float = 0.0          # X-axis acceleration in m/s^2
    ay: float = 0.0          # Y-axis acceleration in m/s^2
    az: float = 9.81         # Z-axis acceleration in m/s^2
    gx: Optional[float] = 0.0
    gy: Optional[float] = 0.0
    gz: Optional[float] = 0.0
    fall_detected: bool = False
    impact_magnitude: Optional[float] = 0.0

class IncidentCreate(BaseModel):
    id: Optional[str] = None
    worker_id: str
    worker_name: Optional[str] = "Worker"
    zone_id: str = "ZONE-A"
    timestamp: str
    severity: str = "HIGH"   # CRITICAL, HIGH, MEDIUM, LOW
    hazard_type: str         # spill, wiring, debris, unsafe-edge, slip-fall, missing-ppe
    latitude: float
    longitude: float
    image_url: Optional[str] = None
    imu_telemetry: Optional[IMUTelemetry] = None
    detections: Optional[List[DetectionBox]] = []
    latency_ms: Optional[float] = 180.0
    notes: Optional[str] = ""

class IncidentResponse(BaseModel):
    id: str
    worker_id: str
    worker_name: Optional[str]
    zone_id: str
    timestamp: str
    severity: str
    status: str
    hazard_type: str
    latitude: float
    longitude: float
    image_url: Optional[str]
    imu_telemetry: Optional[Any]
    detections: Optional[List[DetectionBox]]
    latency_ms: Optional[float]
    notes: Optional[str]
    created_at: str

class IncidentStatusUpdate(BaseModel):
    status: str              # NEW, ACKNOWLEDGED, RESOLVED, DISMISSED
    notes: Optional[str] = None

class YOLOWebhookPayload(BaseModel):
    incident_id: str
    detections: List[DetectionBox]
    model_version: Optional[str] = "yolov8-custom-hazard-v1"
    inference_time_ms: Optional[float] = 45.0

class OfflineBatchSync(BaseModel):
    worker_id: str
    incidents: List[IncidentCreate]
    client_timestamp: str

class ZoneSchema(BaseModel):
    id: str
    name: str
    risk_level: str
    polygon_coords: List[List[float]]
    hazard_types: List[str]
    description: str

class WorkerSchema(BaseModel):
    id: str
    name: str
    role: str
    zone_id: str
    status: str
    last_lat: float
    last_lng: float
