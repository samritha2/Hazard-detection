import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:workmanager/workmanager.dart';
import '../models/incident_model.dart';
import 'offline_storage_service.dart';

const String syncTaskKey = "com.hazardsense.syncQueueTask";

/// Background task callback dispatcher for WorkManager
@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (kDebugMode) print("🔄 [WorkManager] Running background sync task: $task");
    final syncService = SyncService();
    final int syncedCount = await syncService.syncAllQueuedIncidents();
    if (kDebugMode) print("✅ [WorkManager] Synced $syncedCount queued incidents in background.");
    return Future.value(true);
  });
}

/// FR-1.4: Background WorkManager Auto-Sync Service
class SyncService {
  final OfflineStorageService _storageService = OfflineStorageService();
  
  // Backend FastAPI base endpoint URL
  final String apiBaseUrl;

  SyncService({this.apiBaseUrl = "http://10.0.2.2:8000"}); // 10.0.2.2 for Android Emulator / localhost

  /// Register periodic and one-off background sync workers
  static void registerBackgroundSync() {
    Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );

    // Register periodic auto-sync every 15 minutes
    Workmanager().registerPeriodicTask(
      "periodic-hazard-sync",
      syncTaskKey,
      frequency: const Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }

  /// Trigger immediate sync (e.g. when network reconnects or on anomaly)
  Future<int> syncAllQueuedIncidents() async {
    final List<IncidentModel> queued = await _storageService.getQueuedIncidents();
    if (queued.isEmpty) return 0;

    int successCount = 0;

    for (final incident in queued) {
      bool success = await _uploadSingleIncident(incident);
      if (success) {
        await _storageService.markAsSynced(incident.id);
        successCount++;
      }
    }

    return successCount;
  }

  /// Upload single incident payload (Multi-part with image file + form fields)
  Future<bool> _uploadSingleIncident(IncidentModel incident) async {
    try {
      final uri = Uri.parse("$apiBaseUrl/api/incidents/upload");
      final request = http.MultipartRequest("POST", uri);

      request.fields['id'] = incident.id;
      request.fields['worker_id'] = incident.workerId;
      request.fields['worker_name'] = incident.workerName;
      if (incident.zoneId != null) request.fields['zone_id'] = incident.zoneId!;
      request.fields['hazard_type'] = incident.hazardType;
      request.fields['severity'] = incident.severity;
      request.fields['latitude'] = incident.latitude.toString();
      request.fields['longitude'] = incident.longitude.toString();
      request.fields['timestamp'] = incident.timestamp;
      request.fields['imu_telemetry'] = jsonEncode(incident.imuTelemetry);

      // Attach snapshot image if present
      if (incident.imagePath != null && File(incident.imagePath!).existsSync()) {
        request.files.add(
          await http.MultipartFile.fromPath('file', incident.imagePath!),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200 || response.statusCode == 201) {
        if (kDebugMode) print("🚀 [SyncService] Incident ${incident.id} uploaded successfully.");
        return true;
      } else {
        if (kDebugMode) {
          print("⚠️ [SyncService] Upload failed for ${incident.id}: ${response.statusCode} - ${response.body}");
        }
        return false;
      }
    } catch (e) {
      if (kDebugMode) print("❌ [SyncService] Network error during upload: $e");
      return false;
    }
  }
}
