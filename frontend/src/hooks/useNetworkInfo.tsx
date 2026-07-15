import { useEffect, useState } from "react";
import ROUTES from '../routes.ts';
import type { IscanInfo } from "../App.types.ts";

const useNetworkInfo = () => {
    const [ networkInfo, setData ] = useState<IscanInfo>();
    const [ isNetworkInfoLoading, setIsLoading ] = useState<boolean>(true);
    const [ networkInfoError, setNetworkInfoError ] = useState<Error>();

    const fetchData = async () => {
        try {
            const resp = await fetch(ROUTES.NETWORK_INFO);
            setIsLoading(false);

            const respJson = await resp.json() as IscanInfo;
            setData(respJson);
        } catch (error) {
            setNetworkInfoError(error as Error);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        fetchData();
    },[]);

    return {
        networkInfo,
        isNetworkInfoLoading,
        networkInfoError
    }
}

export default useNetworkInfo;