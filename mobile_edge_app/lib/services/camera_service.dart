import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

/// FR-2.1: Zero-Touch Camera Trigger
/// Lockless camera service that captures an instant context snapshot on anomaly.
class CameraService {
  CameraController? _controller;
  List<CameraDescription> _cameras = [];
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Initialize the camera in background/standby mode
  Future<void> initialize() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        if (kDebugMode) print('⚠️ [CameraService] No physical camera found.');
        return;
      }

      // Default to back-facing camera
      final camera = _cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => _cameras.first,
      );

      _controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );

      await _controller!.initialize();
      _isInitialized = true;
      if (kDebugMode) print('📸 [CameraService] Camera initialized in standby.');
    } catch (e) {
      if (kDebugMode) print('❌ [CameraService] Error initializing camera: $e');
    }
  }

  /// Zero-touch instantaneous capture upon anomaly detection
  Future<String?> captureContextSnapshot() async {
    if (!_isInitialized || _controller == null || !_controller!.value.isInitialized) {
      if (kDebugMode) print('⚠️ [CameraService] Camera not ready for capture.');
      return null;
    }

    try {
      final XFile image = await _controller!.takePicture();
      
      // Store in application documents directory
      final Directory docDir = await getApplicationDocumentsDirectory();
      final String snapshotName = 'snap_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final String savedPath = p.join(docDir.path, snapshotName);

      final File savedFile = await File(image.path).copy(savedPath);
      if (kDebugMode) print('✅ [CameraService] Snapshot captured at: ${savedFile.path}');
      return savedFile.path;
    } catch (e) {
      if (kDebugMode) print('❌ [CameraService] Snapshot capture failed: $e');
      return null;
    }
  }

  void dispose() {
    _controller?.dispose();
    _isInitialized = false;
  }
}
