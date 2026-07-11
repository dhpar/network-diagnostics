import scapy.all as scapy
from scapy.layers.inet import ICMP, IP
from scapy.layers.l2 import ARP, Ether
from platform import system
from subprocess import run
import re
import time
from database import get_db
from datetime import datetime
import netifaces

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

# Background network scanning
def background_scan():
    while True:
        try:
            devices = scan_network()
            seen_ips = {device['ip'] for device in devices}
            conn = get_db()
            c = conn.cursor()
            now = datetime.now()

            # Upsert every device that answered this cycle's ARP scan as online.
            # last_seen is bumped to now, since we just confirmed it's alive.
            for device in devices:
                c.execute('''INSERT OR REPLACE INTO devices 
                            (ip, mac, hostname, status, last_seen) 
                            VALUES (?, ?, ?, ?, ?)''',
                         (device['ip'], 
                          device.get('mac', 'Unknown'),
                          device.get('hostname', 'Unknown'),
                          'online',
                          now))

            # Anything previously known that didn't answer this scan gets marked
            # offline (but keeps its old last_seen, since that's the last time it
            # was ACTUALLY seen, not right now). Without this, a device that drops
            # off the network would stay 'online' in the DB forever, since
            # scan_network() only ever reports devices that DID respond.
            if seen_ips:
                placeholders = ','.join('?' * len(seen_ips))
                c.execute(
                    f"UPDATE devices SET status = 'offline' "
                    f"WHERE ip NOT IN ({placeholders}) AND status != 'offline'",
                    tuple(seen_ips)
                )
            else:
                # Nothing answered this cycle at all (e.g. network hiccup)
                c.execute("UPDATE devices SET status = 'offline' WHERE status != 'offline'")

            conn.commit()
            conn.close()
            
            # Emit update to connected clients
            # socketio.emit('devices_update', {'devices': devices})
            
        except Exception as e:
            print(f"Background scan error: {e}")
        time.sleep(30)  # Scan every 30 seconds

def traceroute_host(target, max_hops=30, timeout=2):
    """
    Traces the route to a host using the system `traceroute` command (UDP
    probes), then parses its output into structured JSON, including reverse
    DNS hostnames for each responding hop and timing broken down by phase.
    """
    import re
    import socket
    import subprocess
    import time
    from urllib.parse import urlparse
    from concurrent.futures import ThreadPoolExecutor

    total_start = time.time()

    parsed = urlparse(target if "://" in target else f"//{target}")
    hostname = parsed.hostname or target

    try:
        target_ip = socket.gethostbyname(hostname)
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve host '{hostname}': {e}")

    traceroute_start = time.time()
    try:
        proc = subprocess.run(
            ["traceroute", "-n", "-w", str(timeout), "-m", str(max_hops), hostname],
            capture_output=True, text=True,
            timeout=(max_hops * timeout) + 10
        )
    except FileNotFoundError:
        raise RuntimeError("The traceroute command isn't installed. Install it with: sudo apt install traceroute")
    except subprocess.TimeoutExpired:
        raise RuntimeError("Traceroute took too long and was killed before finishing")
    traceroute_ms = round((time.time() - traceroute_start) * 1000, 1)

    if proc.returncode != 0 and not proc.stdout:
        raise RuntimeError(f"Traceroute failed: {proc.stderr.strip()}")

    hop_line_re = re.compile(r'^\s*(\d+)\s+(.*)$')
    ip_re = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
    ms_re = re.compile(r'([\d.]+)\s*ms')

    hops = []
    for line in proc.stdout.strip().splitlines():
        match = hop_line_re.match(line)
        if not match:
            continue

        hop_num = int(match.group(1))
        rest = match.group(2)

        ips = ip_re.findall(rest)
        rtts = [float(x) for x in ms_re.findall(rest)]

        if not ips and '*' in rest:
            hops.append({"hop": hop_num, "ip": None, "hostname": None, "rtt_ms": None, "status": "timeout"})
            continue

        hop_ip = ips[0] if ips else None
        avg_rtt = round(sum(rtts) / len(rtts), 1) if rtts else None
        status = "reached" if hop_ip == target_ip else "ok"

        hops.append({"hop": hop_num, "ip": hop_ip, "hostname": None, "rtt_ms": avg_rtt, "status": status})

    dns_start = time.time()

    def _reverse_lookup(ip):
        try:
            return socket.gethostbyaddr(ip)[0]
        except (socket.herror, socket.gaierror):
            return None

    ips_to_resolve = [h["ip"] for h in hops if h["ip"]]
    if ips_to_resolve:
        with ThreadPoolExecutor(max_workers=min(8, len(ips_to_resolve))) as executor:
            futures = {ip: executor.submit(_reverse_lookup, ip) for ip in set(ips_to_resolve)}
            resolved = {}
            for ip, future in futures.items():
                try:
                    resolved[ip] = future.result(timeout=1.5)
                except Exception:
                    resolved[ip] = None

        for h in hops:
            if h["ip"]:
                h["hostname"] = resolved.get(h["ip"])

    if hops and hops[-1]["status"] == "reached" and not hops[-1]["hostname"]:
        hops[-1]["hostname"] = hostname

    dns_ms = round((time.time() - dns_start) * 1000, 1)

    reached = bool(hops) and hops[-1]["status"] == "reached"
    timed_out_hops = [h["hop"] for h in hops if h["status"] == "timeout"]

    total_ms = round((time.time() - total_start) * 1000, 1)
    destination_rtt_ms = hops[-1]["rtt_ms"] if reached else None
    estimated_one_way_ms = round(destination_rtt_ms / 2, 1) if destination_rtt_ms else None
    
    return {
        "target": hostname,
        "target_ip": target_ip,
        "reached": reached,
        "total_hops": len(hops),
        "has_failures": len(timed_out_hops) > 0,
        "failed_at_hops": timed_out_hops,
        "timing": {
            "traceroute_ms": traceroute_ms,
            "dns_lookup_ms": dns_ms,
            "total_ms": total_ms,
            "destination_rtt_ms": destination_rtt_ms,
            "estimated_one_way_ms": estimated_one_way_ms
        },
        "hops": hops
    }
    