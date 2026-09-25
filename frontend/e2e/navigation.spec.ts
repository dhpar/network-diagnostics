import { expect, test } from '@playwright/test';

test('loads the dashboard and navigates to DNS lookup', async ({ page }) => {
  const apiResponses: Record<string, unknown> = {
    '/api/network/info': {},
    '/api/devices': { devices: [] },
    '/api/dns/': [],
  };

  await page.route('http://localhost:5000/**', async (route) => {
    const request = route.request();
    const requestHeaders = request.headers();
    const corsHeaders = {
        'access-control-allow-origin': requestHeaders.origin ?? '*',
        'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'access-control-allow-headers': 'access-control-allow-origin, access-control-allow-method, access-control-allow-headers, content-type',
    };

    if (request.method() === 'OPTIONS') {
        await route.fulfill({ 
            status: 204, 
            headers: corsHeaders 
        });
        return;
    }

    const pathname = new URL(request.url()).pathname;
    await route.fulfill({
        status: 200,
        headers: { 
            ...corsHeaders, 
            'content-type': 'application/json' 
        },
        body: JSON.stringify(apiResponses[pathname] ?? {}),
    });
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Network Diagnostics' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'DNS Lookup' }).click();
  await expect(page.getByRole('heading', { name: 'DNS lookup' })).toBeVisible();
});