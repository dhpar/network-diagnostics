import scapy.all as scapy
import netifaces


def is_locally_administered_mac(mac):
    """
    Checks the U/L bit in a MAC address. If set, this MAC was randomly
    generated (common for phone privacy features) rather than assigned by
    the actual hardware manufacturer, meaning vendor lookup will never
    succeed for it, not because our database is incomplete.
    """
    first_octet = int(mac.split(':')[0], 16)
    return bool(first_octet & 0b00000010)

def get_net_mask2():
    # List all available network interfaces
    interfaces = netifaces.interfaces()
    print("Interfaces:", interfaces)

    # Get specific interface addresses
    for iface in interfaces:
        addrs = netifaces.ifaddresses(iface)
        # Address Family 2 is typically AF_INET (IPv4)
        if netifaces.AF_INET in addrs:
            for ipv4 in addrs[netifaces.AF_INET]:
                print(f"{iface} IPv4: {ipv4['addr']}")
                
def collect_candidates(local_ip, allow_host_routes):
    found = []
    for net, msk, gw, iface, addr, metric in scapy.conf.route.routes:
        if addr != local_ip or gw != '0.0.0.0':
            continue
        if not allow_host_routes and msk == 0xFFFFFFFF:
            continue
        if 0xE0000000 <= net <= 0xEFFFFFFF:  # 224.0.0.0/4 multicast range
            continue
        found.append((net, msk))
    return found

def get_net_mask():
    """
    Returns the CIDR prefix length (e.g. 24) of the local machine's subnet,
    derived from scapy's routing table.

    Normally excludes /32 (host-specific) and multicast routes when looking
    for the real LAN subnet. But if NOTHING else qualifies, that itself is a
    signal we're likely on a VPN's point-to-point tunnel, where /32 is the
    genuinely correct answer, not a host-route artifact, so we fall back to
    allowing it in that case.
    """
    from backend.utils import net_config

    candidates = collect_candidates(net_config.local_ip, allow_host_routes=False)
    get_net_mask2()
    if not candidates:
        # Nothing but /32 and multicast entries matched, likely a VPN tunnel
        candidates = collect_candidates(net_config.local_ip, allow_host_routes=True)
        return None

    _, msk = min(candidates, key=lambda pair: bin(pair[1]).count('1'))
    
    return bin(msk).count('1')

def mac_lookup_vendor(mac):
    """
    Looks up the manufacturer for a device's MAC address using scapy's
    built-in offline OUI (Organizationally Unique Identifier) database,
    the first 3 bytes of any MAC address identify the manufacturer, this
    is a public IEEE registry, no network call needed.

    Returns None if the OUI isn't in scapy's database (happens for newer
    or less common vendors, or for randomized/private MAC addresses that
    some phones use, which have no real manufacturer OUI at all).
    """
    result = scapy.conf.manufdb._get_manuf(mac)
    
    return None if result.lower() == mac.lower() else result
