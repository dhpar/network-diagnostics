import re
import time
from dotenv import load_dotenv
from datetime import datetime
from backend.traceroute import traceroute_host
import backend.utils
from backend.database import get_db
from backend.wifi import get_wifi_scan_from_windows
from flask import request, jsonify, abort, Blueprint, request

load_dotenv()

routes = Blueprint("routes", __name__)

@routes.route('/api/health')
def health():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat()
    })

@routes.route('/api/network/info')
def network_info():
    local_ip = backend.utils.get_local_ip()
    gateway = backend.utils.get_gateway()
    net_msk = backend.utils.get_net_mask()
    return jsonify({
        'local_ip': local_ip,
        'gateway': gateway,
        'subnet': '.'.join(local_ip.split('.')[:-1]) + f'.0/{net_msk}',
    })

@routes.route('/api/devices')
def get_devices():
    conn = get_db()
    c = conn.cursor()
    rows = c.execute('''
        SELECT d.ip, d.mac, d.hostname, d.last_seen, d.status, l.label
        FROM devices d
        LEFT JOIN device_labels l ON UPPER(d.mac) = l.mac
        ORDER BY d.last_seen DESC
    ''').fetchall()
    conn.close()

    devices = [dict(row) for row in rows]
    return jsonify({'devices': devices})


@routes.route('/api/ping/<ip>')
def ping(ip):
    # Validate IP
    if not re.match(r'^[\d.]+$', ip):
        return jsonify({'error': 'Invalid IP address'}), 400
    
    is_alive = backend.utils.ping_host(ip)
    return jsonify({
        'ip': ip, 
        'status': 'online' if is_alive else 'offline'
    })

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
    
    return jsonify(results)

@routes.route('/api/wifi/scan')
def wifi_scan():
    """Scan for nearby WiFi networks via native Windows Python (WSL has no radio access)"""
    try:
        networks = get_wifi_scan_from_windows()
        return jsonify({
            'networks': networks, 
            'count': len(networks)
        })
    except Exception as e:
        print(f"WiFi scan error: {e}")
        return jsonify({'error': 'WiFi scanning requires a native Windows Python with pywifi installed'}), 500

@routes.route('/api/traceroute')
def traceroute():
    """Traceroute to a given host/URL, reporting where the path fails, if anywhere"""
    target = request.args.get('target')
    if not target:
        return jsonify({'error': 'Missing required query param: target'}), 400

    max_hops = request.args.get('max_hops', default=20, type=int)
    timeout = request.args.get('timeout', default=1, type=int)

    try:
        result = traceroute_host(target, max_hops=max_hops, timeout=timeout)
        return jsonify(result)
    except ValueError as e:
        abort(400, description=str(e))
    except Exception as e:
        print(f"Traceroute error: {e}")
        abort(500, description='Traceroute failed')
        
@routes.route('/api/devices/update/<mac>/label', methods=['PUT'])
def set_device_label(mac):
    data = request.get_json(silent=True) or {}
    label = data.get('label', '').strip()

    if not label:
        return jsonify({'error': 'label is required'}), 400

    normalized_mac = mac.strip().upper()

    conn = get_db()
    c = conn.cursor()
    c.execute('''INSERT INTO device_labels (mac, label, updated_at)
                 VALUES (?, ?, ?)
                 ON CONFLICT(mac) DO UPDATE SET label=excluded.label, updated_at=excluded.updated_at''',
              (normalized_mac, label, datetime.now()))
    conn.commit()
    conn.close()

    return jsonify({'mac': normalized_mac, 'label': label})

@routes.route('/api/devices/<mac>/label', methods=['DELETE'])
def delete_device_label(mac):
    normalized_mac = mac.strip().upper()

    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM device_labels WHERE mac = ?', (normalized_mac,))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()

    if not deleted:
        return jsonify({'error': f'No label found for mac {normalized_mac}'}), 404

    return jsonify({'mac': normalized_mac, 'deleted': True})

@routes.route('/api/devices/lease_time')
def get_lease_time():
    lease = backend.utils.lease_DHCP_time()
    return jsonify(lease)