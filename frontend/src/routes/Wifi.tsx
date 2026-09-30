import { createFileRoute } from '@tanstack/react-router';
import Layout from "../Layout";
import Card from "../components/Layout/Card/Card";
import { valueToPropertyColor } from "../Utils/cssClasses";
import { useScanWifi } from "../hooks/useScanWifi";
import SuspenseWrapper from "../components/States/SuspenseWrapper";
import { Signal, WifiIcon } from 'lucide-react';
import { ChartRadialShape } from '../components/Graphs/ChartRadial';

export const Route = createFileRoute('/Wifi')({
  component: Wifi,
});

function Wifi() {
    const { 
        data, 
        refetch, 
        isLoading, 
        isRefetching, 
        error, 
        isFetched 
    } = useScanWifi(100);

    return (
        <Layout 
            title='WiFi Status' 
            isRefreshLoading={isLoading || isRefetching} 
            refetch={refetch}
        >
            <div className="space-y-6">
                <SuspenseWrapper 
                    message={error?.message || 'There was an error'}
                >
                    {isFetched && data && (<>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <Signal className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Signal Quality</span>
                                </div>
                                
                                    <ChartRadialShape value={data.signal_quality_percent || 0} />
                                
                            </Card>
                           
                            <Card className='flex flex-1 flex-wrap items-baseline'>
                                <div className="flex items-center space-x-2 mb-2">
                                    <WifiIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Signal Strength</span>
                                </div>
                                <div className='w-full p-4'>
                                    <div className='flex w-full justify-between'>
                                        <span className='-ml-6'>-90 dbm</span>
                                        <span className='-mr-6'>-30 dbm</span>
                                    </div>
                                    <input type="range" min="-90" max="-30" value={`${data.signal_strength_dbm}`} className='w-full appearance-none bg-emerald-500 accent-indigo-600 rounded-full' list='markers' disabled />
                                    <datalist id="markers" className='flex writing-v-lr justify-between w-full font-bold text-gray-400 text-sm'>
                                        <option value="-90">-90 dbm</option>
                                        <option value="-75">-75 dbm</option>
                                        <option value="-60">-60 dbm</option>
                                        <option value="-45">-45 dbm</option>
                                        <option value="-30">-30 dbm</option>
                                    </datalist>
                                    <span className='flex-1 w-full items-stretch p-4 font-mono text-2xl text-blue-300'>     
                                        {data.signal_strength_dbm !== undefined ? `${data.signal_strength_dbm} dBm` : 'N/A'}
                                    </span>
                                </div>
                            </Card>
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <WifiIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">SNR</span>
                                </div>
                                <p className="font-mono text-2xl text-green-300">
                                    {data.snr_db !== undefined ? `${data.snr_db} dB` : 'N/A'}
                                </p>
                            </Card>
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <WifiIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Channel / Frequency</span>
                                </div>
                                <p className="font-mono text-2xl text-gray-300">
                                    {data.channel !== undefined ? `${data.channel} / ${data.frequency_ghz?.toFixed(3)} GHz` : 'N/A'}
                                </p>
                            </Card>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <span className="text-gray-400 text-sm">Interference Level</span>
                                <p className={`font-mono text-xl mt-1 ${valueToPropertyColor(parseInt(data.interference_level || '0'))} capitalize`}>
                                    {data.interference_level ?? 'Unknown'}
                                </p>
                            </Card>
                            <Card>
                                <span className="text-gray-400 text-sm">Status</span>
                                <p className={`font-mono text-xl mt-1 ${data.status === 'connected' ? 'text-green-500' : 'text-gray-300'} capitalize`}>
                                    {data.status ?? 'Unknown'}
                                </p>
                            </Card>
                        </div>

                        {data.recommendation && (
                            <Card>
                                <span className="text-gray-400 text-sm">Recommendation</span>
                                <p className="text-lg mt-1 text-gray-100">{data.recommendation}</p>
                            </Card>
                        )}

                        {data.interface && (
                            <Card className={'p-[initial]'}>
                                <table className="w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Interface
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                                Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        { Object.entries(data.interface).map(([key, value], id) => 
                                        <tr className="hover:bg-gray-700 transition-colors" key={`interface-property-${id}`}>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">
                                                {key.split('_').join(' ')
                                                .toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">
                                                {value}
                                            </td>
                                        </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </>)}
                </SuspenseWrapper>
            </div>
        </Layout>
    )
}
