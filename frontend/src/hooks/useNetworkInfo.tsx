import ROUTES from '../routes.ts';
import type { IscanInfo } from "../App.types.ts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fetchResource, getResource } from "../utils.ts";

const useNetworkInfo = () => {
    const networkInfoRequest = getResource(ROUTES.NETWORK_INFO);  
    return useSuspenseQuery({ 
        queryKey: ['useNetworkInfo'], 
        queryFn: () => fetchResource<IscanInfo>(networkInfoRequest)
    });
}

export default useNetworkInfo;
