import { useSuspenseQuery } from '@tanstack/react-query';
import ROUTES from '../routes.ts';
import type { TWifiScan } from '../App.types';
import { getResource, fetchResource } from '../utils';

export function useScanWifi (refetchInterval:number = 1) {
    const devicesRequest = getResource(ROUTES.SCAN_WIFI);
    return useSuspenseQuery({ 
        queryKey: ['useScanWifi'], 
        queryFn: () => fetchResource<TWifiScan>(devicesRequest),
        refetchInterval: refetchInterval*1000
    });
}
