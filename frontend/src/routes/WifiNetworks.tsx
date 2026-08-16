import { createFileRoute } from "@tanstack/react-router";
import Card from "../components/Layout/Card/Card";
import { fetchResource, getResource } from "../utils";
import { useQuery } from "@tanstack/react-query";
import type { TWifiNetworksScan } from "../App.types";
import { useState } from "react";
import ROUTES from '../routes';
import Error from "../components/States/Error";
import Layout from "../Layout";
import { SkeletonTable } from "../components/States/Loading";
export const Route = createFileRoute('/WifiNetworks')({
  component: WifiNetwork,
});

function WifiNetwork() {
    const wifiNetworksRequest = getResource(ROUTES.SCAN_WIFI_NETWORKS);
    const [refetchInterval, setRefetchInterval] = useState("30");
    
    const {data, isSuccess, isLoading, isError, error, isRefetching, refetch} = useQuery({
        queryKey: ['Wifi Networks scan'],
        queryFn: () => fetchResource<TWifiNetworksScan>(wifiNetworksRequest),
        refetchInterval: parseInt(refetchInterval)*1000
    })

   
    // const table = useTable({ features, columns, data })
    return (
        <Layout title='WiFi Status' isRefreshLoading={isLoading || isRefetching} refetch={refetch}>
            {isError && <Error error={error}/>}
            {isSuccess && 
                <Card className={'p-[initial]'}>
                    <table className="w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Encryption
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Authentication
                                </th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {(isLoading || isRefetching) ? 
                            <SkeletonTable rows={3} cols={3} />
                            : data.map((network, id) => 
                                <tr className="hover:bg-gray-700 transition-colors whitespace-nowrap font-mono text-sm text-gray-400" key={`network-property-${id}`}>
                                    <td className="px-6 py-4">
                                        {network.ssid || "Hidden"}
                                    </td>
                                    <td className="px-6 py-4">
                                        {network.encryption}
                                    </td>
                                    <td className="px-6 py-4 ">
                                        {network.authentication}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </Card>
            }
        </Layout>
    )
}
