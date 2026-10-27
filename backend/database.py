import sqlite3
import os
import json
from pathlib import Path

DB_DIR = Path(__file__).resolve().parent
DB_FILE = DB_DIR / "hazard_system.db"
UPLOADS_DIR = DB_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Zones table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS zones (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        polygon_coords TEXT NOT NULL,
        hazard_types TEXT NOT NULL,
        description TEXT
    );
    """)
    
    # Workers table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS workers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        zone_id TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_lat REAL,
        last_lng REAL
    );
    """)
    
    # Incidents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        worker_id TEXT,
        worker_name TEXT,
        zone_id TEXT,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL, -- CRITICAL, HIGH, MEDIUM, LOW
        status TEXT NOT NULL DEFAULT 'NEW', -- NEW, ACKNOWLEDGED, RESOLVED, DISMISSED
        hazard_type TEXT NOT NULL, -- spill, wiring, debris, unsafe-edge, slip-fall, missing-ppe
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        image_url TEXT,
        imu_telemetry TEXT, -- JSON string with ax, ay, az, gx, gy, gz, fall_detected
        detections TEXT,    -- JSON list of bounding boxes: [{label, confidence, bbox: [x,y,w,h]}]
        latency_ms REAL,    -- Edge to cloud response time (NFR-2 verification)
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Batch Sync Log table (REQ-1.4 / CH-56)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id TEXT NOT NULL,
        synced_count INTEGER NOT NULL,
        sync_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL
    );
    """)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_FILE)
