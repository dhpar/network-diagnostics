
import useTraceroute from '../../hooks/useTraceroute';
import { Circle, Globe } from 'lucide-react';
import Card from '../Layout/Card/Card';

export function TracerouteTable () {
    const { data: response } = useTraceroute();
    const data = response && ('json' in response ? response.json : response);
    const hops = data?.timing ?? [];
    const reached = hops.some((hop) => hop.address === data?.target);

    return (<>
        <Card>
            <div className='mb-4 flex flex-1 justify-between gap-4'>
                <h3 className="mb-4 text-gray-300 ">
                    <p className="font-mono">
                        <span className='mr-4'>Target:</span>
                        <span className='text-blue-300 mr-4'>{data?.target_ip}</span>
                        <span>({data.target})</span>
                    </p>
                </h3>
                <p>
                    You have <span className={reached ? 'text-blue-500' : 'text-red-500'}>{reached ? 'reached' : "didn't reach"}</span> the destination.
                </p>
            </div>
            
            <table className="table-layout table-auto w-full border-b-2 border-gray-700 mb-4">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="px-6 py-3 text-xs font-medium text-gray-300 uppercase tracking-wider text-left">Hop number</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300  uppercase tracking-wider">IP Address</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Host Name</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Response time</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                {hops.map((hop) => {
                    const status = hop.address === '*' ? 'timeout' : hop.address === data.target ? 'reached' : 'responded';
                    const statusColor = status === 'reached' ? 'text-blue-500' : status === 'timeout' ? 'text-red-500' : 'text-green-500';

                    return <tr key={hop.hop_number} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-left">
                            {hop.hop_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center align-middle">
                            <Circle aria-label={status} className={`w-5 h-5 ${statusColor} mr-6 stroke-gray-300`} />
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center">
                            {hop.address}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-center">
                            {hop.hostname ?? '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-400 text-right">
                            {typeof hop.traceroute_ms === 'number' ? `${hop.traceroute_ms} ms` : hop.traceroute_ms}
                        </td>
                    </tr>
                })}
                </tbody>
            </table>
            <div className='flex flex-1 justify-end w-full'>
                <p className='mr-4'>Total response time</p>
                <p>{
                    hops.reduce((totalTime, hop) => {
                        const hopTime = typeof hop.traceroute_ms === 'number'? 
                            hop.traceroute_ms : 0;
                        return totalTime + hopTime
                    }, 0) 
                } ms</p>
                
            </div>
            {hops.length === 0 && (
                <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                    <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No traceroute hops were returned.</p>
                </div>
            )}
        </Card>
    </>
    );
}
