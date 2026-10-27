"""
HALVF - Real Hardware IMU Reader for GY-91 (MPU9250)
====================================================
Reads accelerometer (ax, ay, az) and gyroscope (gx, gy, gz)
from the GY-91 module connected via I2C on the Raspberry Pi.

Wiring (GY-91 to Raspberry Pi):
  VCC  -> Pin 1 (3.3V)
  GND  -> Pin 6 (GND)
  SDA  -> Pin 3 (GPIO 2 / SDA)
  SCL  -> Pin 5 (GPIO 3 / SCL)

Fall Detection Logic:
  - Computes total G-force magnitude = sqrt(ax^2 + ay^2 + az^2)
  - Normal standing/sitting: ~1.0g
  - Fall impact spike: > 2.5g followed by near-zero (freefall)
  - If magnitude > FALL_THRESHOLD or < FREEFALL_THRESHOLD -> FALL DETECTED
"""

import time
import struct
import requests
import RPi.GPIO as GPIO

# --- Configuration ---
SERVER_URL = "http://10.43.53.162:8000/api/incidents/hardware-imu"
DEVICE_ID = "GY91-IMU-01"
LATITUDE = 12.9722
LONGITUDE = 77.5945

# Fall detection thresholds (in g-force)
FALL_IMPACT_THRESHOLD = 2.5   # Sudden impact spike
FREEFALL_THRESHOLD = 0.4      # Near-zero g during freefall
FALL_COOLDOWN = 5             # Seconds between fall alerts

# GPIO for buzzer/LED feedback
BUZZER = 23
LED_RED = 17

# --- MPU9250 I2C Registers ---
MPU9250_ADDR = 0x68  # Default I2C address
PWR_MGMT_1 = 0x6B
ACCEL_XOUT_H = 0x3B
GYRO_XOUT_H = 0x43
ACCEL_CONFIG = 0x1C
GYRO_CONFIG = 0x1B

# Sensitivity scale factors
ACCEL_SCALE = 16384.0  # +/- 2g range
GYRO_SCALE = 131.0     # +/- 250 deg/s range


def init_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    for pin in [BUZZER, LED_RED]:
        GPIO.setup(pin, GPIO.OUT)
        GPIO.output(pin, GPIO.LOW)


def init_mpu9250(bus):
    """Wake up the MPU9250 and configure accelerometer/gyroscope."""
    # Wake up (clear sleep bit)
    bus.write_byte_data(MPU9250_ADDR, PWR_MGMT_1, 0x00)
    time.sleep(0.1)
    # Set accelerometer to +/- 2g
    bus.write_byte_data(MPU9250_ADDR, ACCEL_CONFIG, 0x00)
    # Set gyroscope to +/- 250 deg/s
    bus.write_byte_data(MPU9250_ADDR, GYRO_CONFIG, 0x00)
    time.sleep(0.1)
    print("[IMU] MPU9250 initialized successfully.")


def read_raw_data(bus, addr):
    """Read 2 bytes (high + low) and return signed 16-bit value."""
    high = bus.read_byte_data(MPU9250_ADDR, addr)
    low = bus.read_byte_data(MPU9250_ADDR, addr + 1)
    value = (high << 8) | low
    if value > 32768:
        value = value - 65536
    return value


def read_accel_gyro(bus):
    """Read accelerometer and gyroscope values, return in g and deg/s."""
    ax = read_raw_data(bus, ACCEL_XOUT_H) / ACCEL_SCALE
    ay = read_raw_data(bus, ACCEL_XOUT_H + 2) / ACCEL_SCALE
    az = read_raw_data(bus, ACCEL_XOUT_H + 4) / ACCEL_SCALE

    gx = read_raw_data(bus, GYRO_XOUT_H) / GYRO_SCALE
    gy = read_raw_data(bus, GYRO_XOUT_H + 2) / GYRO_SCALE
    gz = read_raw_data(bus, GYRO_XOUT_H + 4) / GYRO_SCALE

    return ax, ay, az, gx, gy, gz


def detect_fall(ax, ay, az):
    """Simple fall detection based on G-force magnitude."""
    magnitude = (ax**2 + ay**2 + az**2) ** 0.5
    # Fall = either a big impact spike OR freefall (near zero g)
    if magnitude > FALL_IMPACT_THRESHOLD:
        return True, magnitude, "IMPACT_SPIKE"
    elif magnitude < FREEFALL_THRESHOLD:
        return True, magnitude, "FREEFALL"
    return False, magnitude, "NORMAL"


def send_to_server(ax, ay, az, gx, gy, gz, fall_detected):
    """Send IMU telemetry to the cloud backend."""
    payload = {
        "device_id": DEVICE_ID,
        "ax": round(ax, 4),
        "ay": round(ay, 4),
        "az": round(az, 4),
        "gx": round(gx, 4),
        "gy": round(gy, 4),
        "gz": round(gz, 4),
        "fall_detected": fall_detected,
        "latitude": LATITUDE,
        "longitude": LONGITUDE
    }
    try:
        resp = requests.post(SERVER_URL, json=payload, timeout=5)
        result = resp.json()
        return result
    except Exception as e:
        print(f"[IMU] Server error: {e}")
        return None


def trigger_alarm():
    """Buzz and flash red LED for fall alert."""
    GPIO.output(LED_RED, GPIO.HIGH)
    GPIO.output(BUZZER, GPIO.HIGH)
    time.sleep(1.0)
    GPIO.output(BUZZER, GPIO.LOW)
    time.sleep(0.3)
    GPIO.output(BUZZER, GPIO.HIGH)
    time.sleep(0.5)
    GPIO.output(BUZZER, GPIO.LOW)
    GPIO.output(LED_RED, GPIO.LOW)


def main():
    print("=" * 50)
    print(" HALVF IMU Fall Detection (GY-91 / MPU9250)")
    print(" I2C Address: 0x{:02X}".format(MPU9250_ADDR))
    print("=" * 50)

    init_gpio()

    try:
        import smbus2
        bus = smbus2.SMBus(1)
    except ImportError:
        try:
            import smbus
            bus = smbus.SMBus(1)
        except ImportError:
            print("[IMU] ERROR: No smbus library. Install with:")
            print("      sudo apt install python3-smbus")
            print("      pip3 install smbus2")
            return

    # Check if sensor is responding
    try:
        who_am_i = bus.read_byte_data(MPU9250_ADDR, 0x75)
        print(f"[IMU] WHO_AM_I register: 0x{who_am_i:02X}")
        if who_am_i in (0x71, 0x73, 0x68):
            print("[IMU] MPU9250 detected!")
        else:
            print(f"[IMU] WARNING: Unexpected WHO_AM_I value. Continuing anyway...")
    except Exception as e:
        print(f"[IMU] ERROR: Cannot communicate with sensor at 0x{MPU9250_ADDR:02X}")
        print(f"       {e}")
        print("[IMU] Check wiring: SDA->Pin3, SCL->Pin5, VCC->3.3V, GND->GND")
        print("[IMU] Run: sudo i2cdetect -y 1")
        return

    init_mpu9250(bus)

    last_fall_time = 0
    sample_count = 0

    print("[IMU] Reading sensor data... (Ctrl+C to stop)")
    print("[IMU] Shake or drop the sensor to trigger a fall alert!")
    print("")

    try:
        while True:
            ax, ay, az, gx, gy, gz = read_accel_gyro(bus)
            fall_detected, magnitude, fall_type = detect_fall(ax, ay, az)

            sample_count += 1

            # Print every 10th reading to avoid flooding
            if sample_count % 10 == 0:
                status = "NORMAL" if not fall_detected else "!! FALL !!"
                print(f"[IMU] ax={ax:+.2f}g ay={ay:+.2f}g az={az:+.2f}g | "
                      f"gx={gx:+.1f} gy={gy:+.1f} gz={gz:+.1f} | "
                      f"mag={magnitude:.2f}g | {status}")

            if fall_detected:
                now = time.time()
                if now - last_fall_time > FALL_COOLDOWN:
                    last_fall_time = now
                    print(f"\n[IMU] *** FALL DETECTED! Type: {fall_type}, Magnitude: {magnitude:.2f}g ***")
                    print(f"[IMU] Sending alert to server...")

                    result = send_to_server(ax, ay, az, gx, gy, gz, True)
                    if result:
                        print(f"[IMU] Server response: {result.get('status', 'unknown')}")
                        if result.get("status") == "HAZARD_DETECTED":
                            trigger_alarm()
                    print("")
            else:
                # Send normal telemetry every 30 samples (~3 seconds)
                if sample_count % 30 == 0:
                    send_to_server(ax, ay, az, gx, gy, gz, False)

            time.sleep(0.1)  # 10 Hz sampling rate

    except KeyboardInterrupt:
        print("\n[IMU] Stopping IMU reader...")
    finally:
        GPIO.cleanup()
        bus.close()


if __name__ == "__main__":
    main()
