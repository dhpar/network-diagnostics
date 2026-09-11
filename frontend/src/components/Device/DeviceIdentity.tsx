import { Smartphone } from "lucide-react";
import type { FunctionComponent } from "react";
import type { IDevice } from "../../App.types";

export const getDeviceDisplayName = (device: IDevice): string =>
    device.label || (device.hostname && device.hostname !== 'Unknown' ? device.hostname : 'Unknown');

export const DeviceIdentity: FunctionComponent<{ device: IDevice }> = ({ device }) => {

    return <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
            <p className="font-medium text-gray-100">{getDeviceDisplayName(device)}</p>
            {Boolean(device.random_mac) && (
                <Smartphone
                    className="w-4 h-4 text-gray-400 fill-current"
                    aria-label="Random MAC address"
                />
            )}
        </div>
        <div className="font-mono text-sm">
            <span className="text-blue-300">{device.ip}</span>
            {device.mac && <span className="text-gray-400"> · {device.mac}</span>}
        </div>
        {device.vendor && <p className="text-xs text-gray-500">{device.vendor}</p>}
    </div>
};