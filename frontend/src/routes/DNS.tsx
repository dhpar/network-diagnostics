import { useQuery } from "@tanstack/react-query";
import type { TDNSResults } from "../App.types";
import { fetchResource, getResource } from "../utils";
import ROUTES from '../routes';
import { CheckCircle, Globe, RefreshCw, XCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import Layout from "../Layout";

export const Route = createFileRoute('/DNS')({
  component: DNS,
});

function DNS() {
    const scanDNSRequest = getResource(ROUTES.DNS_TEST);
    const scanDNS = useQuery({ 
        queryKey: ['scan DNS'], 
        queryFn: () => {
            const res = fetchResource<TDNSResults>(scanDNSRequest);
            return res;
        },
        // enabled: false
    });

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">DNS Lookup</h2>
                    <button
                        onClick={() => scanDNS.refetch()}
                        disabled={scanDNS.isLoading}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${scanDNS.isLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                    </button>
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {scanDNS.data? scanDNS.data?.map((result, idx) => (
                        <div key={idx} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">{result.domain}</h3>
                            {result.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                            )}
                        </div>
                        {result.status === 'success' ? (
                            <div className="space-y-2">
                            <div>
                                <span className="text-gray-400 text-sm">Resolved IP</span>
                                <p className="font-mono text-blue-300">{result.ip}</p>
                            </div>
                            <div>
                                <span className="text-gray-400 text-sm">Response Time</span>
                                <p className="font-mono text-green-300">{result.time_ms}ms</p>
                            </div>
                            </div>
                        ) : (
                            <div className="text-red-400 text-sm">
                            <p>Error: {result.error}</p>
                            </div>
                        )}
                        </div>
                    )) : "No results"}
                    </div>
                    {scanDNS.data?.length === 0 && (
                    <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                        <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">No DNS tests performed yet. Click "Test DNS" to start.</p>
                    </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
