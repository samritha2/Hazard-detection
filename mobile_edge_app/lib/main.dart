import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:uuid/uuid.dart';

import 'models/incident_model.dart';
import 'services/camera_service.dart';
import 'services/offline_storage_service.dart';
import 'services/sensor_service.dart';
import 'services/sync_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // FR-1.4: Initialize background WorkManager sync
  SyncService.registerBackgroundSync();
  
  runApp(const HazardEdgeApp());
}

class HazardEdgeApp extends StatelessWidget {
  const HazardEdgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HazardSense Edge Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFFF453A),
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFF453A),
          secondary: Color(0xFF38BDF8),
          surface: Color(0xFF1E293B),
        ),
      ),
      home: const EdgeFieldWorkerScreen(),
    );
  }
}

class EdgeFieldWorkerScreen extends StatefulWidget {
  const EdgeFieldWorkerScreen({super.key});

  @override
  State<EdgeFieldWorkerScreen> createState() => _EdgeFieldWorkerScreenState();
}

class _EdgeFieldWorkerScreenState extends State<EdgeFieldWorkerScreen> {
  final SensorService _sensorService = SensorService();
  final CameraService _cameraService = CameraService();
  final OfflineStorageService _storageService = OfflineStorageService();
  final SyncService _syncService = SyncService();

  final String workerId = 'WRK-2026-08';
  final String workerName = 'Rajesh Kumar (Structural)';

  bool _isMonitoring = false;
  int _queuedCount = 0;
  String _statusMessage = 'System Ready - Standby';
  Map<String, double> _liveReadings = {'ax': 0.0, 'ay': 0.0, 'az': 9.81, 'svm': 9.81};
  Timer? _uiRefreshTimer;

  @override
  void initState() {
    super.initState();
    _initializeServices();
  }

  Future<void> _initializeServices() async {
    await _cameraService.initialize();
    _refreshQueuedCount();
    _startLiveMonitoring();
  }

  void _startLiveMonitoring() {
    setState(() {
      _isMonitoring = true;
      _statusMessage = '🟢 50 Hz Hardware Sensor Stream Active';
    });

    _sensorService.startListening(
      callback: ({required telemetry, required svm, required bool isFall}) async {
        await _handleAnomalyTrigger(telemetry, svm, isFall);
      },
    );

    // Refresh UI telemetry display every 100ms
    _uiRefreshTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (mounted) {
        setState(() {
          _liveReadings = _sensorService.currentReadings;
        });
      }
    });
  }

  Future<void> _handleAnomalyTrigger(
    Map<String, dynamic> telemetry,
    double svm,
    bool isFall,
  ) async {
    setState(() {
      _statusMessage = isFall 
          ? '🚨 CRITICAL: High-G Kinematic Fall Detected!' 
          : '⚠️ WARNING: Kinematic Shock Detected (SVM: ${svm.toStringAsFixed(1)} m/s²)';
    });

    // FR-2.1: Zero-Touch Camera Snapshot Trigger
    final String? snapshotPath = await _cameraService.captureContextSnapshot();

    // Fetch live GPS coordinates
    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 3),
      );
    } catch (_) {
      // Default to construction site center if GPS times out
    }

    final double lat = position?.latitude ?? 12.971598;
    final double lng = position?.longitude ?? 77.594566;

    final incident = IncidentModel(
      id: 'INC-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
      workerId: workerId,
      workerName: workerName,
      zoneId: 'ZONE-A-FOUNDATION',
      timestamp: DateTime.now().toIso8601String(),
      severity: isFall ? 'CRITICAL' : 'HIGH',
      hazardType: isFall ? 'slip-fall' : 'kinetic-shock',
      latitude: lat,
      longitude: lng,
      imagePath: snapshotPath,
      imuTelemetry: telemetry,
    );

    // FR-1.3: Store in encrypted SQLCipher DB
    await _storageService.queueIncident(incident);
    await _refreshQueuedCount();

    // FR-1.4: Auto-sync immediately if network is available
    final synced = await _syncService.syncAllQueuedIncidents();
    if (synced > 0) {
      await _refreshQueuedCount();
      setState(() {
        _statusMessage = '🚀 Incident uploaded & broadcasted to Safety Dashboard!';
      });
    } else {
      setState(() {
        _statusMessage = '💾 Offline: Incident encrypted & queued in SQLCipher.';
      });
    }
  }

  Future<void> _refreshQueuedCount() async {
    final count = await _storageService.getQueuedCount();
    if (mounted) {
      setState(() {
        _queuedCount = count;
      });
    }
  }

  @override
  void dispose() {
    _sensorService.stopListening();
    _cameraService.dispose();
    _uiRefreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final svm = _liveReadings['svm'] ?? 9.81;
    final isAlert = svm > 25.0;

    return Scaffold(
      appBar: AppBar(
        title: const Text('HazardSense Edge Sentinel', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Manual Cloud Sync',
            onPressed: () async {
              final count = await _syncService.syncAllQueuedIncidents();
              await _refreshQueuedCount();
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Synced $count queued incidents to cloud.')),
              );
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isAlert ? const Color(0xFF7F1D1D) : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isAlert ? const Color(0xFFEF4444) : const Color(0xFF334155),
                  width: 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        isAlert ? Icons.warning_rounded : Icons.sensors,
                        color: isAlert ? const Color(0xFFEF4444) : const Color(0xFF38BDF8),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Worker: $workerName',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(_statusMessage, style: const TextStyle(fontSize: 14, color: Color(0xFF94A3B8))),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Live Telemetry Cards (FR-1.1 & FR-1.2)
            Card(
              color: const Color(0xFF1E293B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('IMU Telemetry (50 Hz Polling)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _metricTile('Ax', '${_liveReadings['ax']?.toStringAsFixed(2)} m/s²'),
                        _metricTile('Ay', '${_liveReadings['ay']?.toStringAsFixed(2)} m/s²'),
                        _metricTile('Az', '${_liveReadings['az']?.toStringAsFixed(2)} m/s²'),
                      ],
                    ),
                    const Divider(color: Color(0xFF334155), height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _metricTile('SVM (Magnitude)', '${svm.toStringAsFixed(2)} m/s²', highlight: true),
                        _metricTile('Offline Queue', '$_queuedCount items', highlight: _queuedCount > 0),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Simulation Trigger Button for Demo
            ElevatedButton.icon(
              onPressed: () {
                // Simulate physical fall shock impact (> 30 m/s²)
                _sensorService.calculateSVM(12.0, 18.0, 24.0);
                _handleAnomalyTrigger(
                  {'ax': 12.5, 'ay': 18.2, 'az': 24.1, 'gx': 1.2, 'gy': 3.4, 'gz': 0.8, 'svm': 32.8},
                  32.8,
                  true,
                );
              },
              icon: const Icon(Icons.bolt, color: Colors.white),
              label: const Text('Simulate Physical Fall Trigger', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFDC2626),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metricTile(String title, String value, {bool highlight = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: highlight ? const Color(0xFF38BDF8) : Colors.white,
          ),
        ),
      ],
    );
  }
}
