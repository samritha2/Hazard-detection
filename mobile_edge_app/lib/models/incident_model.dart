import 'dart:convert';

/// Data model representing an edge-detected anomaly/incident.
class IncidentModel {
  final String id;
  final String workerId;
  final String workerName;
  final String? zoneId;
  final String timestamp;
  final String severity; // CRITICAL, HIGH, MEDIUM, LOW
  final String hazardType; // slip-fall, shock, missing-ppe, etc.
  final double latitude;
  final double longitude;
  final String? imagePath;
  final Map<String, dynamic> imuTelemetry; // ax, ay, az, gx, gy, gz, svm
  final String status; // QUEUED, SYNCED
  final double latencyMs;

  IncidentModel({
    required this.id,
    required this.workerId,
    required this.workerName,
    this.zoneId,
    required this.timestamp,
    required this.severity,
    required this.hazardType,
    required this.latitude,
    required this.longitude,
    this.imagePath,
    required this.imuTelemetry,
    this.status = 'QUEUED',
    this.latencyMs = 0.0,
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'worker_id': workerId,
      'worker_name': workerName,
      'zone_id': zoneId,
      'timestamp': timestamp,
      'severity': severity,
      'hazard_type': hazardType,
      'latitude': latitude,
      'longitude': longitude,
      'image_path': imagePath,
      'imu_telemetry': jsonEncode(imuTelemetry),
      'status': status,
      'latency_ms': latencyMs,
    };
  }

  factory IncidentModel.fromMap(Map<String, dynamic> map) {
    return IncidentModel(
      id: map['id'],
      workerId: map['worker_id'],
      workerName: map['worker_name'] ?? 'Worker',
      zoneId: map['zone_id'],
      timestamp: map['timestamp'],
      severity: map['severity'],
      hazardType: map['hazard_type'],
      latitude: (map['latitude'] as num).toDouble(),
      longitude: (map['longitude'] as num).toDouble(),
      imagePath: map['image_path'],
      imuTelemetry: map['imu_telemetry'] is String
          ? jsonDecode(map['imu_telemetry'])
          : Map<String, dynamic>.from(map['imu_telemetry'] ?? {}),
      status: map['status'] ?? 'QUEUED',
      latencyMs: (map['latency_ms'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
