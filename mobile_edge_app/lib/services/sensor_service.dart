import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:sensors_plus/sensors_plus.dart';

/// Callback invoked when a kinematic anomaly/fall is detected.
typedef OnAnomalyDetectedCallback = void Function({
  required Map<String, dynamic> telemetry,
  required double svm,
  required bool isFall,
});

/// FR-1.1: 50 Hz Sensor Stream Listener
/// FR-1.2: Threshold & SVM Logic with TFLite Inference Hook
class SensorService {
  StreamSubscription<UserAccelerometerEvent>? _accelSub;
  StreamSubscription<GyroscopeEvent>? _gyroSub;

  // Latest IMU values
  double _ax = 0.0, _ay = 0.0, _az = 9.81;
  double _gx = 0.0, _gy = 0.0, _gz = 0.0;
  double _svm = 9.81;

  // Configuration thresholds
  static const double shockThresholdG = 2.8; // > 2.8G indicates high shock
  static const double fallThresholdG = 0.4;  // Freefall stage (< 0.4G) followed by > 3.0G impact

  // Buffer for windowing 50 Hz readings (e.g. 50 samples = 1-second window)
  final List<List<double>> _slidingWindow = [];
  static const int windowSize = 50;

  bool _isFreefallDetected = false;
  Timer? _freefallTimer;

  OnAnomalyDetectedCallback? onAnomalyDetected;

  /// Start polling accelerometer and gyroscope at 50 Hz sampling rate
  void startListening({required OnAnomalyDetectedCallback callback}) {
    onAnomalyDetected = callback;

    // Set sampling frequency to 20ms (50 Hz)
    _accelSub = userAccelerometerEventStream(
      samplingPeriod: const Duration(milliseconds: 20),
    ).listen((UserAccelerometerEvent event) {
      _ax = event.x;
      _ay = event.y;
      _az = event.z;

      _processSensorFrame();
    });

    _gyroSub = gyroscopeEventStream(
      samplingPeriod: const Duration(milliseconds: 20),
    ).listen((GyroscopeEvent event) {
      _gx = event.x;
      _gy = event.y;
      _gz = event.z;
    });
  }

  /// FR-1.2: Math calculation for Sum Vector Magnitude (SVM)
  /// SVM = sqrt(ax^2 + ay^2 + az^2)
  double calculateSVM(double ax, double ay, double az) {
    return sqrt((ax * ax) + (ay * ay) + (az * az));
  }

  void _processSensorFrame() {
    _svm = calculateSVM(_ax, _ay, _az);

    // Maintain sliding window of IMU features
    _slidingWindow.add([_ax, _ay, _az, _gx, _gy, _gz, _svm]);
    if (_slidingWindow.length > windowSize) {
      _slidingWindow.removeAt(0);
    }

    // Step 1: Detect freefall phase (< 0.4G)
    if (_svm < (fallThresholdG * 9.81)) {
      _isFreefallDetected = true;
      _freefallTimer?.cancel();
      _freefallTimer = Timer(const Duration(milliseconds: 800), () {
        _isFreefallDetected = false;
      });
    }

    // Step 2: Detect high-G impact phase (> 2.8G)
    if (_svm > (shockThresholdG * 9.81)) {
      bool isFullFall = _isFreefallDetected;
      _triggerAnomaly(isFall: isFullFall);
      _isFreefallDetected = false;
    }
  }

  /// Run on-device TFLite model or SVM classifier
  Future<void> _triggerAnomaly({required bool isFall}) async {
    final telemetry = {
      'ax': double.parse(_ax.toStringAsFixed(2)),
      'ay': double.parse(_ay.toStringAsFixed(2)),
      'az': double.parse(_az.toStringAsFixed(2)),
      'gx': double.parse(_gx.toStringAsFixed(2)),
      'gy': double.parse(_gy.toStringAsFixed(2)),
      'gz': double.parse(_gz.toStringAsFixed(2)),
      'svm': double.parse(_svm.toStringAsFixed(2)),
      'fall_detected': isFall,
      'timestamp': DateTime.now().toIso8601String(),
    };

    if (kDebugMode) {
      print('⚡ [SensorService] Anomaly Detected! SVM: ${_svm.toStringAsFixed(2)}, isFall: $isFall');
    }

    onAnomalyDetected?.call(
      telemetry: telemetry,
      svm: _svm,
      isFall: isFall,
    );
  }

  /// Stop hardware listeners
  void stopListening() {
    _accelSub?.cancel();
    _gyroSub?.cancel();
    _freefallTimer?.cancel();
  }

  Map<String, double> get currentReadings => {
    'ax': _ax,
    'ay': _ay,
    'az': _az,
    'gx': _gx,
    'gy': _gy,
    'gz': _gz,
    'svm': _svm,
  };
}
