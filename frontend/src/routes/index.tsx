import { createFileRoute } from '@tanstack/react-router'
import { Activity, Globe, Waypoints, RefreshCw, Network, Circle } from "lucide-react";
import { Device } from '../components/Device/Device';
import Card from '../components/Layout/Card/Card';
import Layout from '../Layout';
import useNetworkInfo from '../hooks/useNetworkInfo';
import useDevices from '../hooks/useDevices';
import SuspenseWrapper from '../components/States/SuspenseWrapper';

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
    const devices = useDevices();
    const {data, error, isError, isLoading } = useNetworkInfo();
    const getStatusColor = (status: string) => 
        status === 'online' ? 'text-green-500' : 'text-red-500';
    const devicesValue = devices.data && !devices.isError? 
        devices.data?.devices?.filter(d => d.status === 'online').length.toString() : devices.error?.message || 'Error!';
    const ipValue = !isError && data?.local_ip? 
        data.local_ip : 
        error?.message || 'Error!';
    return (
      <Layout title='Dashboard'>
        <div className="space-y-6">
            {/* Network Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <SuspenseWrapper message={`there was an error loading this component: ${devices.error?.message}`}>
                        <Device 
                            label={'Local IP'} 
                            icon={ 
                                <Globe 
                                    stroke='var(--color-blue-400)' 
                                    className="w-6 h-6 text-transparent" /> 
                            } 
                            value={ipValue}
                            isLoading={isLoading}
                        />
                    </SuspenseWrapper>  
                    
                </Card>
                <Card>
                    
                                        <SuspenseWrapper message={`there was an error loading this component: ${devices.error?.message}`}>

                        <Device 
                            label={'Gateway'} 
                            icon={ <Network stroke={`var(--color-green-400)`} className="w-6 h-6 text-transparent" /> } 
                            value={!isError && data?.gateway? data.gateway : error?.message || 'Error!'}
                            isLoading={isLoading}
                        />

                    </SuspenseWrapper>
                </Card>
                <Card>
                                        <SuspenseWrapper message={`there was an error loading this component: ${devices.error?.message}`}>

                        <Device 
                            label={'Subnet'} 
                            icon={ <Waypoints stroke={`var(--color-purple-400)`} className="w-6 h-6 text-transparent" /> } 
                            value={!isError && data?.subnet? data?.subnet : error?.message || 'Error!'}
                            isLoading={isLoading}
                        />

                    </SuspenseWrapper>
                </Card>
                <Card>
                    <SuspenseWrapper message={`there was an error loading this component: ${devices.error?.message}`}>

                        <Device 
                            label={'Devices'} 
                            icon={ <Activity stroke={`var(--color-amber-400)`} className="w-6 h-6 text-transparent" />} 
                            value={devicesValue}
                            isLoading={devices.isLoading}
                        />
                    </SuspenseWrapper>
                </Card>

            </div>          {/* Quick Actions */}
            <Card>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                    <button
                        onChange={() => devices.refetch()}
                        disabled={devices.isLoading}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 ${devices.isLoading ? 'animate-spin' : ''}`} />
                        <span>Scan Network</span>
                    </button>
                    
                </div>
            </Card>

            {/* Recent Devices */}
            <Card>
                <h3 className="text-xl font-semibold mb-4">Recent Devices</h3>
                    <SuspenseWrapper message={`there was an error loading this component: ${devices.error?.message}`}>

                    <div className="space-y-2">
                    {devices.data?.devices?.slice(0, 5).map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <Circle className={`w-5 h-5 ${device.status === 'online'? 'text-green-500': 'text-red-500'}`} />
                                <span className="font-mono">{device.hostname}</span>
                                <span className="text-gray-400 text-sm">{device.mac || 'Unknown'}</span>
                            </div>
                            <span className={`text-sm ${getStatusColor(device.status)}`}>
                                {device.status}
                            </span>
                        </div>
                    ))}
                    </div>
                {devices.data?.devices?.length === 0 && (
                    <p className="text-center text-gray-400 py-4">No devices detected yet</p>
                )}
                </SuspenseWrapper>
            </Card>
        </div>
      </Layout>
    )
}

