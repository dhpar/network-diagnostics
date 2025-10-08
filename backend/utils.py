import time
from app import socketio
from database import get_db
from datetime import datetime
from platform import system
from subprocess import run
import re

def get_local_ip():
    """Get local IP address"""
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def get_gateway():
    """Get default gateway"""
    try:
        if system() == "Windows":
            result = run(['ipconfig'], capture_output=True, text=True)
            match = re.search(r'Default Gateway.*?:\s*([\d.]+)', result.stdout)
            return match.group(1) if match else None
        else:
            result = run(['ip', 'route'], capture_output=True, text=True)
            match = re.search(r'default via ([\d.]+)', result.stdout)
            return match.group(1) if match else None
    except:
        return None

def ping_host(ip):
    """Ping a host to check if it's alive"""
    param = '-n' if system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', '-W', '1', ip]
    try:
        result = run(command, capture_output=True, timeout=2)
        return result.returncode == 0
    except:
        return False

def get_arp_table():
    """Get ARP table entries"""
    devices = []
    try:
        if system() == "Windows":
            result = run(['arp', '-a'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            for line in lines:
                match = re.search(r'([\d.]+)\s+([\da-fA-F:-]+)\s+(\w+)', line)
                if match:
                    devices.append({
                        'ip': match.group(1),
                        'mac': match.group(2),
                        'type': match.group(3)
                    })
        else:
            result = run(['arp', '-n'], capture_output=True, text=True)
            lines = result.stdout.split('\n')[1:]  # Skip header
            for line in lines:
                parts = line.split()
                match = re.search(r'([\d.]+)\s+([\da-fA-F:-]+)\s+(\w+)', line)
                if len(parts) >= 3 and re.match(r'[\d.]+', parts[0]):
                    devices.append({
                        'ip': parts[0],
                        'mac': parts[2] if parts[2] != '(incomplete)' else 'Unknown',
                        'type': 'dynamic'
                    })
    except Exception as e:
        print(f"Error getting ARP table: {e}")
    
    return devices

def scan_network():
    """Scan local network for devices"""
    local_ip = get_local_ip()
    network_prefix = '.'.join(local_ip.split('.')[:-1])
    
    devices = []
    # Quick scan of common IPs first
    for i in [1, 2, 254]:  # Gateway candidates
        ip = f"{network_prefix}.{i}"
        if ping_host(ip):
            devices.append({'ip': ip, 'status': 'online'})
    
    # Get devices from ARP table
    arp_devices = get_arp_table()
    for device in arp_devices:
        if device not in devices:
            is_online = ping_host(device['ip'])
            devices.append({
                'ip': device['ip'],
                'mac': device['mac'],
                'status': 'online' if is_online else 'offline'
            })
    
    return devices

# Background network scanning
def background_scan():
    while True:
        try:
            devices = scan_network()
            conn = get_db()
            c = conn.cursor()
            
            for device in devices:
                c.execute('''INSERT OR REPLACE INTO devices 
                            (ip, mac, hostname, status, last_seen) 
                            VALUES (?, ?, ?, ?, ?)''',
                         (device['ip'], 
                          device.get('mac', 'Unknown'),
                          device.get('hostname', 'Unknown'),
                          device['status'],
                          datetime.now()))
            
            conn.commit()
            conn.close()
            
            # Emit update to connected clients
            socketio.emit('devices_update', {'devices': devices})
            
        except Exception as e:
            print(f"Background scan error: {e}")
        time.sleep(30)  # Scan every 30 seconds
