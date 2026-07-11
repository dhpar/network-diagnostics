import { useQuery } from "@tanstack/react-query";
import type { TTracerouteHop } from "../App.types";
import { fetchResource, getResource } from "../utils";
import { Globe, RefreshCw, Circle } from "lucide-react";
import ROUTES from '../routes';
import Layout from '../Layout';
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/Traceroute')({
  component: Traceroute
});

function Traceroute() {
    const tracerouteRequest = getResource(ROUTES.TRACEROUTE);
    const {data, isError, error, isPending, refetch, isLoading} = useQuery({ 
        queryKey: ['Traceroute'], 
        queryFn: () => {
            const res = fetchResource<TTracerouteHop>(tracerouteRequest);
            return res;
        },
    });

    if (isPending || isLoading) {
        return <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Traceroute</h2>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="text-sm">Loading...</div>
                </div>
            </div>
        </Layout>;
    }

    if (isError) {
        return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Traceroute</h2>
                    <button
                        onClick={() => refetch()}
                        disabled={isLoading}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="text-red-400 text-sm">
                        {`Error retrieving traceroute: ${error}`}
                    </div>
                </div>
            </div>
        </Layout>
    )}

    const Status = ({hopStatus}: {hopStatus:string}) => {
        switch(hopStatus){
            case 'ok':
                return <Circle className="w-5 h-5 text-green-500 mr-6 stroke-gray-300" />
            case 'reached':
                return <Circle className="w-5 h-5 text-blue-500 mr-6 stroke-gray-300" />
            case 'timeout':
                return <Circle className="w-5 h-5 text-red-500 mr-6 stroke-gray-300" />
        }
    }

    return (
        <Layout>
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Traceroute</h2>
                <button
                    onClick={() =>{ 
                        refetch();
                    }}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                </button>
            </div>
            <h3 className="text-xl">Traceroute state: {data.reached? <span className="text-blue-500">Has reached the destination</span> :<span className="text-red-500">Hasn't reached the destination</span>}</h3>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-medium text-gray-300 uppercase text-center tracking-wider">Hop number</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-300  uppercase tracking-wider">IP Address</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Host Name</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Response time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                    {data?.hops.map((result, idx) => (
                       <tr key={idx} className="hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400">
                                <Status hopStatus = {result.status}/>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center">
                                {result.hop}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center">
                                {result.ip}
                            </td>
                            {result.status === 'ok' || result.status === 'reached'? (
                                <>
                                    <td className='px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center'>
                                        <p className="font-mono text-blue-300">{result.hostname}</p>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-right">
                                        <p className="font-mono text-green-300">{result.rtt_ms}ms</p>
                                    </td>
                                </>
                            ) : (
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-red-400 text-sm uppercase text-center">
                                    {result.status}
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">
                            Command time: <span className="text-lg text-blue-500">{data.timing.traceroute_ms}ms</span></td>
                        </tr>
                        {data.timing.estimated_one_way_ms && <tr>
                            <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Estimated one way time: <span className="text-lg text-blue-500">{data.timing.estimated_one_way_ms}ms</span></td>
                        </tr>}
                        {data.timing.destination_rtt_ms && <tr>
                            <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Round trip time to destination: <span className="text-lg text-blue-500">{data.timing.destination_rtt_ms}ms</span></td>
                        </tr>}
                        <tr>
                            <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">DNS lookup time: <span className="text-lg text-blue-500">{data.timing.dns_lookup_ms}ms</span></td>
                        </tr>
                            <tr>
                            <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Total time: <span className="text-lg text-blue-500">{data.timing.total_ms}ms</span></td>
                        </tr>
                    </tfoot>
                </table>
                {data?.hops.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                        <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No Traceroute performed yet. Click "Refresh" to start.</p>
                    </div>
                )}
            </div>
    </Layout>
    )
}
