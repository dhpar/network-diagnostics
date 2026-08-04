import os
from typing import List
from venv import logger
# from dotenv import load_dotenv
import scapy.all as scapy
from scapy.layers.inet import ICMP, IP
from scapy.layers.l2 import ARP, Ether
import re
import time
import socket
from platform import system
from subprocess import run
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from scapy.sendrecv import srp
from backend.database import Device, insert_or_replace_device_db
from backend.mac_utils import is_locally_administered_mac, mac_lookup_vendor
from dataclasses import dataclass, field

class LookupError(Exception):
    """Raised when there was an error looking up an ip"""
    pass
@dataclass
class net_config:
    local_iface: str = scapy.conf.iface.name
    local_ifaces: list[str] = field(default_factory = scapy.conf.ifaces)
    local_ip: str = scapy.conf.route.route(scapy.conf.iface.ip)[1]
    gateway_ip: str = scapy.conf.route.route("8.8.8.8")
    iface: str = scapy.conf.iface

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
        arp_command = run(['arp', '-a' if system() == "Windows" else '-n'], capture_output=True, text=True)
        lines = arp_command.stdout.split('\n')
        
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
    """
    Scan local network for devices using a broadcast ARP request (scapy).

    This sends a single ARP 'who-has' broadcast across the /24 subnet and
    collects replies, which is both faster and more reliable than pinging
    each host, since some devices block ICMP but must still answer ARP to
    participate on the network at all.

    Note: assumes a /24 (255.255.255.0) subnet. If your network uses a
    different mask, adjust the `subnet` line below accordingly.
    Requires elevated privileges (sudo) since it sends raw Ethernet frames.
    """
 
    network_prefix = net_config.local_ip.rsplit('.', 1)[0]
    subnet = f"{network_prefix}.0/24"
    packet = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=subnet)
    answered, _ = scapy.srp(
        packet,
        timeout=3,
        iface=net_config.local_iface,
        verbose=0,
    )
    print(answered.summary(lambda s,r: r.sprintf("%Ether.src% %ARP.psrc%") ))
    devices = [[ receive.psrc, receive.src ] for  _, receive in answered]
    return devices

def reverse_lookup(ip):
    try:
        # Returns a tuple: (hostname, aliaslist, ipaddrlist)
        hostname, _, _ = socket.gethostbyaddr(ip)[0]
        logger.info(f"reverse_lookup: Reverse DNS record for {ip}, return {hostname}")
        return hostname
    except socket.herror:
        # Fallback if reverse DNS record is missing
        logger.warning(f"reverse_lookup: Reverse DNS record is missing for {ip} ([Errno 11004] host not found), returned None")
        return None
    except ValueError:
        logger.warning(f"reverse_lookup: Invalid IP address format for {ip}, returned None")
        return None
    
# This function is not yet implemented, nor called anywhere, but should check if a device that has an assigned IP is answering or not answering (not necessarly offline).
def is_device_online(ip_address):
    # Create an ARP packet asking "who has the IP?"
    arp_request = ARP(pdst=ip_address)
    # Broadcast the request over Layer 2 (Ethernet)
    broadcast = Ether(dst="ff:ff:ff:ff:ff:ff")
    packet = broadcast / arp_request
    
    # Send the packet and wait for a response
    answered, _ = srp(packet, timeout=2, verbose=False)
    
    # If the answered list has items, the device is online and returned its MAC address
    if answered:
        print(f"Device {ip_address} is answering. MAC: {answered[0][1].hwsrc}")
        return True
    else:
        print(f"Device {ip_address} is not answering.")
        return False
    
def update_scan_results(): 
    try:
        scapy.conf.route.resync()  # <-- re-read the OS routing table fresh, don't trust scapy's cached copy
        answered_devices = scan_network()
        # Resolve hostnames in parallel (reverse DNS via the router's
        # local resolver, works for devices whose DHCP lease got a
        # hostname registered, not guaranteed for every device type)
        devices:List[Device] = []
        if answered_devices:
            workers = min(8, len(answered_devices))
            with ThreadPoolExecutor(max_workers=workers) as executor:
                for ip, mac in answered_devices:               
                    if ip is not None and mac is not None:
                        # TODO: We should decouple the reverse lookup for the hostname and do it separetly from the main scan, otherwise it holdsup the whole scan (takes forever). 
                        hostname = executor.submit(reverse_lookup, ip).result()
                        vendor = mac_lookup_vendor(mac)
                        random_mac = is_locally_administered_mac(mac)
                        now = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')
                
                        devices.append({
                            "hostname": hostname or 'Unknown',
                            "mac": mac or 'Unknown',
                            "ip": ip or 'Unknown',
                            "vendor": vendor or 'Unknown',
                            "last_seen": now,
                            "status": "online",
                            "random_mac": random_mac or None,
                        })
                    else:
                        continue
                insert_or_replace_device_db(devices)
    except Exception as e:
        logger.error(f"Background scan error: {e}")
        
# Background network scanning
def background_scan() -> List[Device]:
    while True:
        update_scan_results()
        time.sleep(10)

# def run_ssh_command(host: str, username: str, command: str, timeout=10) -> dict[str, str]:
#     """
#     Runs a shell command and returns its output.

#     `command` can be a string ("ls -la") or a list (["ls", "-la"]), a list
#     is safer and preferred when any part of the command includes a variable
#     (hostname, IP, filename, etc), since it avoids shell interpretation of
#     that value entirely.

#     Returns a dict: {"stdout": str, "stderr": str, "returncode": int}
#     Raises RuntimeError if the command isn't found or times out.
#     """
#     load_dotenv('/home/david/coding/network-diagnostics/backend/.env.backend.dev')
#     password = os.getenv("ROUTER_SSH_PASSWORD")
#     client = paramiko.SSHClient()
    
#     client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
#     if not password:
#         raise Exception(f"Need a password in order to run SSH on the router")
    
#     try:
#         client.connect(
#             hostname=host, 
#             username=username, 
#             password=password,
#             timeout=timeout
#         )
#         client.connect(host, username=username, password=password, timeout=timeout)
#         stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
#         output = stdout.read().decode()
#         error = stderr.read().decode()
#         return {
#             "stdout": output.strip(), 
#             "stderr": error.strip()
#         }
#     finally:
#         client.close()

# def lease_DHCP_time():
#     result = run_ssh_command("192.168.0.1", "admin", "cat /tmp/dhcp.leases")
#     stdout = result.get('stdout')
#     error = result.get('error')
    
#     return {
#         "stdout": stdout,
#         "stderr": error,
#     }

def guess_os_family(ip):
    reply = scapy.sr1(
        IP(dst=ip)/ICMP(), 
        timeout=1, 
        verbose=0
    )
    
    if reply is None:
        return None
    ttl = reply.ttl
    if ttl <= 64:
        return "Linux/Android/Unix-like"
    elif ttl <= 128:
        return "Windows"
    else:
        return "Network device (router/switch)"