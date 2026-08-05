import subprocess
from venv import logger
import subprocess
from typing import Optional, Dict, Any

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
    