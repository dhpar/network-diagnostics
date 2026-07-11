import re
import socket
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
from backend.utils import reverse_lookup
def traceroute_host(target, max_hops=30, timeout=2):
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
            ["traceroute", "-n", "-w", str(timeout), "-m", str(max_hops), hostname],
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
