import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
import json

def get_db_connection():
    conn = sqlite3.connect('hazard_system.db')
    conn.row_factory = sqlite3.Row
    return conn

def inject_demo_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Base timestamp: 5 mins ago
    base_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    
    incidents = [
        {
            "id": f"INC-{base_time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "worker_id": "W-101",
            "worker_name": "Marcus Vance",
            "zone_id": "ZONE-B",
            "timestamp": base_time.isoformat(),
            "severity": "CRITICAL",
            "status": "NEW",
            "hazard_type": "fall",
            "latitude": 12.9727,
            "longitude": 77.5944,
            "image_url": "",
            "imu_telemetry": json.dumps({"ax": 3.4, "ay": -12.1, "az": 24.8, "fall_detected": True}),
            "detections": json.dumps([{"label": "fall", "confidence": 0.89, "box": [10, 20, 100, 200]}]),
            "latency_ms": 124.5,
            "notes": "Kinematic vertical shock detected. Worker tripped on loose scaffolding plank."
        },
        {
            "id": f"INC-{base_time.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "worker_id": "W-205",
            "worker_name": "Elena Rostova",
            "zone_id": "ZONE-C",
            "timestamp": (base_time + timedelta(minutes=2)).isoformat(),
            "severity": "HIGH",
            "status": "NEW",
            "hazard_type": "no_helmet",
            "latitude": 12.9730,
            "longitude": 77.5950,
            "image_url": "",
            "imu_telemetry": json.dumps({}),
            "detections": json.dumps([{"label": "no_helmet", "confidence": 0.92, "box": [50, 50, 150, 150]}]),
            "latency_ms": 110.2,
            "notes": "Worker observed without hardhat in active machinery zone."
        }
    ]
    
    for inc in incidents:
        cursor.execute("""
            INSERT INTO incidents (
                id, worker_id, worker_name, zone_id, timestamp, severity, status,
                hazard_type, latitude, longitude, image_url, imu_telemetry, detections, latency_ms, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            inc["id"], inc["worker_id"], inc["worker_name"], inc["zone_id"],
            inc["timestamp"], inc["severity"], inc["status"], inc["hazard_type"],
            inc["latitude"], inc["longitude"], inc["image_url"], inc["imu_telemetry"],
            inc["detections"], inc["latency_ms"], inc["notes"]
        ))
        print(f"[OK] Injected incident {inc['id']} - {inc['hazard_type']}")
        
    conn.commit()
    conn.close()

if __name__ == "__main__":
    print("[*] Injecting demo incidents...")
    inject_demo_data()
    print("[OK] Done.")
