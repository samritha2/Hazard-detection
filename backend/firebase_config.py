import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

BACKEND_DIR = Path(__file__).resolve().parent
KEY_PATH = BACKEND_DIR / "serviceAccountKey.json"

_firestore_db = None
_firebase_initialized = False

def init_firebase():
    global _firestore_db, _firebase_initialized
    if _firebase_initialized:
        return _firestore_db

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if KEY_PATH.exists():
            print(f"[FIREBASE] Found credentials at: {KEY_PATH}")
            cred = credentials.Certificate(str(KEY_PATH))
            firebase_admin.initialize_app(cred)
            _firestore_db = firestore.client()
            _firebase_initialized = True
            print("[FIREBASE] ✅ Successfully connected to Google Cloud Firestore!")
        elif os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
            cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            print(f"[FIREBASE] Using GOOGLE_APPLICATION_CREDENTIALS at: {cred_path}")
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firestore_db = firestore.client()
            _firebase_initialized = True
            print("[FIREBASE] ✅ Successfully connected to Google Cloud Firestore!")
        else:
            print("[FIREBASE] ℹ️ 'serviceAccountKey.json' not found. Operating in local persistent SQLite mode with Firebase readiness.")
            _firebase_initialized = False
    except Exception as e:
        print(f"[FIREBASE ERROR]: {e}")
        _firebase_initialized = False

    return _firestore_db

def is_firebase_active() -> bool:
    return _firebase_initialized and _firestore_db is not None

def save_incident_to_firestore(incident_dict: Dict[str, Any]) -> bool:
    """Saves or updates an incident document directly in Cloud Firestore."""
    if not is_firebase_active():
        return False
    try:
        doc_id = incident_dict.get("id")
        doc_ref = _firestore_db.collection("incidents").document(doc_id)
        doc_ref.set(incident_dict, merge=True)
        print(f"[FIREBASE] Synced document {doc_id} to Cloud Firestore 'incidents' collection.")
        return True
    except Exception as e:
        print(f"[FIREBASE SYNC ERROR]: {e}")
        return False

def update_incident_status_in_firestore(incident_id: str, status: str, notes: Optional[str] = None) -> bool:
    """Updates incident status in Cloud Firestore."""
    if not is_firebase_active():
        return False
    try:
        doc_ref = _firestore_db.collection("incidents").document(incident_id)
        update_data = {"status": status}
        if notes:
            update_data["notes"] = notes
        doc_ref.update(update_data)
        print(f"[FIREBASE] Updated status of {incident_id} to {status} in Cloud Firestore.")
        return True
    except Exception as e:
        print(f"[FIREBASE UPDATE ERROR]: {e}")
        return False

def get_firestore_incidents(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves incidents list directly from Cloud Firestore."""
    if not is_firebase_active():
        return []
    try:
        docs = _firestore_db.collection("incidents").order_by("timestamp", direction="DESCENDING").limit(limit).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        print(f"[FIREBASE FETCH ERROR]: {e}")
        return []

# Initialize on import
init_firebase()
