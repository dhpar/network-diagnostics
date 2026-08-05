from ipaddress import ip_address
import logging
import time
from dotenv import load_dotenv
from datetime import datetime
from backend.mac_utils import get_net_mask
from backend.traceroute import traceroute_host
from backend.utils import get_hostname, net_config, ping_host
from backend.database import Device, delete_label_db, get_db, get_devices_with_label_db, update_devices_label_db
from backend.wifi import get_wifi_signal_quality
from flask import request, jsonify, abort, Blueprint, request, current_app
import socket

load_dotenv()

routes = Blueprint("routes", __name__)

health_route = '/api/health'
network_info_route = '/api/network/info'
ping_route = '/api/ping/<ip>'
dns_route = '/api/dns/'
wifi_route = '/api/wifi/scan'
traceroute_route = '/api/traceroute'
devices_route = '/api/devices'
devices_update_route = '/api/devices/update/<mac>/label'
devices_delete_route = '/api/devices/delete/<mac>/label'
devices_leasetime_route = '/api/devices/lease_time'

@routes.route(health_route)
def health():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat()
    })

@routes.route(network_info_route)
def network_info():
    local_ip = net_config.local_ip
    gateway = net_config.gateway_ip
    net_msk = get_net_mask()
    return jsonify({
        'local_ip': local_ip,
        'gateway': gateway[2],
        'subnet': '.'.join(local_ip.split('.')[:-1]) + f'.0/{net_msk}',
    })

@routes.route(ping_route)
def ping(ip):
    try:
        return jsonify(ip_address(ip))
    except ValueError:
        return jsonify(error={
            "code": "invalid_ip",
            "message": "ip must be a valid IP address.",
        }), 400

@routes.route(dns_route)
def dns_test():
    """Test DNS resolution"""
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
        except socket.gaierror:
            results.append({
                "domain": domain,
                "status": "failed",
                "error": {
                    "code": "dns_lookup_failed",
                    "message": "The domain could not be resolved."
                },
            })
    
    return jsonify(results)

@routes.route(wifi_route)
def wifi_scan():
    """Scan for nearby WiFi networks via native Windows Python (WSL has no radio access)"""
    try:
        wifi_quality = get_wifi_signal_quality()
        return jsonify(wifi_quality)
    except Exception as e:
        print(f"WiFi scan error: {e}")
        return jsonify({'error': 'WiFi scanning requires a native Windows Python with pywifi installed'}), 500

@routes.route(traceroute_route)
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
        
@routes.route(devices_route)
def get_devices():
    # lease_time = get_lease_time()
    rows:list[Device] = get_devices_with_label_db()
    devices = []
    for row in rows:
        # ip = row['ip']
        # Try to get the hostname (might be None if still processing)
        # hostname = get_hostname(ip)
        hostname = get_hostname(row['ip'])
        if hostname is not None:
            device = dict(row) | {
                'hostname': hostname
            }
        else:
            device = dict(row)
        devices.append(device)
    
    logging.info(devices)
    
    return jsonify({
        'devices': devices,
        # 'lease_time': lease_time
    })

@routes.route(devices_update_route, methods=['PUT'])
def set_device_label(mac):
    if not request.is_json:
        return jsonify(error={
            "code": "invalid_content_type",
            "message": "Expected application/json.",
        }), 415
    data = request.get_json(silent=True) or {}
    label = data.get('label', '').strip()
    normalized_mac = mac.strip().upper()
    update_devices_label_db(normalized_mac, label)

    return jsonify({'mac': normalized_mac, 'label': label})

@routes.route(devices_delete_route, methods=['DELETE'])
def delete_device_label(mac):
    if not request.is_json:
        return jsonify(error={
            "code": "invalid_content_type",
            "message": "Expected application/json.",
        }), 415
    data = request.get_json(silent=True) or {}
    label = data.get('label', '').strip()
    normalized_mac = mac.strip().upper()

    deleted = delete_label_db(normalized_mac, label)

    if not deleted:
        return jsonify({'error': f'No label found for mac {normalized_mac}'}), 404

    return jsonify({'mac': normalized_mac, 'deleted': True})

# @routes.route(devices_leasetime_route)
# def get_lease_time():
#     lease = lease_DHCP_time()
#     error = lease['stderr']
#     if(error is not None):
#         return error
#     return jsonify(lease['stdout'])
