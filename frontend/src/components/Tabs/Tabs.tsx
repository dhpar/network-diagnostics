import { useState, type Dispatch, type FunctionComponent } from "react";
import type { TabType, TDevices } from "../../App.types";
import { Traceroute } from "../Traceroute/Traceroute";
import { Wifi } from "lucide-react";
import { Dashboard } from "../Dashboard/Dashboard";
import { Devices } from "../Devices/Devices";
import { DNS } from "../DNS/DNS";
import { fetchResource, getResource } from "../../utils";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { INetworkInfo } from "../../hooks/useNetworkInfo";
import ROUTES from '../../routes';

interface ITabs {
    activeTab: TabType;
    devices: UseQueryResult<TDevices, Error>;
    network: UseQueryResult<INetworkInfo, Error>;
}

export const Tabs:FunctionComponent<ITabs> = ({activeTab, devices, network}) => {
 
    switch(activeTab) {
        case 'devices':
            return <Devices devices={devices} />;
        case 'DNS':
            return <DNS />;
        case 'traceroute':
            return <Traceroute />
        case 'wifi':
            return <Wifi />
        case 'dashboard':
        default:
            return <Dashboard devices={devices} network={network} />
    }
}