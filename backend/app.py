from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO,emit
import sqlite3
import threading
import time
import subprocess
import re
import platform
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

# Database initialization
def init_db():
    conn = sqlite3.connect('network_diagnostics.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS devices
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  ip TEXT UNIQUE,
                  mac TEXT,
                  hostname TEXT,
                  vendor TEXT,
                  last_seen TIMESTAMP,
                  status TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS network_scans
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  scan_type TEXT,
                  timestamp TIMESTAMP,
                  results TEXT)''')
    
    conn.commit()
    conn.close()

init_db()

# Helper functions
def get_db():
    conn = sqlite3.connect('network_diagnostics.db')
    conn.row_factory = sqlite3.Row
    return conn

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
        if platform.system() == "Windows":
            result = subprocess.run(['ipconfig'], capture_output=True, text=True)
            match = re.search(r'Default Gateway.*?:\s*([\d.]+)', result.stdout)
            return match.group(1) if match else None
        else:
            result = subprocess.run(['ip', 'route'], capture_output=True, text=True)
            match = re.search(r'default via ([\d.]+)', result.stdout)
            return match.group(1) if match else None
    except:
        return None

def ping_host(ip):
    """Ping a host to check if it's alive"""
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', '-W', '1', ip]
    try:
        result = subprocess.run(command, capture_output=True, timeout=2)
        return result.returncode == 0
    except:
        return False

def get_arp_table():
    """Get ARP table entries"""
    devices = []
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['arp', '-a'], capture_output=True, text=True)
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
            result = subprocess.run(['arp', '-n'], capture_output=True, text=True)
            lines = result.stdout.split('\n')[1:]  # Skip header
            for line in lines:
                parts = line.split()
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

# Start background scanning thread
scan_thread = threading.Thread(target=background_scan, daemon=True)
scan_thread.start()

# API Routes
@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/api/network/info')
def network_info():
    local_ip = get_local_ip()
    gateway = get_gateway()
    
    return jsonify({
        'local_ip': request.remote_addr,
        'gateway': gateway,
        'subnet': '.'.join(local_ip.split('.')[:-1]) + '.0/24'
    })

@app.route('/api/devices')
def get_devices():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM devices ORDER BY last_seen DESC')
    devices = [dict(row) for row in c.fetchall()]
    conn.close()
    
    return jsonify({'devices': devices})

@app.route('/api/scan/network', methods=['POST'])
def trigger_scan():
    devices = scan_network()
    return jsonify({'devices': devices, 'count': len(devices)})

@app.route('/api/ping/<ip>')
def ping(ip):
    # Validate IP
    if not re.match(r'^[\d.]+$', ip):
        return jsonify({'error': 'Invalid IP address'}), 400
    
    is_alive = ping_host(ip)
    return jsonify({'ip': ip, 'status': 'online' if is_alive else 'offline'})

@app.route('/api/dns/test')
def dns_test():
    """Test DNS resolution"""
    import socket
    results = []
    
    test_domains = ['google.com', 'cloudflare.com', 'github.com']
    
    for domain in test_domains:
        try:
            start = time.time()
            ip = socket.gethostbyname(domain)
            duration = (time.time() - start) * 1000
            results.append({
                'domain': domain,
                'ip': ip,
                'time_ms': round(duration, 2),
                'status': 'success'
            })
        except Exception as e:
            results.append({
                'domain': domain,
                'error': str(e),
                'status': 'failed'
            })
    
    return jsonify({'results': results})

@app.route('/api/wifi/scan')
def wifi_scan():
    """Scan for WiFi networks (platform specific)"""
    networks = []
    
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['netsh', 'wlan', 'show', 'networks', 'mode=bssid'], 
                                  capture_output=True, text=True)
            # Parse Windows WiFi output
            current_ssid = None
            for line in result.stdout.split('\n'):
                if 'SSID' in line and 'BSSID' not in line:
                    match = re.search(r'SSID \d+ : (.+)', line)
                    if match:
                        current_ssid = match.group(1).strip()
                elif 'Signal' in line and current_ssid:
                    match = re.search(r'(\d+)%', line)
                    if match:
                        networks.append({
                            'ssid': current_ssid,
                            'signal': int(match.group(1))
                        })
                        current_ssid = None
        else:
            # Linux/Mac - requires sudo/admin for detailed scan
            result = subprocess.run(['nmcli', '-t', '-f', 'SSID,SIGNAL', 'dev', 'wifi'], 
                                  capture_output=True, text=True)
            for line in result.stdout.split('\n'):
                if ':' in line:
                    parts = line.split(':')
                    if len(parts) >= 2 and parts[0]:
                        networks.append({
                            'ssid': parts[0],
                            'signal': int(parts[1]) if parts[1].isdigit() else 0
                        })
    except Exception as e:
        print(f"WiFi scan error: {e}")
        return jsonify({'error': 'WiFi scanning requires elevated privileges or is not supported'}), 500
    
    return jsonify({'networks': networks, 'count': len(networks)})

# WebSocket events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connection_status', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('request_scan')
def handle_scan_request():
    devices = scan_network()
    emit('devices_update', {'devices': devices})

 # Define a route for the home page ("/")
@app.route('/')
def homepage():
    return 'hello world'


# @app.route("/spec")
# def spec():
#     return jsonify(swagger(app))

if __name__ == '__main__':
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=5000, 
        debug=True, 
        allow_unsafe_werkzeug=True
    )
    