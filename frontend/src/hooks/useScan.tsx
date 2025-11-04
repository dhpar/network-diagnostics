import { useEffect, useState } from "react";
import ROUTES from '../routes.ts';

export interface IScan {
  local_ip?: string;
  gateway?: string;
  subnet?: string;
}

const useScan = () => {
    const [ scanResult, setScanResult ] = useState<IScan>();
    const [ isScanNetworkLoading, setIsScanNetworkLoading ] = useState<boolean>(true);
    const [ scanNetworkError, setScanNetworkError ] = useState<Error>();

    const fetchData = async () => {
        try {
            const response = await fetch(`${ROUTES.SCAN_NETWORK}`, {
                method: 'POST'
            });
            const respJson = await response.json() as IScan;
            setScanResult(respJson);
        } catch (error) {
            setScanNetworkError(error as Error);
        }
        setIsScanNetworkLoading(false);
    }

    useEffect(() => {
        fetchData();
    },[]);

    return {
        scanResult,
        isScanNetworkLoading,
        scanNetworkError
    }
}

export default useScan;