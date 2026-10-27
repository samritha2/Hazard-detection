-- ============================================================================
-- DATABASE ARCHITECTURE: PostgreSQL + PostGIS Spatial Schema
-- System: HazardSense Construction Site Cross-Modal Safety System
-- SRS Compliance: FR-3.2 (Geospatial Mapping & Spatial Queries)
-- Coordinate Reference System: EPSG:4326 (WGS 84 GPS Standard)
-- ============================================================================

-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. SPATIAL TABLE: Zones (Geofenced Risk Sectors)
-- ============================================================================
CREATE TABLE IF NOT EXISTS zones (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    risk_level VARCHAR(32) NOT NULL CHECK (risk_level IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    polygon_boundary GEOMETRY(Polygon, 4326) NOT NULL, -- EPSG:4326 Spatial Polygon
    hazard_types TEXT[] NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index (GiST) for fast polygon containment queries
CREATE INDEX IF NOT EXISTS idx_zones_polygon_boundary ON zones USING GIST (polygon_boundary);

-- ============================================================================
-- 3. SPATIAL TABLE: Workers (Field Personnel & Real-Time Telemetry)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(128) NOT NULL,
    zone_id VARCHAR(64) REFERENCES zones(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IDLE', 'ALERT', 'OFFLINE')),
    last_location GEOMETRY(Point, 4326), -- EPSG:4326 GPS Location (Longitude, Latitude)
    last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index (GiST) for fast worker location queries
CREATE INDEX IF NOT EXISTS idx_workers_last_location ON workers USING GIST (last_location);

-- ============================================================================
-- 4. SPATIAL TABLE: Incidents (Hazard & Kinematic Anomaly Events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(64) PRIMARY KEY,
    worker_id VARCHAR(64) REFERENCES workers(id) ON DELETE SET NULL,
    worker_name VARCHAR(255),
    zone_id VARCHAR(64) REFERENCES zones(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    severity VARCHAR(32) NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
    status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED')),
    hazard_type VARCHAR(64) NOT NULL, -- e.g., spill, wiring, debris, unsafe-edge, slip-fall, missing-ppe
    location GEOMETRY(Point, 4326) NOT NULL, -- Point(lng, lat)
    image_url TEXT,
    imu_telemetry JSONB, -- {ax, ay, az, gx, gy, gz, svm, fall_detected: bool}
    detections JSONB,    -- [{label, confidence, bbox: [x,y,w,h], severity}]
    latency_ms REAL,     -- Edge-to-cloud notification latency (NFR-2)
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Index (GiST) for proximity & clustering queries
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents (timestamp DESC);

-- ============================================================================
-- 5. TABLE: Sync Logs (Offline Queue & Batch Synchronizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(64) NOT NULL,
    synced_count INTEGER NOT NULL,
    sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    batch_metadata JSONB
);

-- ============================================================================
-- 6. PRODUCTION POSTGIS SPATIAL QUERIES (FR-3.2)
-- ============================================================================

-- Query A: Check if a worker or incident location falls inside a danger zone (Geofence Check)
-- Function: ST_Contains(polygon, point) or ST_Within(point, polygon)
CREATE OR REPLACE FUNCTION get_zone_for_point(lng DOUBLE PRECISION, lat DOUBLE PRECISION)
RETURNS TABLE (zone_id VARCHAR, zone_name VARCHAR, risk_level VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT z.id, z.name, z.risk_level
    FROM zones z
    WHERE ST_Contains(z.polygon_boundary, ST_SetSRID(ST_Point(lng, lat), 4326))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Query B: Find all active hazards within a radius (e.g. 50 meters) of a worker (Proximity Alert)
-- Function: ST_DWithin with geography casting for true meter distances
CREATE OR REPLACE FUNCTION get_hazards_near_worker(
    worker_lng DOUBLE PRECISION, 
    worker_lat DOUBLE PRECISION, 
    radius_meters DOUBLE PRECISION DEFAULT 50.0
)
RETURNS TABLE (
    incident_id VARCHAR,
    hazard_type VARCHAR,
    severity VARCHAR,
    distance_meters DOUBLE PRECISION,
    image_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.id AS incident_id,
        i.hazard_type,
        i.severity,
        ST_Distance(
            i.location::geography, 
            ST_SetSRID(ST_Point(worker_lng, worker_lat), 4326)::geography
        ) AS distance_meters,
        i.image_url
    FROM incidents i
    WHERE ST_DWithin(
        i.location::geography, 
        ST_SetSRID(ST_Point(worker_lng, worker_lat), 4326)::geography, 
        radius_meters
    )
    AND i.status IN ('NEW', 'ACKNOWLEDGED')
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;

-- Query C: Calculate Hazard Heatmap Density Clusters (Spatial Grouping)
CREATE OR REPLACE VIEW v_hazard_spatial_clusters AS
SELECT 
    z.id AS zone_id,
    z.name AS zone_name,
    z.risk_level,
    COUNT(i.id) AS total_incidents,
    COUNT(CASE WHEN i.severity = 'CRITICAL' THEN 1 END) AS critical_count,
    COUNT(CASE WHEN i.severity = 'HIGH' THEN 1 END) AS high_count,
    ST_Centroid(ST_Union(i.location)) AS cluster_center_point
FROM zones z
LEFT JOIN incidents i ON ST_Contains(z.polygon_boundary, i.location)
GROUP BY z.id, z.name, z.risk_level;
