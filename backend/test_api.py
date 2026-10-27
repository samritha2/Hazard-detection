import pytest
import sqlite3
import json
from fastapi.testclient import TestClient
from main import app
from database import init_db

client = TestClient(app)

def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "incidents" in data["endpoints"]

def test_list_incidents():
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_create_json_incident():
    payload = {
        "worker_id": "W-105",
        "worker_name": "Arun Kumar",
        "zone_id": "ZONE-B",
        "timestamp": "2026-09-07T12:00:00Z",
        "severity": "CRITICAL",
        "hazard_type": "slip-fall",
        "latitude": 12.9728,
        "longitude": 77.5945,
        "notes": "Automated PyTest Anomaly Trigger",
        "imu_telemetry": {
            "ax": 1.5,
            "ay": -9.2,
            "az": 23.4,
            "fall_detected": True
        }
    }
    response = client.post("/api/incidents/report-json", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["incident"]["worker_id"] == "W-105"
    assert data["incident"]["severity"] == "CRITICAL"

def test_yolo_webhook_hook():
    # First get an incident ID
    inc_res = client.get("/api/incidents")
    inc_id = inc_res.json()[0]["id"]

    payload = {
        "incident_id": inc_id,
        "detections": [
            {"label": "spill", "confidence": 0.98, "bbox": [0.1, 0.2, 0.4, 0.3], "severity": "MEDIUM"}
        ],
        "model_version": "yolov8-test-v1"
    }
    response = client.post("/api/yolo/inference-webhook", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert len(data["incident"]["detections"]) == 1
    assert data["incident"]["detections"][0]["label"] == "spill"

def test_offline_batch_sync():
    payload = {
        "worker_id": "W-103",
        "client_timestamp": "2026-09-07T12:30:00Z",
        "incidents": [
            {
                "worker_id": "W-103",
                "worker_name": "David Chen",
                "zone_id": "ZONE-A",
                "timestamp": "2026-09-07T12:25:00Z",
                "severity": "HIGH",
                "hazard_type": "debris",
                "latitude": 12.9720,
                "longitude": 77.5944,
                "notes": "Offline queue sync item 1"
            },
            {
                "worker_id": "W-103",
                "worker_name": "David Chen",
                "zone_id": "ZONE-A",
                "timestamp": "2026-09-07T12:28:00Z",
                "severity": "HIGH",
                "hazard_type": "unsafe-edge",
                "latitude": 12.9721,
                "longitude": 77.5945,
                "notes": "Offline queue sync item 2"
            }
        ]
    }
    response = client.post("/api/incidents/sync-batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["synced_count"] == 2

def test_analytics():
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert "hazard_distribution" in data
    assert "zone_incident_counts" in data
    assert data["kpis"]["nfr2_compliant"] is True
