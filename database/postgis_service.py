"""
HazardSense Database Service: PostGIS Spatial Queries Module
SRS Compliance: FR-3.2 (Geospatial Mapping & Spatial Queries)
"""

import os
import json
from typing import List, Dict, Any, Optional

class PostGISService:
    """
    PostgreSQL + PostGIS spatial query engine for hazard geolocation,
    geofence detection, and proximity alerting.
    """

    def __init__(self, connection_url: Optional[str] = None):
        self.connection_url = connection_url or os.getenv(
            "DATABASE_URL", 
            "postgresql://postgres:postgres@localhost:5432/hazard_system"
        )

    def generate_insert_incident_query(
        self, incident_id: str, worker_id: str, worker_name: str,
        hazard_type: str, severity: str, lat: float, lng: float,
        timestamp: str, image_url: str, imu_telemetry: dict, detections: list,
        latency_ms: float
    ) -> tuple:
        """
        Generates parameterized SQL using ST_SetSRID(ST_Point(lng, lat), 4326)
        """
        sql = """
        INSERT INTO incidents (
            id, worker_id, worker_name, hazard_type, severity,
            location, timestamp, image_url, imu_telemetry, detections, latency_ms
        ) VALUES (
            %s, %s, %s, %s, %s,
            ST_SetSRID(ST_Point(%s, %s), 4326),
            %s, %s, %s, %s, %s
        ) RETURNING id;
        """
        params = (
            incident_id, worker_id, worker_name, hazard_type, severity,
            lng, lat, timestamp, image_url, json.dumps(imu_telemetry),
            json.dumps(detections), latency_ms
        )
        return sql, params

    def generate_proximity_query(self, worker_lng: float, worker_lat: float, radius_meters: float = 50.0) -> tuple:
        """
        FR-3.2: Finds all hazards within radius_meters using ST_DWithin and geography casting.
        """
        sql = """
        SELECT 
            id, hazard_type, severity, image_url,
            ST_Distance(location::geography, ST_SetSRID(ST_Point(%s, %s), 4326)::geography) AS distance_meters
        FROM incidents
        WHERE ST_DWithin(
            location::geography,
            ST_SetSRID(ST_Point(%s, %s), 4326)::geography,
            %s
        )
        AND status IN ('NEW', 'ACKNOWLEDGED')
        ORDER BY distance_meters ASC;
        """
        params = (worker_lng, worker_lat, worker_lng, worker_lat, radius_meters)
        return sql, params

    def generate_geofence_check_query(self, lng: float, lat: float) -> tuple:
        """
        FR-3.2: Determines which zone polygon contains the given coordinate point using ST_Contains.
        """
        sql = """
        SELECT id, name, risk_level, hazard_types
        FROM zones
        WHERE ST_Contains(
            polygon_boundary,
            ST_SetSRID(ST_Point(%s, %s), 4326)
        )
        LIMIT 1;
        """
        params = (lng, lat)
        return sql, params
