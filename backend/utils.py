import scapy.all as scapy
from scapy.layers.inet import ICMP, IP
from scapy.layers.l2 import ARP, Ether
from platform import system
from subprocess import run
import re
import time
import socket
from database import get_db
from datetime import datetime
import netifaces
from concurrent.futures import ThreadPoolExecutor

def get_local_ifaces():
    return scapy.conf.ifaces

def get_local_ip():
    default_if = scapy.conf.route.route(scapy.conf.iface.ip)[1]
    return default_if

def get_gateway():
    try:
        hip = None
        with open("/proc/self/net/route") as routes:
            for line in routes:
                parts = line.split('\t')
                if '00000000' == parts[1]:
                    hip = parts[2]

        if hip is not None and len(hip) == 8:
            # Reverse order, convert hex to int
            return "%i.%i.%i.%i" % (int(hip[6:8], 16), int(hip[4:6], 16), int(hip[2:4], 16), int(hip[0:2], 16))
    except Exception:
        print("Error getting default gateway (get_gateway)")

def get_net_mask():
    # Get the default interface Scapy is currently using
    default_iface = scapy.conf.iface 
    # Fetch all addresses assigned to the default interface
    addrs = netifaces.ifaddresses(default_iface.name)
    ipv4_info = addrs.get(netifaces.AF_INET, [])
    
    if ipv4_info:
        netmask = ipv4_info[0].get('netmask')
        if netmask is not None:
            prefixed_mask = sum(bin(int(octet)).count('1') for octet in netmask.split('.'))
            return prefixed_mask
        else: 
            return 'the net mask doesn\'t exists'

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
    """Scan local network for devices using a broadcast ARP request (scapy).

    This sends a single ARP 'who-has' broadcast across the /24 subnet and
    collects replies, which is both faster and more reliable than pinging
    each host, since some devices block ICMP but must still answer ARP to
    participate on the network at all.

    Note: assumes a /24 (255.255.255.0) subnet. If your network uses a
    different mask, adjust the `subnet` line below accordingly.
    Requires elevated privileges (sudo) since it sends raw Ethernet frames.
    """
    local_ip = get_local_ip()
    network_prefix = '.'.join(local_ip.split('.')[:-1])
    subnet = f"{network_prefix}.0/24"
    iface = scapy.conf.route.route(local_ip)[0]

    arp_request = ARP(pdst=subnet)
    broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
    packet = broadcast / arp_request

    answered, _ = scapy.srp(packet, timeout=3, iface=iface, verbose=0)

    devices = []
    for _, received in answered:
        devices.append({
            'ip': received.psrc,
            'mac': received.hwsrc,
            'status': 'online'
        })

    return devices

def reverse_lookup(ip):
    try:
        return socket.gethostbyaddr(ip)[0]
    except (socket.herror, socket.gaierror, OSError):
        return None
    
# Background network scanning
def background_scan():
    while True:
        try:
            devices = scan_network()
            seen_ips = {device['ip'] for device in devices}

            # Resolve hostnames in parallel (reverse DNS via the router's
            # local resolver, works for devices whose DHCP lease got a
            # hostname registered, not guaranteed for every device type)
            hostnames = {}
            if devices:
                with ThreadPoolExecutor(max_workers=min(8, len(devices))) as executor:
                    futures = {d['ip']: executor.submit(reverse_lookup, d['ip']) for d in devices}
                    for ip, future in futures.items():
                        try:
                            hostnames[ip] = future.result(timeout=1.5)
                        except Exception:
                            hostnames[ip] = None

            conn = get_db()
            c = conn.cursor()
            now = datetime.now()

            for device in devices:
                resolved_hostname = hostnames.get(device['ip']) or 'Unknown'
                c.execute('''INSERT OR REPLACE INTO devices 
                            (ip, mac, hostname, status, last_seen) 
                            VALUES (?, ?, ?, ?, ?)''',
                    (
                        device['ip'], 
                        device.get('mac', 'Unknown'),
                        resolved_hostname,
                        'online',
                        now
                    )
                )

            if seen_ips:
                placeholders = ','.join('?' * len(seen_ips))
                c.execute(
                    f"UPDATE devices SET status = 'offline' "
                    f"WHERE ip NOT IN ({placeholders}) AND status != 'offline'",
                    tuple(seen_ips)
                )
            else:
                c.execute("UPDATE devices SET status = 'offline' WHERE status != 'offline'")

            conn.commit()
            conn.close()

        except Exception as e:
            print(f"Background scan error: {e}")
        time.sleep(30)
