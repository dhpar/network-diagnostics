import ROUTES from '../routes.ts';
import { useSuspenseQuery } from "@tanstack/react-query";
import { getResource, fetchResource } from "../utils.ts";
import type { TTracerouteHop } from "../App.types";

const useTraceroute = () => {
    const tracerouteRequest = getResource(ROUTES.TRACEROUTE);
    return useSuspenseQuery({ 
        queryKey: ['useTraceroute'], 
        queryFn: () => fetchResource<TTracerouteHop>(tracerouteRequest)
    });
}

export default useTraceroute;
