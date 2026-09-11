import { Wifi as WifiIcon, Signal } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import Layout from "../Layout";
import { useState, type ChangeEventHandler } from "react";
import Card from "../components/Layout/Card/Card";
import Gauge from "../components/Graphs/Gauge";
import { valueToPropertyColor } from "../Utils/cssClasses";
import { useScanWifi } from "../hooks/useScanWifi";
import SuspenseWrapper from "../components/States/SuspenseWrapper";

export const Route = createFileRoute('/Wifi')({
  component: Wifi,
});

function Wifi() {
    const [ refetchInterval, setRefetchInterval ] = useState(1);
    const { 
        data, 
        refetch, 
        isLoading, 
        isRefetching, 
        error, 
        isFetched 
    } = useScanWifi(refetchInterval);
    const handleChangeRefetch:ChangeEventHandler<HTMLInputElement> = (e) => setRefetchInterval(parseInt(e.currentTarget.value));

    return (
        <Layout 
            title='WiFi Status' 
            isRefreshLoading={isLoading || isRefetching} 
            refetch={refetch}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-start-4">
                    <label htmlFor='refetchInterval'>Refetch Interval</label>
                    <input type='number' id="refetchInterval" name="refetchInterval" onChange={handleChangeRefetch} placeholder={`${refetchInterval}`} className="bg-gray-300 flex border-gray-700 text-gray-800 p-2 mb-4" />
                </div>
            </div>
            <div className="space-y-6">
                <SuspenseWrapper message={error?.message || 'There was an error'}>
                {isFetched && data && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <Signal className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Signal Quality</span>
                                </div>
                                <p className={`font-mono text-2xl`}>
                                    <Gauge 
                                        value={data.signal_quality_percent || 0}  
                                        className="mx-auto" 
                                        width={320}
                                        trackColor="fill-gray-300"
                                    />
                                </p>
                            </Card>
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <WifiIcon className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Signal Strength</span>
                                </div>
                                <p className="font-mono text-2xl text-blue-300">
                                    {data.signal_strength_dbm !== undefined ? `${data.signal_strength_dbm} dBm` : 'N/A'}
                                </p>
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
                    </>
                )}
                </SuspenseWrapper>
            </div>
        </Layout>
    )
}
