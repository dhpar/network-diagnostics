import { useQuery } from "@tanstack/react-query";
import type { TWifiScan } from "../App.types";
import { fetchResource, getResource } from "../utils";
import ROUTES from '../routes';
import { Wifi as WifiIcon, WifiOff as WifiOffIcon, Signal } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import Layout from "../Layout";
import { useState, type ChangeEventHandler } from "react";
import Card from "../components/Layout/Card/Card";

export const Route = createFileRoute('/Wifi')({
  component: Wifi,
});

function Wifi() {
    const wifiScanRequest = getResource(ROUTES.SCAN_WIFI);
    const [refetchInterval, setRefetchInterval] = useState("30");
    const { data, refetch, isLoading, isRefetching, isError, error } = useQuery({
        queryKey: ['Wifi scan'],
        queryFn: () => fetchResource<TWifiScan>(wifiScanRequest),
        refetchInterval: parseInt(refetchInterval)*1000
    });
    const handleChangeRefetch:ChangeEventHandler<HTMLInputElement> = (e) => setRefetchInterval(e.currentTarget.value);

    const signalColor = (quality: number | undefined) => {
        if(!quality) return 'text-gray-500';
        switch(true) {
            case (quality >= 80): return 'text-green-500';
            case (quality >= 60): return 'text-blue-500';
            case (quality >= 40): return 'text-amber-500';
            default: return 'text-red-500';
        }
    };

    const interferenceColor = (level: string | undefined) => {
        switch(level) {
            case 'low': return 'text-green-500';
            case 'medium': return 'text-amber-500';
            case 'high': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <Layout title='WiFi Status' isRefreshLoading={isLoading || isRefetching} refetch={refetch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="col-start-4">
                    <label htmlFor='refetchInterval'>Refetch Interval</label>
                    <input type='number' id="refetchInterval" name="refetchInterval" onChange={handleChangeRefetch} placeholder={`${refetchInterval}`} className="bg-gray-300 flex border-gray-700 text-gray-800 p-2 mb-4" />
                </div>
            </div>
            <div className="space-y-6">
                {isError && (
                    <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                        <WifiOffIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <p className="text-red-400">{`Error retrieving WiFi info: ${error?.message || error}`}</p>
                    </div>
                )}
                {!isError && isLoading && (
                    <div className="text-sm text-gray-400">Loading...</div>
                )}
                {!isError && !isLoading && data && (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <div className="flex items-center space-x-2 mb-2">
                                    <Signal className="w-5 h-5 text-blue-400" />
                                    <span className="text-gray-400 text-sm">Signal Quality</span>
                                </div>
                                <p className={`font-mono text-2xl ${signalColor(data.signal_quality_percent)}`}>
                                    {data.signal_quality_percent !== undefined ? `${data.signal_quality_percent}%` : 'N/A'}
                                    
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
                                <p className={`font-mono text-xl mt-1 ${interferenceColor(data.interference_level)} capitalize`}>
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
                                        {data.interface.name && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Name</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.name}</td>
                                            </tr>
                                        )}
                                        {data.interface.SSDI && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">SSID</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-blue-300 text-right">{data.interface.SSDI}</td>
                                            </tr>
                                        )}
                                        {data.interface.state && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">State</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.state}</td>
                                            </tr>
                                        )}
                                        {data.interface.band && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Band</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.band}</td>
                                            </tr>
                                        )}
                                        {data.interface.radio_type && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Radio Type</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.radio_type}</td>
                                            </tr>
                                        )}
                                        {data.interface.authentication && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Authentication</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.authentication}</td>
                                            </tr>
                                        )}
                                        {data.interface.cipher && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Cipher</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.cipher}</td>
                                            </tr>
                                        )}
                                        {data.interface.recieve_rate_mbps && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Receive Rate</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.recieve_rate_mbps} Mbps</td>
                                            </tr>
                                        )}
                                        {data.interface.transmit_rate_mbps && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Transmit Rate</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.transmit_rate_mbps} Mbps</td>
                                            </tr>
                                        )}
                                        {data.interface.signal && (
                                            <tr className="hover:bg-gray-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">Signal</td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-100 text-right">{data.interface.signal}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </Layout>
    )
}
