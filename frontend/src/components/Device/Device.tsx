import { type FunctionComponent, type ReactNode } from 'react';

interface IDeviceProps {
    label: string;
    icon: ReactNode;
    value: string;
    isLoading: boolean;
}

export const Device: FunctionComponent<IDeviceProps> = ({ 
    label, 
    icon, 
    value,
    isLoading
}) => {
    return <>
        <div className="flex items-center space-x-3 mb-2">
            { icon }
            <h3 className="text-lg font-semibold">{label}</h3>
        </div>
        <p className="text-2xl font-mono text-blue-300">
            {isLoading? 'Loading...' : value}
        </p>
    </>;
};

// export default Device;
