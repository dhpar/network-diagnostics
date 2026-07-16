import { RefreshCw, Circle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import Layout from '../Layout';
import { getResource, fetchResource } from '../utils';
import type { TDevices, TStatusType } from '../App.types';
import ROUTES from '../routes';
import EditDevice from '../components/Device/EditDevice';
import type { FunctionComponent } from 'react';
import { useForm } from '@tanstack/react-form';

export const Route = createFileRoute('/Devices')({
  component: Devices,
})

const ConnectionIcon:FunctionComponent<{status:TStatusType}> = ({status}) => {
    switch(status){
        case 'online':
            return <Circle className='w-5 h-5 text-green-500' />
        case 'offline':
            return <Circle className='w-5 h-5 text-red-500' />
        case 'unknown': default:
            return <Circle className='w-5 h-5 stroke-gray-700' />
    }
}

function Devices () {
    const form = useForm({
        defaultValues: {
            devices: [],
        },
    })

    const devicesRequest = getResource(ROUTES.DEVICES);
    const {data , refetch, isLoading} = useQuery({ 
        queryKey: ['devices'], 
        queryFn: () => fetchResource<TDevices>(devicesRequest)
    });
    return (
    <Layout>
        <form
            onSubmit={(event) => {
                event.preventDefault()
                event.stopPropagation()
                form.handleSubmit()
            }}
        >
            
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Label</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Hostname</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            <form.Field name="devices" mode="array">
                                {(field) => (
                                    <>
                                        {data?.devices?.map((device, idx) => (
                                            <tr key={idx} className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <ConnectionIcon status={device.status}/>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-blue-300">{device.ip}</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">{device.mac || 'Unknown'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">
                                                    <EditDevice device={device} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-300">{device.hostname || 'Unknown'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                            ))}            
                                        </>
                                    )}
                            </form.Field>
                            
                        </tbody>
                    </table>
                {data?.count === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        No devices found. Click "Refresh" to scan the network.
                    </div>
                )}
                </div>
            </div>    
        </form>
    </Layout>
  );
}
