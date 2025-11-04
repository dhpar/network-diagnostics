import { useEffect, useState } from "react";
import ROUTES from '../routes.ts';

interface IDevice {
  id?: number;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  last_seen?: string;
  status: string;
}

type TDevices = IDevice[];

const useNetworkInfo = () => {
    const [ devices, setDevices ] = useState<TDevices>();
    const [ isDevicesLoading,  setIsDevicesLoading] = useState(true);
    const [ devicesError, setDevicesError ] = useState<Error>();
    
    const fetchDevices = async (): Promise<void> => {
        try {
            const response = await fetch(ROUTES.DEVICES);
            const data = await response.json() as TDevices;
            setDevices(data);
        } catch (error) {
            setDevicesError(error as Error);
        }
        setIsDevicesLoading(false);
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    return {
        devices,
        isDevicesLoading,
        devicesError
    };
}

export default useNetworkInfo;