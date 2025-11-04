import { useState, useEffect, type FunctionComponent } from 'react';
import { Wifi, Network, Globe, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Dashboard } from './components/Dashboard/Dashboard';
import ROUTES from './routes';
import { fetchResource } from './utils';
import { useQuery } from '@tanstack/react-query';
import type { TabType, IscanInfo, TDevices, TDNSResults, TWifiNetworks } from './App.types';
import type { INetworkInfo } from './hooks/useNetworkInfo';

const App: FunctionComponent = () => {
  const [connected, setConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [lastUpdate, setLastUpdate] = useState<Date>();
  const headers = new Headers({
    
    'Access-Control-Allow-Origin': ROUTES.ORIGIN,
    // 'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Method': '*',
    'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, access-control-allow-method',
    
  })
  const scanDNSRequest = new Request(ROUTES.DNS_TEST, {
    method: 'GET',
    headers
  });
  const networkInfoRequest = new Request(ROUTES.NETWORK_INFO, {
    method: 'GET',
    headers
  });
  const devicesRequest = new Request(ROUTES.DEVICES, {
    method: 'GET',
    headers
  });
  const scanNetworkRequest = new Request(ROUTES.SCAN_NETWORK, {
    method: 'POST',
    headers
  });
  const scanWifiRequest = new Request(ROUTES.SCAN_WIFI, {
    method: 'GET',
    headers
  });
  const scanNetwork = useQuery({ 
      queryKey: ['scan network'], 
      queryFn: () => fetchResource<IscanInfo>(scanNetworkRequest),
  });
  const scanWifi = useQuery({ 
      queryKey: ['scan wifi'], 
      queryFn: () => fetchResource<TWifiNetworks>(scanWifiRequest),
  });
  const scanDNS = useQuery({ 
      queryKey: ['scan DNS'], 
      queryFn: () => fetchResource<TDNSResults>(scanDNSRequest),
  });
  const networkInfo = useQuery({ 
      queryKey: ['Net Info'], 
      queryFn: () => fetchResource<INetworkInfo>(networkInfoRequest)
  });
  const devices = useQuery({ 
      queryKey: ['devices'], 
      queryFn: () => fetchResource<TDevices>(devicesRequest)
  });

  const handleScanNetwork = () => scanNetwork.refetch()
  const handleScanWifi = () => scanWifi.refetch();
  const handleScanDNS = () => scanDNS.refetch();
  
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
  // const [data, setData] = useState<NetworkInfo>();
  
  useEffect(() => {
      setConnected(true);
      setLastUpdate(new Date());
  },[]);
  
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
          {activeTab === 'dashboard' && 
              <Dashboard 
                network={networkInfo} 
                devices={devices} 
                scanNetwork={scanNetwork} 
                scanWifi={scanWifi} 
                scanDNS={scanDNS} 
              />
          }
        {/* Devices Tab */}
        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Network Devices</h2>
              <button
                onClick={handleScanNetwork}
                disabled={scanNetwork.isPending}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${scanNetwork.isPending ? 'animate-spin' : ''}`} />
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
                  {devices.data?.devices?.map((device, idx) => (
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
              {devices.data?.count === 0 && (
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
                onClick={handleScanWifi}
                disabled={scanWifi.isPending}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <Wifi className="w-4 h-4" />
                <span>Scan WiFi</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanWifi.data?.map((network, idx) => (
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
            {scanWifi.data?.length === 0 && (
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
                onClick={handleScanDNS}
                disabled={scanDNS.isPending}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span>Test DNS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scanDNS.data?.map((result, idx) => (
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
            {scanDNS.data?.length === 0 && (
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
