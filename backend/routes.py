import time
from flask import jsonify, Blueprint
from dotenv import load_dotenv
from datetime import datetime
from utils import get_local_ip, get_gateway, ping_host, scan_network, get_net_mask
import re
import scapy.all as scapy
from wifi import get_wifi_scan_from_windows

load_dotenv()

routes = Blueprint("routes", __name__)

@routes.route('/api/health')
def health():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@routes.route('/api/network/info')
def network_info():
    local_ip = get_local_ip()
    gateway = get_gateway()
    net_msk = get_net_mask()
    return jsonify({
        'local_ip': local_ip,
        'gateway': gateway,
        'subnet': '.'.join(local_ip.split('.')[:-1]) + f'.0/{net_msk}'
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
    """Scan for nearby WiFi networks via native Windows Python (WSL has no radio access)"""
    try:
        networks = get_wifi_scan_from_windows()
        return jsonify({'networks': networks, 'count': len(networks)})
    except Exception as e:
        print(f"WiFi scan error: {e}")
        return jsonify({'error': 'WiFi scanning requires a native Windows Python with pywifi installed'}), 500
