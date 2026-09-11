import { Circle, Globe, TriangleAlert } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import Layout from "../Layout";
import useDNS from "../hooks/useDNS";
import Card from "../components/Layout/Card/Card";

export const Route = createFileRoute('/DNS')({
  component: DNS,
});

function DNS() {
    const scanDNS = useDNS();

    return (
        <Layout title='DNS lookup' isRefreshLoading={scanDNS.isLoading || scanDNS.isRefetching} refetch={scanDNS.refetch}>
            <Card className="mb-6 inline-flex">
                <TriangleAlert className="fill-transparent mr-2" stroke={`var(--color-red-400)`} />
                <p> Note: time to ping the host DNS and return back</p>
            </Card>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                { scanDNS.data?.map((result, idx) => (
                    <Card key={idx}>
                        <div className="grid grid-cols-2 grid-rows-2 gap-2"> 
                            <h3 className="font-semibold text-lg">
                                {result.domain}
                            </h3>
                            <Circle className={`w-5 h-5 text-align-right ml-auto mr-0 ${result.status === 'success'? 'text-green-500': 'text-red-500'}`} />
                            <div>
                                <p className="text-gray-400 text-sm">
                                    Resolved IP
                                </p>
                                <p className="font-mono text-blue-300">
                                    { result.status === 'success'? 
                                        result.ip : 
                                        'x.x.x.x'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-sm">
                                    Round Trip Time
                                </p>
                                <p className="font-mono text-green-300">
                                    { result.status === 'success'? 
                                        `${result.time_ms} ms` : '∞ ms'}
                                </p>
                            </div>
                        </div>
                    </Card>
                ))}
                </div>
                {scanDNS.data?.length === 0 && (
                <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                    <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No DNS tests performed yet. Click "Test DNS" to start.</p>
                </div>
                )}
            </div>
        </Layout>
    )
}
