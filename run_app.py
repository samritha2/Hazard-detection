"""
Cross-Modal Construction Site Hazard Detection System - Master Runner
Starts both the FastAPI Backend (Port 8000) and Vite React Dashboard (Port 5173).
"""

import subprocess
import sys
import time
import os
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def main():
    print("=" * 70)
    print("  HAZARDSENSE: Cross-Modal Construction Hazard Detection System")
    print("  IEEE 830-1998 Compliant Architecture")
    print("=" * 70)
    print("\n[1/2] Starting FastAPI Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=str(BACKEND_DIR)
    )

    time.sleep(2)

    print("\n[2/2] Starting React Dashboard on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", "5173", "--directory", "dist"],
        cwd=str(FRONTEND_DIR)
    )

    print("\n" + "=" * 70)
    print("  [OK] FULL-STACK APPLICATION IS RUNNING!")
    print("  -> Safety Dashboard:  http://localhost:5173")
    print("  -> FastAPI Swagger:   http://localhost:8000/docs")
    print("  -> Live WebSocket:    ws://localhost:8000/ws/live-feed")
    print("=" * 70)
    print("\nPress Ctrl+C in this terminal to stop both servers.")

    try:
        backend_proc.wait()
        if frontend_proc:
            frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
