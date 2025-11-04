import { Activity, Globe, Waypoints, RefreshCw, Wifi, Network } from "lucide-react";
import { type FunctionComponent } from "react";
import Card from "../Card/Card";
import { Device } from "../Device/Device";
import type { UseQueryResult } from "@tanstack/react-query";
import type { INetworkInfo } from "../../hooks/useNetworkInfo";
import type { IscanInfo, TDevices, TDNSResults, TWifiNetworks } from "../../App.types";
import { ErrorBoundary } from "react-error-boundary";

interface IDashboard {
    network: UseQueryResult<INetworkInfo, Error>;
    devices: UseQueryResult<TDevices, Error>;
    scanNetwork: UseQueryResult<IscanInfo, Error>;
    scanWifi: UseQueryResult<TWifiNetworks, Error>;
    scanDNS: UseQueryResult<TDNSResults, Error>;
}    

export const Dashboard: FunctionComponent<IDashboard> = ({
    network: {
        data: networkData, 
        isPending: isNetworkLoading, 
        isError: isNetworkError,
        error: networkError
    }, 
    devices: {
        data: devicesData, 
        isPending: isDevicesLoading, 
        isError: isDevicesError,
        error: deviceskError
    }, 
    scanNetwork: {
      isPending: isScanNetworkLoading, 
      refetch: refetchScanNetwork
    }, 
    scanWifi: {
      isPending: isScanWifiLoading, 
      refetch: refetchScanWifi
    }, 
    scanDNS: {
        isPending: isScanDNSLoading, 
        refetch: refetchScanDNS
    } 
}) => {
    const getStatusColor = (status: string) => 
        status === 'online' ? 'text-green-500' : 'text-red-500';
    const handleScanNetwork = () => refetchScanNetwork()
    const handleScanWifi = () => refetchScanWifi();
    const handleScanDNS = () => refetchScanDNS();
    console.log({devicesData});

    const devicesValue = devicesData && !isDevicesError? devicesData.devices.filter(d => d.status === 'online').length.toString() : deviceskError?.message || 'Error!';
    return ( 
        <div className="space-y-6">
            {/* Network Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <Device 
                        label={'Local IP'} 
                        icon={ 
                            <Globe 
                                stroke='var(--color-blue-400)' 
                                className="w-6 h-6 text-transparent" /> 
                        } 
                        value={ !isNetworkError && networkData?.local_ip? networkData.local_ip : networkError?.message || 'Error!'}
                        isLoading={isNetworkLoading}
                    />
                </Card>
                <Card>
                    <Device 
                        label={'Gateway'} 
                        icon={ <Network stroke={`var(--color-green-400)`} className="w-6 h-6 text-transparent" /> } 
                        value={!isNetworkError && networkData?.gateway? networkData.gateway : networkError?.message || 'Error!'}
                        isLoading={isNetworkLoading}
                    />
                </Card>
                <Card>
                    <Device 
                        label={'Subnet'} 
                        icon={ <Waypoints stroke={`var(--color-purple-400)`} className="w-6 h-6 text-transparent" /> } 
                        value={!isNetworkError && networkData?.subnet? networkData?.subnet : networkError?.message || 'Error!'}
                        isLoading={isNetworkLoading}
                    />
                </Card>
                <Card>
                    <ErrorBoundary
                    fallbackRender={({ error }) => (
                        <div className="p-4 bg-red-900/20 border border-red-900 rounded-lg">
                        <p className="text-red-500">Something went wrong: {error.message}</p>
                        </div>
                    )}
                    >
                        <Device 
                            label={'Devices'} 
                            icon={ <Activity stroke={`var(--color-amber-400)`} className="w-6 h-6 text-transparent" />} 
                            value={devicesValue}
                            isLoading={isDevicesLoading}
                        />
                    </ErrorBoundary>
                </Card>

            </div>

            {/* Quick Actions */}
            <Card>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="flex flex-wrap gap-4">
                <button
                    onChange={handleScanNetwork}
                    disabled={isScanNetworkLoading}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${isScanNetworkLoading ? 'animate-spin' : ''}`} />
                    <span>Scan Network</span>
                </button>
                <button
                    onClick={handleScanWifi}
                    disabled={isScanWifiLoading}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6 py-3 rounded-lg transition-colors"
                >
                    <Wifi className="w-5 h-5" />
                    <span>Scan WiFi</span>
                </button>
                <button
                    onClick={handleScanDNS}
                    disabled={isScanDNSLoading}
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
                {devicesData?.devices.slice(0, 5).map((device, idx) => (
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
                {devicesData?.count === 0 && (
                    <p className="text-center text-gray-400 py-4">No devices detected yet</p>
                )}
                </div>
            </Card>
        </div>
    )
}

