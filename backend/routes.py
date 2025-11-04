import time
from flask import Flask, jsonify, request, Blueprint
from dotenv import load_dotenv
from datetime import datetime
from utils import get_local_ip, get_gateway, ping_host, scan_network
from database import get_db
import platform
import re
import subprocess
import nmcli
import scapy.all as scapy
import pywifi

load_dotenv()

routes = Blueprint("routes", __name__)

@routes.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@routes.route('/api/network/info')
def network_info():
    local_ip = get_local_ip()
    gateway = get_gateway()
    
    return jsonify({
        'local_ip': local_ip,
        'gateway': gateway,
        'subnet': '.'.join(local_ip.split('.')[:-1]) + '.0/24'
    })

@routes.route('/api/devices')
def get_devices():
    devices = scan_network()
    return jsonify({'devices': devices})

@routes.route('/api/scan/network', methods=['POST'])
def trigger_scan():
    devices = scan_network()
    if not devices:
        return jsonify({'error': 'No devices found'})
    return jsonify({'devices': devices, 'count': len(devices)})
    

@routes.route('/api/ping/<ip>')
def ping(ip):
    # Validate IP
    if not re.match(r'^[\d.]+$', ip):
        return jsonify({'error': 'Invalid IP address'}), 400
    
    is_alive = ping_host(ip)
    return jsonify({'ip': ip, 'status': 'online' if is_alive else 'offline'})

@routes.route('/api/dns/test')
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

@routes.route('/api/wifi/scan')
def wifi_scan():
    """Scan for WiFi networks (platform specific)"""
    networks = []
    results = subprocess.check_output(["netsh", "wlan", "show", "network"], shell=True)
    print(f"{results}")
    try:
        if platform.system() == "Windows":
            result = subprocess.run(['netsh', 'wlan', 'show', 'networks', 'mode=bssid'], capture_output=True, text=True)
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
            result = nmcli.device.show(scapy.conf.iface.description) 
            for line in result:
                networks.append({
                    'ssid': line,
                })
    except Exception as e:
        print(f"WiFi scan error: {e}")
        return jsonify({'error': 'WiFi scanning requires elevated privileges or is not supported'}), 500
    
    return jsonify({'networks': networks, 'count': len(networks)})
