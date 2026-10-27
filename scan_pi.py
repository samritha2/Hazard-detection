import socket
from concurrent.futures import ThreadPoolExecutor

def check_ssh(ip):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        if s.connect_ex((ip, 22)) == 0:
            print(f"Found Raspberry Pi (SSH open) at {ip}")
        s.close()
    except Exception:
        pass

ips = [f"10.43.53.{i}" for i in range(1, 255)]
with ThreadPoolExecutor(max_workers=50) as e:
    e.map(check_ssh, ips)
