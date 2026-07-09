"""
Runs natively on Windows (NOT inside WSL) since it needs the Windows
Native WiFi API to read signal data, something WSL2 has no access to.
Outputs JSON to stdout so the WSL-side backend can consume it via subprocess.

Requires a SEPARATE install: run this using Windows Python, and
`pip install pywifi` under that same Windows Python, not your WSL venv.
"""
import json
import sys
import time
import pywifi

def scan_wifi(scan_wait_seconds=4):
    wifi = pywifi.PyWiFi()
    iface = wifi.interfaces()[0]  # first WiFi adapter Windows sees

    iface.scan()
    time.sleep(scan_wait_seconds)  # Windows needs a moment to finish scanning
    results = iface.scan_results()

    return [
        {
            "ssid": net.ssid,
            "bssid": net.bssid,
            "signal_dbm": net.signal,
            "freq_mhz": net.freq,
        }
        for net in results
    ]

if __name__ == "__main__":
    try:
        print(json.dumps(scan_wifi()))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)