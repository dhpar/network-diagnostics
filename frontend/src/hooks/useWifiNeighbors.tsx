import { useSuspenseQuery } from '@tanstack/react-query';
import ROUTES from '../routes.ts';
import type { IWifiNeighborNetwork } from '../App.types';
import { getResource, fetchResource } from '../utils';

export function useWifiNeightbors(refetchInterval:number = 1) {
    const devicesRequest = getResource(ROUTES.SCAN_WIFI_NETWORKS);
    return useSuspenseQuery({ 
        queryKey: ['useWifiNeightbors'], 
        queryFn: () => fetchResource<IWifiNeighborNetwork[]>(devicesRequest),
        refetchInterval: refetchInterval*1000
    });
}
