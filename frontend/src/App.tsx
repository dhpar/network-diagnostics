import { useState, useEffect, Suspense } from 'react';
import { Activity, Wifi, Network, Globe, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import io from 'socket.io-client';
import Card from './components/Card/Card';
import Device from './components/Device/Device';
import { ErrorBoundary } from 'react-error-boundary';

const API_URL = 'http://localhost:5000';

// Types
interface Device {
  id?: number;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  last_seen?: string;
  status: string;
}

interface NetworkInfo {
  local_ip?: string;
  gateway?: string;
  subnet?: string;
}

interface WifiNetwork {
  ssid: string;
  signal: number;
  channel?: number;
  security?: string;
}

interface DnsResult {
  domain: string;
  ip?: string;
  time_ms?: number;
  status: 'success' | 'failed';
  error?: string;
}

interface DevicesUpdateData {
  devices: Device[];
}

type TabType = 'dashboard' | 'devices' | 'wifi' | 'dns';

const App: React.FC = () => {
  // const [socket, setSocket] = useState<Socket | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({});
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [dnsResults, setDnsResults] = useState<DnsResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize WebSocket connection
    const socketInstance = io(API_URL);

    // WebSocket event handlers
    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Connected to backend');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from backend');
    });

    socketInstance.on('devices_update', (data: DevicesUpdateData) => {
      setDevices(data.devices);
      setLastUpdate(new Date());
    });

    // Initial data fetch
    fetchNetworkInfo();
    fetchDevices();

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const fetchNetworkInfo = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/api/network/info`);
      const data: NetworkInfo = await response.json();
      setNetworkInfo(data);
    } catch (error) {
      console.error('Error fetching network info:', error);
    }
  };

  const fetchDevices = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/devices`);
      const data: { devices: Device[] } = await response.json();
      setDevices(data.devices);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
    setLoading(false);
  };

  const scanNetwork = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/scan/network`, {
        method: 'POST'
      });
      const data: { devices: Device[] } = await response.json();
      setDevices(data.devices);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error scanning network:', error);
    }
    setLoading(false);
  };

  const scanWifi = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/wifi/scan`);
      const data: { networks?: WifiNetwork[] } = await response.json();
      setWifiNetworks(data.networks || []);
    } catch (error) {
      console.error('Error scanning WiFi:', error);
      alert('WiFi scanning may require elevated privileges');
    }
    setLoading(false);
  };

  const testDNS = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/dns/test`);
      const data: { results: DnsResult[] } = await response.json();
      setDnsResults(data.results);
    } catch (error) {
      console.error('Error testing DNS:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string): string => {
    return status === 'online' ? 'text-green-500' : 'text-red-500';
  };

  const getSignalStrength = (signal: number): string => {
    if (signal > 70) return 'text-green-500';
    if (signal > 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSignalBarColor = (signal: number): string => {
    if (signal > 70) return 'bg-green-500';
    if (signal > 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Network className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Network Diagnostics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-400">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {(['dashboard', 'devices', 'wifi', 'dns'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-900 text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Network Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <ErrorBoundary fallback={<div>Something went wrong</div>}>
                  <Suspense fallback={<div>Loading...</div>}>
                    <Device 
                      label={'Local IP'} 
                      icon={<Globe className="w-6 h-6 text-blue-400" />} 
                    />
                  </Suspense>
                </ErrorBoundary>
              </Card>
              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <Network className="w-6 h-6 text-green-400" />
                  <h3 className="text-lg font-semibold">Gateway</h3>
                </div>
                <p className="text-2xl font-mono text-green-300">{networkInfo.gateway || 'Loading...'}</p>
              </Card>

              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="w-6 h-6 text-purple-400" />
                  <h3 className="text-lg font-semibold">Active Devices</h3>
                </div>
                <p className="text-2xl font-mono text-purple-300">
                  {devices.filter(d => d.status === 'online').length}
                </p>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={scanNetwork}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Scan Network</span>
                </button>
                <button
                  onClick={scanWifi}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                >
                  <Wifi className="w-5 h-5" />
                  <span>Scan WiFi</span>
                </button>
                <button
                  onClick={testDNS}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  <span>Test DNS</span>
                </button>
              </div>
            </Card>

            {/* Recent Devices */}
            <Card>
              <h3 className="text-xl font-semibold mb-4">Recent Devices</h3>
              <div className="space-y-2">
                {devices.slice(0, 5).map((device, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-mono">{device.ip}</span>
                      <span className="text-gray-400 text-sm">{device.mac || 'Unknown'}</span>
                    </div>
                    <span className={`text-sm ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </div>
                ))}
                {devices.length === 0 && (
                  <p className="text-center text-gray-400 py-4">No devices detected yet</p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Network Devices</h2>
              <button
                onClick={scanNetwork}
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">MAC Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hostname</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {devices.map((device, idx) => (
                    <tr key={idx} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {device.status === 'online' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-300">{device.ip}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">{device.mac || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-300">{device.hostname || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {devices.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  No devices found. Click "Refresh" to scan the network.
                </div>
              )}
            </div>
          </div>
        )}

        {/* WiFi Tab */}
        {activeTab === 'wifi' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">WiFi Networks</h2>
              <button
                onClick={scanWifi}
                disabled={loading}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <Wifi className="w-4 h-4" />
                <span>Scan WiFi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wifiNetworks.map((network, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Wifi className={`w-5 h-5 ${getSignalStrength(network.signal)}`} />
                      <h3 className="font-semibold text-lg truncate">{network.ssid}</h3>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Signal Strength</span>
                      <span className={`font-mono ${getSignalStrength(network.signal)}`}>
                        {network.signal}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${getSignalBarColor(network.signal)}`}
                        style={{ width: `${network.signal}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {wifiNetworks.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <Wifi className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No WiFi networks found. Click "Scan WiFi" to search.</p>
                <p className="text-gray-500 text-sm mt-2">Note: WiFi scanning may require elevated privileges</p>
              </div>
            )}
          </div>
        )}

        {/* DNS Tab */}
        {activeTab === 'dns' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">DNS Diagnostics</h2>
              <button
                onClick={testDNS}
                disabled={loading}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>Test DNS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dnsResults.map((result, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg">{result.domain}</h3>
                    {result.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  {result.status === 'success' ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400 text-sm">Resolved IP</span>
                        <p className="font-mono text-blue-300">{result.ip}</p>
                      </div>
                      <div>
                        <span className="text-gray-400 text-sm">Response Time</span>
                        <p className="font-mono text-green-300">{result.time_ms}ms</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm">
                      <p>Error: {result.error}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {dnsResults.length === 0 && (
              <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No DNS tests performed yet. Click "Test DNS" to start.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-4 text-center text-gray-400 text-sm">
          Network Diagnostics MVP • Local Access Only
        </div>
      </footer>
    </div>
  );
};

export default App;
