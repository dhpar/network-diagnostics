import scapy.all as scapy
from scapy.layers.inet import ICMP, IP
from scapy.layers.l2 import ARP, Ether
import re
import time
import socket
import paramiko
import os
from flask.cli import run_command
from platform import system
from subprocess import run
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from scapy.sendrecv import srp
from backend.database import insert_or_replace_device_db
from backend.mac_utils import is_locally_administered_mac, mac_lookup_vendor
    
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
    host_re = r'([\d.]+)\s+([\da-fA-F:-]+)\s+(\w+)'
    try:
        result = run(['arp', '-a' if system() == "Windows" else '-n'], capture_output=True, text=True)
        lines = result.stdout.split('\n')
        
        if system() == "Windows":
            for line in lines:
                match = re.search(host_re, line)
                if match:
                    devices.append({
                        'ip': match.group(1),
                        'mac': match.group(2),
                        'type': match.group(3)
                    })
        else:
            for line in lines[1:]: # Skip header
                parts = line.split()
                match = re.search(host_re, line)
                if len(parts) >= 3 and re.match(r'[\d.]+', parts[0]):
                    devices.append({
                        'ip': parts[0],
                        'mac': parts[2] if parts[2] != '(incomplete)' else 'unknown',
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
        hostname = socket.gethostbyaddr(ip)[0]
        return hostname
    except (socket.herror, socket.gaierror, OSError):
        return None

# This function is not yet implemented, nor called anywhere, but should check if a device that has an assigned IP is answering or not answering (not necessarly offline).
def is_device_online(ip_address):
    # Create an ARP packet asking "who has the IP?"
    arp_request = ARP(pdst=ip_address)
    # Broadcast the request over Layer 2 (Ethernet)
    broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
    packet = broadcast / arp_request
    
    # Send the packet and wait for a response
    answered, unanswered = srp(packet, timeout=2, verbose=False)
    
    # If the answered list has items, the device is online and returned its MAC address
    if answered:
        print(f"Device {ip_address} is answering. MAC: {answered[0][1].hwsrc}")
        return True
    else:
        print(f"Device {ip_address} is not answering.")
        return False
    
# Background network scanning
def background_scan():
    while True:
        try:
            scapy.conf.route.resync()  # <-- re-read the OS routing table fresh, don't trust scapy's cached copy

            devices = scan_network()
            
            # Resolve hostnames in parallel (reverse DNS via the router's
            # local resolver, works for devices whose DHCP lease got a
            # hostname registered, not guaranteed for every device type)
            hostnames = {}
            if devices:
                with ThreadPoolExecutor(max_workers=min(8, len(devices))) as executor:
                    futures = { d['ip']: executor.submit(reverse_lookup, d['ip']) for d in devices }
                 
                    for ip, future in futures.items():
                        try:
                            hostnames[ip] = future.result(timeout=1.5)
                        except Exception:
                            hostnames[ip] = None

            now = datetime.now()

            for device in devices:
                resolved_hostname = hostnames.get(device['ip']) or 'unknown'
                device['vendor'] = mac_lookup_vendor(device['mac'])
                device['random_mac'] = is_locally_administered_mac(device['mac'])
                insert_or_replace_device_db(device, resolved_hostname, now, is_locally_administered_mac)

        except Exception as e:
            print(f"Background scan error: {e}")
        time.sleep(30)

def run_ssh_command(host, username, command, timeout=10):
    """
    Runs a shell command and returns its output.

    `command` can be a string ("ls -la") or a list (["ls", "-la"]), a list
    is safer and preferred when any part of the command includes a variable
    (hostname, IP, filename, etc), since it avoids shell interpretation of
    that value entirely.

    Returns a dict: {"stdout": str, "stderr": str, "returncode": int}
    Raises RuntimeError if the command isn't found or times out.
    """
    password = os.getenv("ROUTER_SSH_PASSWORD")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, username=username, password=password, timeout=timeout)
        stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
        output = stdout.read().decode()
        error = stderr.read().decode()
        return {
            "stdout": output.strip(), 
            "stderr": error.strip()
        }
    finally:
        client.close()

def lease_DHCP_time():
    result = run_command(["ssh", "admin@192.168.0.1", "cat /tmp/dhcp.leases"])
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "returncode": result.returncode
    }

def guess_os_family(ip):
    reply = scapy.sr1(IP(dst=ip)/ICMP(), timeout=1, verbose=0)
    if reply is None:
        return None
    ttl = reply.ttl
    if ttl <= 64:
        return "Linux/Android/Unix-like"
    elif ttl <= 128:
        return "Windows"
    else:
        return "Network device (router/switch)"