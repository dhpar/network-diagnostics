import re
import socket
import struct
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from scapy.all import sr1
from scapy.layers.inet import ICMP, IP
from backend.utils import reverse_lookup
from concurrent.futures import ThreadPoolExecutor, as_completed

def traceroute_host(target, max_hops=30, timeout=20000):
    """
    Traces the route to a host using the system `traceroute` command (UDP
    probes), then parses its output into structured JSON, including reverse
    DNS hostnames for each responding hop and timing broken down by phase.
    """
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
            [
                "tracert", 
                "-h", 
                "f{max_hops}",
                "-w",
                "f{timeout}", 
                target
            ],
            capture_output=True,
            text=True,
            timeout=(max_hops * timeout) + 10,
        )
    except FileNotFoundError as exc:
        raise RuntimeError(
            "The traceroute command isn't installed. Install it with: sudo apt install traceroute"
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("Traceroute took too long and was killed before finishing") from exc

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
        hop_ip = ips[0] if ips else None
        avg_rtt = round(sum(rtts) / len(rtts), 1) if rtts else None
        is_timeout = not ips and '*' in rest
        is_destination = hop_ip == target_ip
        status = "reached" if is_destination else 'timeout' if is_timeout else "ok"
      
        hops.append({
            "hop": hop_num,
            "ip": hop_ip,
            "hostname": None,
            "rtt_ms": avg_rtt,
            "status": status,
        })

    dns_start = time.time()

    ips_to_resolve = [h["ip"] for h in hops if h["ip"]]
    if ips_to_resolve:
        with ThreadPoolExecutor(max_workers=min(8, len(ips_to_resolve))) as executor:
            futures = {ip: executor.submit(reverse_lookup, ip) for ip in set(ips_to_resolve)}
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
            "estimated_one_way_ms": estimated_one_way_ms,
        },
        "hops": hops,
    }


def checksum(data: bytes) -> int:
    if len(data) % 2:
        data += b"\x00"
    total = sum((data[i] << 8) + data[i + 1] for i in range(0, len(data), 2))
    total = (total >> 16) + (total & 0xFFFF)
    total += total >> 16
    return ~total & 0xFFFF
 
 
def build_icmp_packet(identifier: int, seq: int) -> bytes:
    header = struct.pack("!BBHHH", 8, 0, 0, identifier, seq)
    payload = b"fasttraceroute"
    chk = checksum(header + payload)
    header = struct.pack("!BBHHH", 8, 0, chk, identifier, seq)
    return header + payload
 
 
def probe_ttl(dest_addr: str, ttl: int, timeout: float, identifier: int):
    """Send a single ICMP echo with a given TTL, return (ttl, ip, elapsed_ms) or (ttl, None, None)."""
    with socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP) as sock:
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_TTL, ttl)
        sock.settimeout(timeout)
        packet = build_icmp_packet(identifier, ttl)
        start = time.perf_counter()
        try:
            sock.sendto(packet, (dest_addr, 0))
            data, addr = sock.recvfrom(512)
            elapsed_ms = (time.perf_counter() - start) * 1000
            return ttl, addr[0], round(elapsed_ms, 1)
        except socket.timeout:
            return ttl, None, None
 
 
def resolve_hostname(ip: str) -> str:
    try:
        return socket.gethostbyaddr(ip)[0]
    except (socket.herror, socket.gaierror):
        return ip
 
def traceroute_scappy(host: str):
    maxTTL = 50
    response = []
    dest_addr = socket.gethostbyname(host)

    for ttl in range(1, maxTTL):
        L3 = IP(dst=host, ttl=ttl)
        packet = L3/ICMP()
        reply = sr1(packet, verbose=0, timeout=2)
        # if reply is not None:
        response.append({
            'traceroute_ms': reply.ttl if reply is not None else '*',
            'address': reply.src if reply is not None else '*',
            'hop_number': ttl
        })
        
    return {
        "target": dest_addr,
        "target_ip": host,
        "total_hops": len(response),
        "timing":response
    }
    
def fast_traceroute(host: str, max_hops: int = 30, timeout: float = 1.0, resolve: bool = False):
    traceroute_start = time.time()
    timed_out_hops = []
    dns_ms = 0
    dest_addr = socket.gethostbyname(host)
    results = {}
    reached_at = None
    hops = []
    
    print(f"Tracing route to {host} [{dest_addr}] over a max of {max_hops} hops:\n")
    
    with ThreadPoolExecutor(max_workers=max_hops) as pool:
        futures = {
            pool.submit(probe_ttl, dest_addr, ttl, timeout, ttl + 1000): ttl
            for ttl in range(1, max_hops + 1)
        }
        for future in as_completed(futures):
            ttl, ip, elapsed_ms = future.result()
            results[ttl] = (ip, elapsed_ms)
 
    for ttl in sorted(results):
        hop_line_re = re.compile(r'^\s*(\d+)\s+(.*)$')
        match = hop_line_re.match(ttl)
        if not match:
            continue
        
        hop_num = int(match.group(1))
        rest = match.group(2)
        ip_re = re.compile(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}')
        ms_re = re.compile(r'([\d.]+)\s*ms')
        
        ip, elapsed_ms = results[ttl]
        if ip is None:
            print(f"{ttl:>3}   *        Request timed out.")
            timed_out_hops.append(ttl)
            continue
        
        label = ip
        if resolve:
            hostname = resolve_hostname(ip)
            dns_ms = round((time.time() - traceroute_start) * 1000, 1)
            if hostname != ip:
                label = f"{hostname} [{ip}]"
 
        print(f"{ttl:>3}   {elapsed_ms:>6} ms   {label}")
 
        if ip == dest_addr and reached_at is None:
            reached_at = ttl
        ips = ip_re.findall(rest)
        rtts = [float(x) for x in ms_re.findall(rest)]
        hop_ip = ips[0] if ips else None
        avg_rtt = round(sum(rtts) / len(rtts), 1) if rtts else None
        is_timeout = not ips and '*' in rest
        is_destination = hop_ip == dest_addr
        status = "reached" if is_destination else 'timeout' if is_timeout else "ok"
        hops.append({
            "hop": hop_num,
            "ip": ip,
            "hostname": None,
            "rtt_ms": avg_rtt,
            "status": status,
        })
    if reached_at:
        print(f"\nTrace complete. Reached {dest_addr} at hop {reached_at}.")
    else:
        print(f"\nDestination {dest_addr} not confirmed within {max_hops} hops "
              f"(some hops may block ICMP or silently drop probes).")
    traceroute_ms = round((time.time() - traceroute_start) * 1000, 1)
    destination_rtt_ms = hops[-1]["rtt_ms"] if reached_at else None
    estimated_one_way_ms = round(destination_rtt_ms / 2, 1) if destination_rtt_ms else None
    return {
            "target": dest_addr,
            "target_ip": host,
            "reached": bool(reached_at),
            "total_hops": reached_at,
            "has_failures": True if not reached_at or len(timed_out_hops) <= 0 else False,
            "failed_at_hops": timed_out_hops,
            "timing": {
                "traceroute_ms": traceroute_ms,
                "dns_lookup_ms": dns_ms,
                "destination_rtt_ms": destination_rtt_ms,
                "estimated_one_way_ms": estimated_one_way_ms,
            },
            "hops": len(results),
        }
    