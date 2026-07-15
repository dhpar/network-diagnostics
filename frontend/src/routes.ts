
const API_URL = 'http://localhost:5000';
const ORIGIN = 'http://localhost:3000';

export default {
    API_DOMAIN: API_URL,
    ORIGIN: ORIGIN,
    DASHBOARD: '/',
    NETWORK_INFO: `${API_URL}/api/network/info`,
    DEVICES: `${API_URL}/api/devices`,
    PUTDEVICELABEL: (mac: string) => `${API_URL}/api/devices/${mac}/label`,
    DELETEDEVICE: (mac: string) => `${API_URL}/api/devices/${mac}`,
    SCAN_WIFI: `${API_URL}/api/wifi/scan`,
    DNS_TEST: `${API_URL}/api/dns/test`,
    TRACEROUTE: `${API_URL}/api/traceroute?target=google.com`,
}