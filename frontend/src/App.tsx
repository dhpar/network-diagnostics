import { useState, type FunctionComponent } from 'react';
import { Dashboard } from './components/Dashboard/Dashboard';
import ROUTES from './routes';
import { fetchResource, getResource } from './utils';
import { useQuery } from '@tanstack/react-query';
import type { TabType, TDevices } from './App.types';
import type { INetworkInfo } from './hooks/useNetworkInfo';
import { DNS } from './components/DNS/DNS';
import Layout from './Layout';
import { Devices } from './components/Devices/Devices';
import { Traceroute } from './components/Traceroute/Traceroute';
import { Wifi } from './components/Wifi/Wifi';
import { Tabs } from './components/Tabs/Tabs';

const App: FunctionComponent = () => {
  const tabNames = ['dashboard', 'devices', 'wifi', 'DNS', 'traceroute'] as TabType[];
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const devicesRequest = getResource(ROUTES.DEVICES);
  const devices = useQuery({ 
    queryKey: ['devices'], 
    queryFn: () => fetchResource<TDevices>(devicesRequest)
  });
  const networkInfoRequest = getResource(ROUTES.NETWORK_INFO);  
  const networkInfo = useQuery({ 
    queryKey: ['Net Info'], 
    queryFn: () => fetchResource<INetworkInfo>(networkInfoRequest)
  });
  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <nav className="bg-gray-800 border-b border-gray-700">
          <div className="container mx-auto px-4">
            <div className="flex space-x-1">
              {tabNames.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab)
                  }}
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
          <div className="space-y-6">
            <Tabs activeTab={activeTab} devices={devices} network={networkInfo} />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-12">
          <div className="container mx-auto px-4 py-4 text-center text-gray-400 text-sm">
            Network Diagnostics • Local Access Only
          </div>
        </footer>
      </div>
    </Layout>
  );
};

export default App;
