import { RefreshCw, CheckCircle, XCircle, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import Layout from '../Layout';
import { getResource, fetchResource } from '../utils';
import type { TDevices } from '../App.types';
import ROUTES from '../routes';

export const Route = createFileRoute('/Devices')({
  component: Devices,
})

function Devices () {
    const devicesRequest = getResource(ROUTES.DEVICES);
    const {data , refetch, isLoading} = useQuery({ 
        queryKey: ['devices'], 
        queryFn: () => fetchResource<TDevices>(devicesRequest)
    });
    return (
    <Layout>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Network Devices</h2>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                        {data?.devices?.map((device, idx) => (
                            <tr key={idx} className="hover:bg-gray-700 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <Circle className={`w-5 h-5 ${device.status === 'online'? 'text-green-500': 'text-red-500'}`} />
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
            {data?.count === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No devices found. Click "Refresh" to scan the network.
                </div>
            )}
            </div>
        </div>    
    </Layout>
  );
}
