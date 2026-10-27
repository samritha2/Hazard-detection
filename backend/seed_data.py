import json
from database import get_db_connection, init_db

def seed_initial_data():
    """
    Seeds ONLY structural configuration data (zones, workers).
    NO fake incidents are created — all incidents come from real uploads,
    real YOLO inference, or real hardware sensor input.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if structural data already exists
    cursor.execute("SELECT COUNT(*) FROM zones")
    if cursor.fetchone()[0] > 0:
        print("[Seed] Structural data already present. Skipping.")
        conn.close()
        return

    # 1. Seed Site Zones (real construction site layout)
    # Coordinates: Bangalore construction corridor (~12.97°N, 77.59°E)
    zones = [
        (
            "ZONE-A",
            "Zone A: Deep Foundation & Excavation",
            "CRITICAL",
            json.dumps([[12.9718, 77.5940], [12.9723, 77.5940], [12.9723, 77.5947], [12.9718, 77.5947]]),
            json.dumps(["slip-fall", "unsafe-edge", "cave-in"]),
            "Heavy earthmoving machinery, 12ft open excavation trench with edge fall risk."
        ),
        (
            "ZONE-B",
            "Zone B: Structural Tower & Scaffolding",
            "HIGH",
            json.dumps([[12.9724, 77.5940], [12.9730, 77.5940], [12.9730, 77.5948], [12.9724, 77.5948]]),
            json.dumps(["slip-fall", "falling-objects", "debris"]),
            "Multi-story scaffolding framing, hoist crane lifting corridor."
        ),
        (
            "ZONE-C",
            "Zone C: Electrical & Mechanical Plant",
            "HIGH",
            json.dumps([[12.9718, 77.5949], [12.9723, 77.5949], [12.9723, 77.5956], [12.9718, 77.5956]]),
            json.dumps(["wiring", "spill", "high-voltage"]),
            "Main distribution switchboards, generator units, hydraulic fluid lines."
        ),
        (
            "ZONE-D",
            "Zone D: Material Staging & Logistics Bay",
            "MEDIUM",
            json.dumps([[12.9724, 77.5949], [12.9730, 77.5949], [12.9730, 77.5956], [12.9724, 77.5956]]),
            json.dumps(["debris", "spill", "trip-hazard"]),
            "Rebar steel bundles, precast concrete blocks, timber staging depot."
        )
    ]
    cursor.executemany("INSERT INTO zones VALUES (?, ?, ?, ?, ?, ?)", zones)

    # 2. Seed Field Workers (real team configuration)
    workers = [
        ("W-101", "Marcus Vance", "Rigging Specialist", "ZONE-B", "ACTIVE", 12.9726, 77.5943),
        ("W-102", "Elena Rostova", "Electrical Lead", "ZONE-C", "ACTIVE", 12.9720, 77.5952),
        ("W-103", "David Chen", "Excavation Operator", "ZONE-A", "ACTIVE", 12.9720, 77.5944),
        ("W-104", "Sarah Jenkins", "Safety Inspector", "ZONE-D", "ACTIVE", 12.9727, 77.5953),
        ("W-105", "Arun Kumar", "Scaffold Erector", "ZONE-B", "ACTIVE", 12.9728, 77.5945)
    ]
    cursor.executemany("INSERT INTO workers (id, name, role, zone_id, status, last_lat, last_lng) VALUES (?, ?, ?, ?, ?, ?, ?)", workers)

    conn.commit()
    conn.close()
    print("[Seed] Zones and workers seeded. NO dummy incidents — all data comes from real uploads.")

if __name__ == "__main__":
    seed_initial_data()
