"""
Runs natively on Windows (NOT inside WSL) since it needs the Windows
Native WiFi API to read signal data, something WSL2 has no access to.
Outputs JSON to stdout so the WSL-side backend can consume it via subprocess.

Requires a SEPARATE install: run this using Windows Python, and
`pip install pywifi` under that same Windows Python, not your WSL venv.
"""
import importlib
import subprocess
import json
import sys
import scapy.all as scapy
from scapy.layers.dot11 import Dot11


def get_windows_python_path():
    """
    Asks Windows which python.exe it would resolve on PATH, then converts
    that Windows-style path into a WSL-accessible one. This avoids silently
    picking a different interpreter than the one pywifi was installed into.
    """
    windows_python_path = '/mnt/c/Users/David/AppData/Local/Microsoft/WindowsApps/python.exe'

    converted = subprocess.run(
        ["wslpath", "-w", windows_python_path],
        capture_output=True, text=True, check=True
    )
    return converted.stdout.strip()

def get_windows_script_path():
    """
    Shells out to a native Windows Python process to get real WiFi signal
    data, since WSL2 has no driver-level access to the wireless radio.
    """
    script_path_wsl = "/home/david/coding/network-diagnostics/backend/windows/wifi_scan.py"

    # python.exe can't understand /mnt/c/... paths, convert to C:\... first
    converted = subprocess.run(
        ["wslpath", "-w", script_path_wsl],
        capture_output=True, text=True, check=True
    )
    windows_script_path = converted.stdout.strip().replace('/', '\\')
    proc = None
    try:
        proc = subprocess.run(
            ["/mnt/c/Users/David/AppData/Local/Microsoft/WindowsApps/python.exe", windows_script_path],
            capture_output=True, text=True, timeout=15
        )
        return proc.stdout.strip() 
    except FileNotFoundError:
        # Triggered when the executable program itself does not exist in system PATH
        return ("Error: The specified command or executable could not be found.")

    except subprocess.CalledProcessError as e:
        # Triggered when the external process runs but exits with a non-zero status code
        return (
            f"Command failed with exit code: {e.returncode}"
            f"Captured Error Output:\n{e.stderr}"
        )
    except subprocess.TimeoutExpired as e:
        # Triggered when the process exceeds the allocated timeout period
        return (f"Process timed out after {e.timeout} seconds.")
    
def get_wifi_scan_from_windows():
    """
    Now, lets make sure the package is installed on the Windows' side Python interpreter, if not let's show a message to the user giving instructions on how to install, providing the path that windows uses for the interpreter, so the user doesn't have to fish for it.
    """
    windows_python_path = get_windows_python_path()
    windows_script_path = get_windows_script_path()
    proc = None
    
    if windows_python_path is None:
        return ('error getting window path')
    if windows_script_path is None:
        return ('error getting script path')

    try:
        proc = subprocess.run(
            [windows_python_path, windows_script_path],
            capture_output=True, text=True, timeout=15
        )
    except FileNotFoundError:
        # Triggered when the executable program itself does not exist in system PATH
        return ("Error: The specified command or executable could not be found.")

    except subprocess.CalledProcessError as e:
        # Triggered when the external process runs but exits with a non-zero status code
        return (f"Command failed with exit code: {e.returncode}")
        print(f"Captured Error Output:\n{e.stderr}")

    except subprocess.TimeoutExpired as e:
        # Triggered when the process exceeds the allocated timeout period
        return (f"Process timed out after {e.timeout} seconds.")
        
    if proc and proc.returncode != 0:
        raise RuntimeError(
            f"Windows wifi scan failed using {windows_python_path}.\n"
            f"If this mentions 'No module named pywifi', run this exact "
            f"command in PowerShell to fix it:\n"
            f'  & "{windows_python_path}" -m pip install pywifi\n\n'
            f"Original error: {proc.stderr}"
        )
    if proc:
        return proc.stdout
    else:
        importlib.import_module("pywifi")
    # return json.loads(proc.stdout)

def iface():
    ifaces = scapy.conf.ifaces
    wifi_iface = [i for i in ifaces if "eth4" in i][0] # Example: finds first wireless interface
    return wifi_iface.data['eth4'].ip


def callBack(pkg): 
    scapy.conf.iface.setmonitor(True)
    if pkg.haslayer(Dot11) and pkg.type == 0 and pkg.subtype == 8:
        return {
            'dBm_AntSignal': pkg.dBm_AntSignal, 
            'dBm_AntNoise': pkg.dBm_AntNoise
        }
          
            
def scan_wifi(scan_wait_seconds=4):
    return get_wifi_scan_from_windows()
    # wifi = pywifi.PyWiFi()
    # iface = wifi.interfaces()[0]  # first WiFi adapter Windows sees

    # iface.scan()
    # time.sleep(scan_wait_seconds)  # Windows needs a moment to finish scanning
    # results = iface.scan_results()

    # return [
    #     {
    #         "ssid": net.ssid,
    #         "bssid": net.bssid,
    #         "signal_dbm": net.signal,
    #         "freq_mhz": net.freq,
    #     }
    #     for net in results
    # ]

if __name__ == "__main__":
    try:
        print(json.dumps(scan_wifi()))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)
        