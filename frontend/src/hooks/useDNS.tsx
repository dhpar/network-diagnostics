import ROUTES from '../routes.ts';
import { useSuspenseQuery } from "@tanstack/react-query";
import { getResource, fetchResource } from "../utils.ts";
import type { TDNSResults } from "../App.types";

const useDNS = () => {
    const dnsRequest = getResource(ROUTES.DNS_TEST);
    return useSuspenseQuery({ 
        queryKey: ['useDNS'], 
        queryFn: () => fetchResource<TDNSResults>(dnsRequest)
    });
}

export default useDNS;
