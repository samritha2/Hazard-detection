import 'package:flutter/foundation.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:path/path.dart' as p;
import '../models/incident_model.dart';

/// FR-1.3: Local Encrypted SQLite Database (SQLCipher AES-256)
/// Queues incident telemetry and photos securely when site is offline.
class OfflineStorageService {
  static const String _dbName = 'hazard_edge_encrypted.db';
  static const String _tableName = 'offline_incidents';
  
  // AES-256 encryption password key (in production injected via Secure Hardware Keystore)
  static const String _sqlCipherKey = 'HazardSense_AES256_SecKey_2026';

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDatabase();
    return _db!;
  }

  Future<Database> _initDatabase() async {
    final String databasesPath = await getDatabasesPath();
    final String path = p.join(databasesPath, _dbName);

    // Open encrypted SQLCipher database with 256-bit AES key
    return await openDatabase(
      path,
      password: _sqlCipherKey,
      version: 1,
      onCreate: (Database db, int version) async {
        await db.execute('''
          CREATE TABLE $_tableName (
            id TEXT PRIMARY KEY,
            worker_id TEXT NOT NULL,
            worker_name TEXT NOT NULL,
            zone_id TEXT,
            timestamp TEXT NOT NULL,
            severity TEXT NOT NULL,
            hazard_type TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            image_path TEXT,
            imu_telemetry TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'QUEUED',
            latency_ms REAL DEFAULT 0.0
          )
        ''');
      },
    );
  }

  /// Insert an incident into the encrypted offline queue
  Future<void> queueIncident(IncidentModel incident) async {
    final db = await database;
    await db.insert(
      _tableName,
      incident.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    if (kDebugMode) {
      print('💾 [OfflineStorage] Incident ${incident.id} queued in SQLCipher DB.');
    }
  }

  /// Retrieve all pending queued incidents
  Future<List<IncidentModel>> getQueuedIncidents() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      _tableName,
      where: 'status = ?',
      whereArgs: ['QUEUED'],
    );
    return maps.map((m) => IncidentModel.fromMap(m)).toList();
  }

  /// Mark incident as synced or delete from local queue
  Future<void> markAsSynced(String incidentId) async {
    final db = await database;
    await db.delete(
      _tableName,
      where: 'id = ?',
      whereArgs: [incidentId],
    );
  }

  /// Get total count of offline queued records
  Future<int> getQueuedCount() async {
    final db = await database;
    final result = await db.rawQuery(
      'SELECT COUNT(*) as count FROM $_tableName WHERE status = ?',
      ['QUEUED'],
    );
    return Sqflite.firstIntValue(result) ?? 0;
  }
}
