import { expect, test, type Page } from '@playwright/test';

type ApiRequest = {
  method: string;
  pathname: string;
  body?: unknown;
};

const device = {
  ip: '192.168.1.2',
  mac: 'AA:BB:CC:DD:EE:FF',
  hostname: 'router.local',
  vendor: 'Example Networks',
  last_seen: '2026-09-25T12:00:00',
  status: 'online',
  label: 'Living Room Router',
};

async function stubApi(page: Page, wrapTraceroute = true) {
  const requests: ApiRequest[] = [];

  await page.route('http://localhost:5000/**', async (route) => {
    const request = route.request();
    const requestHeaders = request.headers();
    const corsHeaders = {
      'access-control-allow-origin': requestHeaders.origin ?? '*',
      'access-control-allow-methods': 'GET, PUT, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type, access-control-allow-origin, access-control-allow-method',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }

    const url = new URL(request.url());
    const method = request.method();
    const body = request.postDataJSON() as unknown;
    requests.push({ method, pathname: url.pathname, ...(body ? { body } : {}) });

    let response: unknown = {};
    if (url.pathname === '/api/health') {
      response = { status: 'healthy', timestamp: '2026-09-25T12:00:00' };
    } else if (url.pathname === '/api/ping/192.0.2.10') {
      response = '192.0.2.10';
    } else if (url.pathname === '/api/network/info') {
      response = { local_ip: '192.168.1.20', gateway: '192.168.1.1', subnet: '192.168.1.0/24' };
    } else if (url.pathname === '/api/devices') {
      response = { devices: [device] };
    } else if (url.pathname === '/api/devices/update/AA:BB:CC:DD:EE:FF/label' && method === 'PUT') {
      response = { mac: device.mac, label: (body as { label: string }).label };
    } else if (url.pathname === '/api/devices/delete/AA:BB:CC:DD:EE:FF/label' && method === 'DELETE') {
      response = { mac: device.mac, deleted: true };
    } else if (url.pathname === '/api/wifi/scan') {
      response = {
        signal_quality_percent: 82,
        signal_strength_dbm: -48,
        snr_db: 34,
        channel: 6,
        frequency_ghz: 2.437,
        interference_level: 'low',
        status: 'connected',
      };
    } else if (url.pathname === '/api/wifi/scan/neighbor') {
      response = [{
        ssid: 'Test Network',
        network_type: 'Infrastructure',
        authentication: 'WPA2-Personal',
        encryption: 'CCMP',
        bssids: [{
          bssid: '11:22:33:44:55:66',
          signal_percent: 75,
          band: '2.4 GHz',
          channel: 6,
          bss_load: { connected_stations: 3, channel_utilization_percent: 25 },
        }],
      }];
    } else if (url.pathname === '/api/dns/') {
      response = [{ domain: 'example.com', ip: '203.0.113.10', time_ms: 12, status: 'success' }];
    } else if (url.pathname === '/api/traceroute') {
      const traceroute = {
        target: '142.251.34.238',
        target_ip: 'google.com',
        total_hops: 3,
        timing: [
          { address: '192.168.1.1', hop_number: 1, traceroute_ms: 64 },
          { address: '207.109.2.28', hop_number: 2, traceroute_ms: 254 },
          { address: '142.251.34.238', hop_number: 3, traceroute_ms: 117 },
        ],
      };
      response = wrapTraceroute ? { json: traceroute } : traceroute;
    }

    await route.fulfill({
      status: 200,
      headers: { ...corsHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(response),
    });
  });

  return requests;
}

function expectRequest(requests: ApiRequest[], method: string, pathname: string) {
  expect(requests).toContainEqual(expect.objectContaining({ method, pathname }));
}

test('returns backend health from the health endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/');
  const response = await page.evaluate(async () => {
    const result = await fetch('http://localhost:5000/api/health');
    return { status: result.status, body: await result.json() };
  });

  expect(response.status).toBe(200);
  expect(response.body.status).toBe('healthy');
  expectRequest(requests, 'GET', '/api/health');
});

test('accepts an IP address through the ping endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/');
  const response = await page.evaluate(async () => {
    const result = await fetch('http://localhost:5000/api/ping/192.0.2.10');
    return { status: result.status, body: await result.json() };
  });

  expect(response.status).toBe(200);
  expect(response.body).toBe('192.0.2.10');
  expectRequest(requests, 'GET', '/api/ping/192.0.2.10');
});

test('loads network details from the network info endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/');

  await expect(page.getByText('192.168.1.20', { exact: true })).toBeVisible();
  expectRequest(requests, 'GET', '/api/network/info');
});

test('renders devices from the devices endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/Devices');

  await expect(page.getByText('Living Room Router').first()).toBeVisible();
  expectRequest(requests, 'GET', '/api/devices');
});

test('updates a device label through the label update endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/Devices');
  await page.getByRole('button', { name: /Edit the device.*label/ }).click();

  const labelInput = page.locator(`input[name="${device.mac}-label"]`);
  await labelInput.fill('Office Router');
  await labelInput.press('Enter');

  await expect.poll(() => requests.some((request) => request.method === 'PUT')).toBe(true);
  expect(requests).toContainEqual({
    method: 'PUT',
    pathname: `/api/devices/update/${device.mac}/label`,
    body: { label: 'Office Router' },
  });
});

test('deletes a device label through the label delete endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/Devices');
  await page.getByRole('button', { name: /Delete the device.*label/ }).click();

  await expect.poll(() => requests.some((request) => request.method === 'DELETE')).toBe(true);
  expect(requests).toContainEqual({
    method: 'DELETE',
    pathname: `/api/devices/delete/${device.mac}/label`,
    body: { label: device.label },
  });
});

test('renders Wi-Fi status from the Wi-Fi scan endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/Wifi');

  await expect(page.getByText('-48 dBm')).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toBeVisible();
  expectRequest(requests, 'GET', '/api/wifi/scan');
});

test('renders nearby networks from the Wi-Fi neighbor endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/WifiNetworks');

  await expect(page.getByText('Test Network')).toBeVisible();
  expectRequest(requests, 'GET', '/api/wifi/scan/neighbor');
});

test('renders DNS results from the DNS endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/DNS');

  await expect(page.getByText('example.com')).toBeVisible();
  await expect(page.getByText('203.0.113.10')).toBeVisible();
  expectRequest(requests, 'GET', '/api/dns/');
});

test('renders hops from the traceroute endpoint', async ({ page }) => {
  const requests = await stubApi(page);

  await page.goto('/Traceroute');

  await expect(page.getByText('Target: google.com (142.251.34.238)')).toBeVisible();
  await expect(page.getByText('Reached the destination')).toBeVisible();
  await expect(page.getByText('207.109.2.28')).toBeVisible();
  await expect(page.getByText('117 ms')).toBeVisible();
  await expect(page.getByRole('row', { name: /142\.251\.34\.238 reached 117 ms/ })).toBeVisible();
  expectRequest(requests, 'GET', '/api/traceroute');
});

test('renders the direct traceroute endpoint payload', async ({ page }) => {
  const requests = await stubApi(page, false);

  await page.goto('/Traceroute');

  await expect(page.getByText('Target: google.com (142.251.34.238)')).toBeVisible();
  await expect(page.getByText('Reached the destination')).toBeVisible();
  expectRequest(requests, 'GET', '/api/traceroute');
});