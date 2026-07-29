import socket
import unittest
from unittest.mock import patch

from flask import Flask

from backend.routes import routes


class RoutesTestCase(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.register_blueprint(routes)
        self.app.testing = True
        self.client = self.app.test_client()

    def test_health_returns_status_and_timestamp(self):
        response = self.client.get('/api/health')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/json')

        body = response.get_json()
        self.assertEqual(body['status'], 'healthy')
        self.assertIn('timestamp', body)

    @patch('backend.routes.net_config.local_ip', return_value='192.168.1.20')
    @patch('backend.routes.net_config.gateway_ip', return_value='192.168.1.1')
    @patch('backend.routes.get_net_mask', return_value='24')
    def test_network_info_returns_subnet_and_gateway(self, mock_mask, mock_gateway, mock_local_ip):
        response = self.client.get('/api/network/info')

        self.assertEqual(response.status_code, 200)
        body = response.get_json()

        self.assertEqual(body['local_ip'], '192.168.1.20')
        self.assertEqual(body['gateway'], '192.168.1.1')
        self.assertEqual(body['subnet'], '192.168.1.0/24')

    def test_ping_invalid_ip_returns_400(self):
        response = self.client.get('/api/ping/not-a-valid-ip')

        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertEqual(body['error'], 'Invalid IP address')

    @patch('backend.routes.ping_host', return_value=True)
    def test_ping_online_returns_status_online(self, mock_ping):
        response = self.client.get('/api/ping/192.168.1.100')

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['ip'], '192.168.1.100')
        self.assertEqual(body['status'], 'online')

    @patch('backend.routes.ping_host', return_value=False)
    def test_ping_offline_returns_status_offline(self, mock_ping):
        response = self.client.get('/api/ping/192.168.1.101')

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['status'], 'offline')

    @patch('backend.routes.socket.gethostbyname')
    def test_dns_test_returns_results_for_each_domain(self, mock_gethostbyname):
        def fake_lookup(domain):
            if domain == 'cloudflare.com':
                raise socket.gaierror('failure')
            return '1.1.1.1'

        mock_gethostbyname.side_effect = fake_lookup

        response = self.client.get('/api/dns/')

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(len(body), 3)

        self.assertEqual(body[0]['status'], 'success')
        self.assertEqual(body[0]['ip'], '1.1.1.1')
        self.assertEqual(body[1]['status'], 'failed')
        self.assertIn('error', body[1])
        self.assertEqual(body[2]['status'], 'success')

    # @patch('backend.routes.get_wifi_scan_from_windows', return_value=[{'ssid': 'MyWifi'}])
    # def test_wifi_scan_returns_networks(self, mock_scan):
    #     response = self.client.get('/api/wifi/scan')

    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(response.content_type, 'application/json')

    #     body = response.get_json()
    #     self.assertEqual(body['count'], 1)
    #     self.assertEqual(body['networks'][0]['ssid'], 'MyWifi')

    # @patch('backend.routes.get_wifi_scan_from_windows', return_value=[])
    # def test_wifi_scan_returns_no_networks_message(self, mock_scan):
    #     response = self.client.get('/api/wifi/scan')

    #     self.assertEqual(response.status_code, 200)
    #     self.assertEqual(response.get_data(as_text=True), 'No networks found')

    # @patch('backend.routes.get_wifi_scan_from_windows', side_effect=RuntimeError('scan failure'))
    # def test_wifi_scan_error_returns_500(self, mock_scan):
    #     response = self.client.get('/api/wifi/scan')

    #     self.assertEqual(response.status_code, 500)
    #     body = response.get_json()
    #     self.assertEqual(body['error'], 'WiFi scanning requires a native Windows Python with pywifi installed')

    def test_traceroute_missing_target_returns_400(self):
        response = self.client.get('/api/traceroute')

        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertEqual(body['error'], 'Missing required query param: target')

    @patch('backend.routes.traceroute_host', side_effect=ValueError('Invalid target provided'))
    def test_traceroute_invalid_target_returns_400(self, mock_traceroute):
        response = self.client.get('/api/traceroute?target=badhost')

        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid target provided', response.get_data(as_text=True))

    @patch('backend.routes.traceroute_host', side_effect=RuntimeError('unexpected'))
    def test_traceroute_unexpected_error_returns_500(self, mock_traceroute):
        response = self.client.get('/api/traceroute?target=example.com')

        self.assertEqual(response.status_code, 500)
        self.assertIn('Traceroute failed', response.get_data(as_text=True))

    @patch('backend.routes.get_devices_with_label_db', return_value=[{'mac': 'AA:BB:CC:DD:EE:FF', 'ip': '192.168.1.2', 'hostname': 'device', 'vendor': 'vendor', 'last_seen': '2026-01-01T12:00:00', 'status': 'online', 'label': 'Home'}])
    def test_get_devices_returns_device_list(self, mock_get_devices):
        response = self.client.get('/api/devices')

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['devices'][0]['mac'], 'AA:BB:CC:DD:EE:FF')
        self.assertEqual(body['devices'][0]['label'], 'Home')

    def test_set_device_label_missing_label_returns_400(self):
        response = self.client.put('/api/devices/update/aa:bb:cc:dd:ee:ff/label', json={})

        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertEqual(body['error'], 'label is required')

    @patch('backend.routes.update_devices_label_db')
    def test_set_device_label_updates_label(self, mock_update_label):
        response = self.client.put('/api/devices/update/aa:bb:cc:dd:ee:ff/label', json={'label': 'Office'})

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['mac'], 'AA:BB:CC:DD:EE:FF')
        self.assertEqual(body['label'], 'Office')
        mock_update_label.assert_called_once_with('AA:BB:CC:DD:EE:FF', 'Office')

    def test_delete_device_label_missing_label_returns_400(self):
        response = self.client.delete('/api/devices/delete/aa:bb:cc:dd:ee:ff/label', json={})

        self.assertEqual(response.status_code, 400)
        body = response.get_json()
        self.assertEqual(body['error'], 'label is required')

    @patch('backend.routes.delete_label_db', return_value=False)
    def test_delete_device_label_not_found_returns_404(self, mock_delete):
        response = self.client.delete('/api/devices/delete/aa:bb:cc:dd:ee:ff/label', json={'label': 'Office'})

        self.assertEqual(response.status_code, 404)
        body = response.get_json()
        self.assertEqual(body['error'], 'No label found for mac AA:BB:CC:DD:EE:FF')

    @patch('backend.routes.delete_label_db', return_value=True)
    def test_delete_device_label_success(self, mock_delete):
        response = self.client.delete('/api/devices/delete/aa:bb:cc:dd:ee:ff/label', json={'label': 'Office'})

        self.assertEqual(response.status_code, 200)
        body = response.get_json()
        self.assertEqual(body['mac'], 'AA:BB:CC:DD:EE:FF')
        self.assertTrue(body['deleted'])

    @patch('backend.routes.lease_DHCP_time', return_value={'lease_seconds': 1800})
    def test_get_lease_time_returns_lease_object(self, mock_lease):
        response = self.client.get('/api/devices/lease_time')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {'lease_seconds': 1800})


if __name__ == '__main__':
    unittest.main()
