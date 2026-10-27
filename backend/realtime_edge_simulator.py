import time
import requests
import random
from datetime import datetime, timezone

API_URL = "http://localhost:8000/api/incidents/hardware-imu"

def simulate_imu():
    print("[*] Starting Real-time Edge Simulator for IMU Telemetry")
    while True:
        try:
            time.sleep(5)
            # Simulate normal IMU data
            payload = {
                "device_id": "W-101",
                "ax": random.uniform(-1, 1),
                "ay": random.uniform(-1, 1),
                "az": random.uniform(9.0, 10.5),
                "gx": random.uniform(-0.1, 0.1),
                "gy": random.uniform(-0.1, 0.1),
                "gz": random.uniform(-0.1, 0.1),
                "fall_detected": False,
                "latitude": 12.9727,
                "longitude": 77.5944
            }
            
            # Occasionally simulate a fall
            if random.random() < 0.1:
                print("[!] Simulating FALL DETECTED")
                payload["ax"] = random.uniform(20.0, 30.0)
                payload["fall_detected"] = True
                
            response = requests.post(API_URL, json=payload)
            print(f"[OK] Sent IMU telemetry: {response.json().get('status')}")
            
        except Exception as e:
            print(f"[ERROR] Failed to send telemetry: {e}")
            time.sleep(2)

if __name__ == "__main__":
    simulate_imu()
