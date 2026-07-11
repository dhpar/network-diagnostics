import { type FunctionComponent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { TTracerouteHop } from "../../App.types";
import { fetchResource } from "../../utils";
import ROUTES from '../../routes';
import { Globe, RefreshCw, Circle } from "lucide-react";

export const Traceroute:FunctionComponent<{}> = () => {
    const getResource = (route:string) => new Request(
        route, 
        {
            method: 'get',
            headers: {
                'Access-Control-Allow-Origin': ROUTES.ORIGIN,
                'Access-Control-Allow-Method': '*',
                'Access-Control-Allow-Headers': 'Access-Control-Allow-Origin, Access-Control-Allow-Credentials, access-control-allow-method',
            }
        }
    );
    const tracerouteRequest = getResource(ROUTES.TRACEROUTE);
    const {data, isError, error, isPending, refetch, isLoading} = useQuery({ 
        queryKey: ['scan DNS'], 
        queryFn: () => {
            const res = fetchResource<TTracerouteHop>(tracerouteRequest);
            return res;
        },
        // enabled: false
    });
    if (isPending) return <div>Loading...</div>;
    if (isError) {
        return <div className="space-y-6">
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
    }
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
        <>
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
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
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
                        <tr >
                            <td className="flex flex-1 px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-right">{data.timing.traceroute_ms}ms</td>
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
    </>
    )
}
