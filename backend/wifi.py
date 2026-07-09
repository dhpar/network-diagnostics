import subprocess
import json
from scapy.all import sniff, conf  
from scapy.layers.dot11 import Dot11

conf.use_pcap=True

def get_wifi_scan_from_windows():
    """
    Shells out to a native Windows Python process to get real WiFi signal
    data, since WSL2 has no driver-level access to the wireless radio.
    """
    script_path_wsl = " /home/david/coding/network-diagnostics/backend/windows/wifi_scan.py"

    # python.exe can't understand /mnt/c/... paths, convert to C:\... first
    converted = subprocess.run(
        ["wslpath", "-w", script_path_wsl],
        capture_output=True, text=True, check=True
    )
    windows_script_path = converted.stdout.strip()

    proc = subprocess.run(
        ["python.exe", windows_script_path],
        capture_output=True, text=True, timeout=15
    )

    if proc.returncode != 0:
        raise RuntimeError(f"Windows wifi scan failed: {proc.stderr}")

    return json.loads(proc.stdout)


def iface():
    ifaces = conf.ifaces
    wifi_iface = [i for i in ifaces if "eth4" in i][0] # Example: finds first wireless interface
    return wifi_iface.data['eth4'].ip


def callBack(pkg): 
    conf.iface.setmonitor(True)
    if pkg.haslayer(Dot11) and pkg.type == 0 and pkg.subtype == 8:
            print("dBm_AntSignal", pkg.dBm_AntSignal)
            print("dBm_AntNoise", pkg.dBm_AntNoise)

if __name__ == "__main__":
    # Only runs the old monitor-mode sniff if this file is executed directly,
    # not when imported (e.g. by routes.py for get_wifi_scan_from_windows)
    sniff(iface=iface, prn=callBack)
    