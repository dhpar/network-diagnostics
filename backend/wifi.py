from dataclasses import dataclass
import re
import subprocess
from venv import logger
import subprocess
from typing import List, Optional, Dict, Any

# import jc
@dataclass
class WiFiNetwork:
    ssid: str
    signal: str
    radio_type: str
    channel: str
    bssid: str

def wifi_interface_restart():
    # With the `netsh wlan show networks mode=bssid` we are reading cached results, in order to read "fresh results" we need to turn off the windows service and turn it back on to refresh the cached results, this is what we are doing here.
    subprocess.run(['netsh', 'interface', 'set', 'interface', "Wi-Fi", 'admin=disabled']);
    subprocess.run(['netsh', 'interface', 'set', 'interface', "Wi-Fi", 'admin=enabled']);
    
def get_neighbor_nets():
    # This function returns the neightboring networks and it's signal's channel and quality. Should help asses if we need to change our network's channel or band.
    wifi_interface_restart()
    result = subprocess.run(
            ['netsh', 'wlan', 'show', 'networks', 'mode=bssid'],
            capture_output=True,
            text=True,
            check=True
        )

    wifi_networks_data = parse_netsh_wlan_networks(result.stdout) 
    if not wifi_networks_data:
        return None

    return wifi_networks_data
    
def get_interface_data():
    result = subprocess.run(
        ['netsh', 'wlan', 'show', 'interface'],
        capture_output=True,
        text=True,
        check=True
    )
    
    interface_data = parse_netsh_output(result.stdout)
    if not interface_data:
        return None
    
    return {
        'name': interface_data.get('Name') or None,
        'description': interface_data.get('Description') or None,
        'physical_address': interface_data['Physical address'],
        'state': interface_data.get('State') or None,
        'SSDI': interface_data.get('SSID') or None,
        'band': interface_data.get('Band') or None,
        'channel': interface_data.get('Channel') or None,
        'radio_type': interface_data.get('Radio type') or None,
        'authentication': interface_data.get('Authentication') or None,
        'cipher': interface_data.get('Cipher') or None,
        'recieve_rate_mbps': interface_data['Receive rate (Mbps)'] or None,
        'transmit_rate_mbps': interface_data['Transmit rate (Mbps)'] or None,
        'signal': interface_data.get('Signal')   
    }
            
def get_wifi_signal_quality() -> Optional[Dict[str, Any]]:
    """
    Get detailed WiFi signal quality info on Windows.
    Returns signal strength, SNR, channel, interference, etc.
    """
    try:
        # Get current connected network info
        interface = get_interface_data()
        channel = None
        signal_quality_percent = None
        interference_level = "unknown"
        if interface:
            channel = interface.get('channel')
            signal_str = interface.get('signal')
            if signal_str and isinstance(signal_str, str) and signal_str.endswith('%'):
                try:
                    signal_quality_percent = int(signal_str.rstrip('%'))
                except ValueError:
                    signal_quality_percent = None
            interference_level = detect_interference(channel)
        # Get more detailed info
        signal_strength_dbm = get_signal_strength_dbm(signal_quality_percent)
        snr = estimate_snr(signal_strength_dbm)
        return {
            'signal_quality_percent': signal_quality_percent,
            'signal_strength_dbm': signal_strength_dbm,
            'snr_db': snr,
            'channel': int(channel) if channel else None,
            'frequency_ghz': get_frequency_from_channel(channel),
            'interference_level': interference_level,
            'recommendation': get_signal_recommendation(signal_quality_percent, snr) if signal_quality_percent is not None else None,
            'status': 'connected',
            'interface': interface
        }
    
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to get WiFi signal quality: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error getting WiFi quality: {e}")
        return None

def parse_netsh_output(output: str) -> Dict[str, str]:
    """Parse netsh wlan show interface output"""
    data = {}
    for line in output.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip()
            value = value.strip()
            data[key] = value
    return data

def get_signal_strength_dbm(signal_quality) -> Optional[int]:
    """
    Get signal strength in dBm (more accurate than percentage).
    Uses WMI on Windows.
    """
    # Convert quality % to dBm (100% = -30 dBm, 0% = -100 dBm)
    signal_strength_dbm = None
    if signal_quality:
        try:
            quality_percent = int(signal_quality)
            signal_strength_dbm = int(-100 + (quality_percent * 0.7))
            return signal_strength_dbm
        except (ValueError, AttributeError):
            pass
        return None
    else:
        return None

def estimate_snr(signal_dbm: Optional[int]) -> Optional[int]:
    """
    Estimate SNR from signal strength.
    Typical noise floor is around -90 to -95 dBm on WiFi.
    SNR = Signal - Noise
    """
    if not signal_dbm:
        return None
    
    # Typical WiFi noise floor
    noise_floor = -92
    snr = signal_dbm - noise_floor
    return max(0, snr)  # SNR shouldn't be negative

def get_frequency_from_channel(channel: Optional[str]) -> Optional[float]:
    """Convert WiFi channel to frequency in GHz"""
    if not channel:
        return None
    
    try:
        ch = int(channel)
        # 2.4 GHz band: channels 1-13
        if 1 <= ch <= 13:
            return 2.4 + (ch - 1) * 0.005
        # 5 GHz band: channels 36-165
        elif 36 <= ch <= 165:
            return 5.0 + (ch - 36) * 0.005
    except (ValueError, TypeError):
        pass
    
    return None

def detect_interference(channel: Optional[str]) -> str:
    """
    Detect potential interference on the channel.
    This is simplified - in reality you'd scan for other networks.
    """
    if not channel:
        return "unknown"
    
    try:
        result = subprocess.run(
            ['netsh', 'wlan', 'show', 'networks', 'mode=Bssid'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        # Count networks on same channel
        networks_on_channel = count_networks_on_channel(result.stdout, channel)
        
        if networks_on_channel > 3:
            return "high"
        elif networks_on_channel > 1:
            return "medium"
        else:
            return "low"
    
    except Exception as e:
        logger.debug(f"Could not detect interference: {e}")
        return "unknown"

def count_networks_on_channel(netsh_output: str, target_channel: str) -> int:
    """Parse netsh output to count networks on the same channel"""
    count = 0
    current_channel = None
    
    for line in netsh_output.split('\n'):
        if 'Channel' in line and ':' in line:
            try:
                _, ch = line.split(':')
                current_channel = ch.strip()
            except ValueError:
                pass
        
        if current_channel == target_channel:
            count += 1
    
    return count

def get_signal_recommendation(signal_quality: Optional[int], snr: Optional[int]) -> str:
    """Get actionable recommendation based on signal metrics"""
    if signal_quality is None or snr is None:
        return "Unable to assess - insufficient data"

    quality = signal_quality
    
    if quality >= 80 and snr >= 30:
        return "Excellent signal - no action needed"
    elif quality >= 60 and snr >= 20:
        return "Good signal - acceptable performance"
    elif quality >= 40 and snr >= 10:
        return "Fair signal - consider moving closer or repositioning router"
    elif quality >= 20:
        return "Poor signal - move closer to router or reduce interference"
    else:
        return "Very poor signal - connection may be unstable"

def sort_list_of_dict_by(data, field:str):
    sorted_data = sorted(data, key=lambda x: x[field])
    return sorted_data

def parse_netsh_wlan_networks(raw_output: str) -> List[Dict[str, Any]]:
    networks: List[Dict[str, Any]] = []
    current_network: Optional[Dict[str, Any]] = None
    current_bssid: Optional[Dict[str, Any]] = None
    in_bss_load = False
 
    ssid_re = re.compile(r'^SSID \d+\s*:\s?(.*)$')
    bssid_re = re.compile(r'^BSSID \d+\s*:\s*(.*)$')
 
    for raw_line in raw_output.splitlines():
        if not raw_line.strip():
            continue
 
        indent = len(raw_line) - len(raw_line.lstrip(' '))
        line = raw_line.strip()
 
        # Top-level: new SSID block
        if indent == 0:
            ssid_match = ssid_re.match(line)
            if ssid_match:
                current_network = {
                    "ssid": ssid_match.group(1).strip(),  # can be "" for hidden networks
                    "network_type": None,
                    "authentication": None,
                    "encryption": None,
                    "bssids": [],
                }
                networks.append(current_network)
                current_bssid = None
                in_bss_load = False
            continue  # ignores "Interface name" / "There are N networks..." header lines
 
        if current_network is None:
            continue
 
        # SSID-level: new BSSID block, or SSID metadata (Network type / Authentication / Encryption)
        if indent == 4:
            bssid_match = bssid_re.match(line)
            if bssid_match:
                current_bssid = {
                    "bssid": bssid_match.group(1).strip(),
                    "signal_percent": None,
                    "radio_type": None,
                    "band": None,
                    "channel": None,
                    "details": None,
                    "bss_load": None,
                    "qos_mscs_supported": None,
                    "qos_map_supported": None,
                    "basic_rates_mbps": [],
                    "other_rates_mbps": [],
                }
                current_network["bssids"].append(current_bssid)
                in_bss_load = False
                continue
 
            key, _, value = line.partition(':')
            key, value = key.strip().lower(), value.strip()
            if key == "network type":
                current_network["network_type"] = value
            elif key == "authentication":
                current_network["authentication"] = value
            elif key == "encryption":
                current_network["encryption"] = value
            continue
 
        if current_bssid is None:
            continue
 
        # Bss Load sub-fields, nested one level deeper than the other BSSID fields
        if in_bss_load and indent > 9:
            key, _, value = line.partition(':')
            key, value = key.strip().lower(), value.strip()
            bss_load:dict[str, str | int | None] | Any = current_bssid["bss_load"]
            if key == "connected stations":
                bss_load["connected_stations"] = int(value) or None
            elif key == "channel utilization":
                m = re.match(r'(\d+)\s*\((\d+)\s*%\)', value)
                if m:
                    bss_load["channel_utilization_raw"] = int(m.group(1))
                    bss_load["channel_utilization_percent"] = int(m.group(2))
            elif key == "medium available capacity":
                m = re.match(r'(\d+)\s*\(([^)]+)\)', value)
                if m:
                    bss_load["medium_available_capacity"] = int(m.group(1))
                    bss_load["medium_available_capacity_unit"] = m.group(2).strip()
            continue
 
        # BSSID-level fields
        if indent == 9:
            key, _, value = line.partition(':')
            key, value = key.strip().lower(), value.strip()
            in_bss_load = False
 
            if key == "signal":
                current_bssid["signal_percent"] = int(value.replace('%', '').strip())
            elif key == "radio type":
                current_bssid["radio_type"] = value
            elif key == "band":
                current_bssid["band"] = value
            elif key == "channel":
                current_bssid["channel"] = int(value)
            elif key == "details":
                current_bssid["details"] = value.strip('() ') or None
            elif key == "bss load":
                current_bssid["bss_load"] = {
                    "connected_stations": None,
                    "channel_utilization_raw": None,
                    "channel_utilization_percent": None,
                    "medium_available_capacity": None,
                    "medium_available_capacity_unit": None,
                }
                in_bss_load = True
            elif key == "qos mscs supported":
                current_bssid["qos_mscs_supported"] = True if value == '1' else False
            elif key == "qos map supported":
                current_bssid["qos_map_supported"] = True if value == '1' else False
            elif key.startswith("basic rates"):
                current_bssid["basic_rates_mbps"] = _parse_rates(value)
            elif key.startswith("other rates"):
                current_bssid["other_rates_mbps"] = _parse_rates(value)
 
    return networks
 
 
def _parse_rates(value: str) -> List[float]:
    rates = []
    for token in value.split():
        try:
            rates.append(float(token) if '.' in token else int(token))
        except ValueError:
            pass
    return rates