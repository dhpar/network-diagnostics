import { useQuery } from "@tanstack/react-query";
import type { TWifiNetworks } from "../../App.types";
import { getResource, fetchResource } from "../../utils";
import ROUTES from '../../routes';
import { Wifi as WifiIcon } from 'lucide-react';

export const Wifi = () => {
    const scanWifiRequest = getResource(ROUTES.SCAN_WIFI);
    const scanWifi = useQuery({ 
        queryKey: ['scan wifi'], 
        queryFn: () => fetchResource<TWifiNetworks>(scanWifiRequest),
        enabled: false
    });
    
    const handleScanWifi = () => scanWifi.refetch();
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
        <div className="space-y-6">
            <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">WiFi Networks</h2>
            <button
                onClick={handleScanWifi}
                disabled={scanWifi.isPending}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
                <WifiIcon className="w-4 h-4" />
                <span>Scan WiFi</span>
            </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scanWifi.data?.map((network, idx) => (
                <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                    <WifiIcon className={`w-5 h-5 ${getSignalStrength(network.signal)}`} />
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
                <WifiIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No WiFi networks found. Click "Scan WiFi" to search.</p>
                <p className="text-gray-500 text-sm mt-2">Note: WiFi scanning may require elevated privileges</p>
            </div>
        )}
    </div>)
}