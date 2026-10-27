# HazardSense Edge Mobile Application (Flutter / Dart)

Edge mobile client implementing real-time sensor processing, on-device anomaly classification, zero-touch camera capture, encrypted offline queuing, and background synchronization.

---

## 📱 SRS Feature & Requirement Mapping

| SRS Req | Module / Component | Implementation Details |
| :--- | :--- | :--- |
| **FR-1.1** | **50 Hz Sensor Stream Listener** | [`lib/services/sensor_service.dart`](lib/services/sensor_service.dart) polls 3-axis accelerometer and gyroscope ($a_x, a_y, a_z, g_x, g_y, g_z$) every 20ms using `sensors_plus`. |
| **FR-1.2** | **Threshold & SVM Logic** | Calculates Sum Vector Magnitude ($SVM = \sqrt{a_x^2 + a_y^2 + a_z^2}$) and evaluates two-stage freefall/impact thresholds and TFLite inference hook. |
| **FR-2.1** | **Zero-Touch Camera Trigger** | [`lib/services/camera_service.dart`](lib/services/camera_service.dart) initializes the back lens in standby to automatically snap a context image upon kinematic shock detection without manual worker interaction. |
| **FR-1.3** | **Offline Storage (SQLCipher AES-256)** | [`lib/services/offline_storage_service.dart`](lib/services/offline_storage_service.dart) securely encrypts and queues incidents locally when network is unavailable. |
| **FR-1.4** | **Background Auto-Sync** | [`lib/services/sync_service.dart`](lib/services/sync_service.dart) utilizes `workmanager` to sync queued incidents and cached photos to the FastAPI backend upon 4G/Wi-Fi reconnection. |

---

## 🚀 Running the Flutter App

### Prerequisites
- Flutter SDK (>= 3.0.0)
- Android Studio / VS Code with Flutter extension
- Android Device or Emulator connected

### Commands
```bash
# 1. Navigate to directory
cd mobile_edge_app

# 2. Install dependencies
flutter pub get

# 3. Run on connected Android device / emulator
flutter run
```
