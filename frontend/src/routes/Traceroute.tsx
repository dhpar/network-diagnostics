import { Globe, Circle } from "lucide-react";
import Layout from '../Layout';
import { createFileRoute } from "@tanstack/react-router";
import useTraceroute from "../hooks/useTraceroute";
import SuspenseWrapper from "../components/States/SuspenseWrapper";

export const Route = createFileRoute('/Traceroute')({
  component: Traceroute
});

function Traceroute() {
    return (
        <SuspenseWrapper message="There was an error loading the traceroute">
            <Layout title={'Traceroute'}>
                <h3 className="text-xl">Traceroute state</h3>
                <TracerouteContent />
            </Layout>
        </SuspenseWrapper>
    );
}

function TracerouteContent() {
    const { data, refetch, isLoading } = useTraceroute();

    const statusColor = ({hopStatus}: {hopStatus:string}) => {
        switch(hopStatus){
            case 'ok':
                return 'text-green-500';
            case 'reached':
                return 'text-blue-500';
            case 'timeout':
                return 'text-red-500';
        }
    }

    return (
        <Layout title={'Traceroute'} isRefreshLoading={isLoading} refetch={refetch}>
            <h3 className="text-xl">Traceroute state</h3>
            <span className={data?.reached? `text-blue-500` : `text-red-500`}>
                {data?.reached? 'Has' : `Hasn't`} reached the destination
            </span>
            
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <>
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
                                    <Circle className={`w-5 h-5 ${statusColor({ hopStatus: result.status })} mr-6 stroke-gray-300`} />
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
                                Command time: <span className="text-lg text-blue-500">{data?.timing.traceroute_ms}ms</span></td>
                            </tr>
                            {data?.timing.estimated_one_way_ms && <tr>
                                <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Estimated one way time: <span className="text-lg text-blue-500">{data?.timing.estimated_one_way_ms}ms</span></td>
                            </tr>}
                            {data?.timing.destination_rtt_ms && <tr>
                                <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Round trip time to destination: <span className="text-lg text-blue-500">{data?.timing.destination_rtt_ms}ms</span></td>
                            </tr>}
                            <tr>
                                <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">DNS lookup time: <span className="text-lg text-blue-500">{data?.timing.dns_lookup_ms}ms</span></td>
                            </tr>
                                <tr>
                                <td colSpan={5} className="px-6 py-2 whitespace-nowrap font-mono text-gray-400 text-right text-sm">Total time: <span className="text-lg text-blue-500">{data?.timing.total_ms}ms</span></td>
                            </tr>
                        </tfoot>
                    </table>
                </>
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
