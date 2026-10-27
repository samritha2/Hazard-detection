import time
import requests
import subprocess
import RPi.GPIO as GPIO
import os

# --- Configuration ---
# REPLACE <YOUR_LAPTOP_IP> with the Wi-Fi IP of the Windows laptop running the FastAPI server.
# Ensure the laptop firewall allows port 8000.
SERVER_URL = "http://10.43.53.162:8000/api/incidents/upload-media"

WORKER_ID = "RPI-WORKER-01"
WORKER_NAME = "Raspberry Pi Cam Node"
ZONE_ID = "ZONE-A"
# Default coordinates (can be updated later with real GPS)
LATITUDE = 12.9722
LONGITUDE = 77.5945

# --- GPIO Setup ---
LED_RED = 17
LED_YELLOW = 27
LED_GREEN = 22
BUZZER = 23 # Update with your chosen GPIO pin for the buzzer

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)

# Initialize pins
for pin in [LED_RED, LED_YELLOW, LED_GREEN, BUZZER]:
    GPIO.setup(pin, GPIO.OUT)
    GPIO.output(pin, GPIO.LOW)

def capture_image(filename="capture.jpg"):
    print("[RPI] Capturing image...")
    # Using rpicam-still for libcamera (v2 camera module)
    cmd = [
        "rpicam-still",
        "-t", "100", # very fast capture
        "-o", filename,
        "--width", "640",
        "--height", "480",
        "--nopreview"
    ]
    # Suppress output so it doesn't flood the terminal
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return filename

def upload_image(filename):
    print(f"[RPI] Uploading {filename} to {SERVER_URL}...")
    try:
        with open(filename, 'rb') as f:
            files = {'file': (filename, f, 'image/jpeg')}
            data = {
                'worker_id': WORKER_ID,
                'worker_name': WORKER_NAME,
                'zone_id': ZONE_ID,
                'latitude': LATITUDE,
                'longitude': LONGITUDE
            }
            response = requests.post(SERVER_URL, files=files, data=data, timeout=10)
            return response.json()
    except requests.exceptions.RequestException as e:
        print(f"[RPI] Upload failed: {e}")
        return None

def handle_response(result):
    if not result:
        # Error state - turn on yellow
        GPIO.output(LED_GREEN, GPIO.LOW)
        GPIO.output(LED_RED, GPIO.LOW)
        GPIO.output(LED_YELLOW, GPIO.HIGH)
        GPIO.output(BUZZER, GPIO.LOW)
        return

    status = result.get("status")
    print(f"[RPI] Server response: {status}")
    
    if status == "HAZARD_DETECTED":
        # Danger - Red LED + Buzzer Beep
        GPIO.output(LED_GREEN, GPIO.LOW)
        GPIO.output(LED_YELLOW, GPIO.LOW)
        GPIO.output(LED_RED, GPIO.HIGH)
        
        # Trigger buzzer
        GPIO.output(BUZZER, GPIO.HIGH)
        time.sleep(0.5) 
        GPIO.output(BUZZER, GPIO.LOW)
        
    elif status == "SAFE":
        # Safe - Green LED
        GPIO.output(LED_RED, GPIO.LOW)
        GPIO.output(LED_YELLOW, GPIO.LOW)
        GPIO.output(LED_GREEN, GPIO.HIGH)
        GPIO.output(BUZZER, GPIO.LOW)
    else:
        # Unknown/Processing
        GPIO.output(LED_GREEN, GPIO.LOW)
        GPIO.output(LED_RED, GPIO.LOW)
        GPIO.output(LED_YELLOW, GPIO.HIGH)
        GPIO.output(BUZZER, GPIO.LOW)

def main():
    print("==========================================")
    print(" HALVF Edge Deployment Node (Raspberry Pi)")
    print("==========================================")
    
    # Blink Green LED to show we are running
    GPIO.output(LED_GREEN, GPIO.HIGH)
    time.sleep(1)
    GPIO.output(LED_GREEN, GPIO.LOW)
    
    try:
        while True:
            image_file = capture_image()
            if os.path.exists(image_file):
                result = upload_image(image_file)
                handle_response(result)
            else:
                print("[RPI] Error: Image capture failed.")
            
            # Wait a few seconds before next capture to avoid spamming the server
            time.sleep(3)
            
    except KeyboardInterrupt:
        print("\n[RPI] Stopping deployment node...")
    finally:
        GPIO.cleanup()

if __name__ == "__main__":
    main()
