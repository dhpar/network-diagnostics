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

def get_windows_python_path():
    """
    Asks Windows which python.exe it would resolve on PATH, then converts
    that Windows-style path into a WSL-accessible one. This avoids silently
    picking a different interpreter than the one pywifi was installed into.
    """
    result = subprocess.run(
        ["where.exe", "python.exe"],
        capture_output=True, text=True, check=True
    )
    matches = result.stdout.strip().splitlines()
    if not matches:
        raise RuntimeError("No python.exe found on Windows PATH")

    windows_style_path = matches[0].strip()

    converted = subprocess.run(
        ["wslpath", "-u", windows_style_path],
        capture_output=True, text=True, check=True
    )
    return converted.stdout.strip()

def get_wifi_scan_from_windows():
    """
    Now, lets make sure the package is installed on the Windows' side Python interpreter, if not let's show a message to the user giving instructions on how to install, providing the path that windows uses for the interpreter, so the user doesn't have to fish for it.
    """
    windows_python = get_windows_python_path()

    proc = subprocess.run(
        [windows_python, windows_script_path],
        capture_output=True, text=True, timeout=15
    )

    if proc.returncode != 0:
        raise RuntimeError(
            f"Windows wifi scan failed using {windows_python}.\n"
            f"If this mentions 'No module named pywifi', run this exact "
            f"command in PowerShell to fix it:\n"
            f'  & "{windows_python}" -m pip install pywifi\n\n'
            f"Original error: {proc.stderr}"
        )
    else:
        pywifi_import = importlib.import_module("pywifi")
    return json.loads(proc.stdout)

def scan_wifi(scan_wait_seconds=4):
    get_wifi_scan_from_windows()
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