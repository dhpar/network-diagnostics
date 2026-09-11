import ROUTES from '../routes.ts';
import { useSuspenseQuery } from "@tanstack/react-query";
import { getResource, fetchResource } from "../utils.ts";
import type { TDevices } from "../App.types";

const useDevices = () => {
    const devicesRequest = getResource(ROUTES.DEVICES);
    return useSuspenseQuery({ 
        queryKey: ['useDevices'], 
        queryFn: () => fetchResource<TDevices>(devicesRequest)
    });
}

export default useDevices;
