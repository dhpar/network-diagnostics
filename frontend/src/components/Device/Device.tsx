import { type FunctionComponent, type ReactNode, use } from 'react';
import Card from '../Card/Card';

interface IDeviceProps {
    label: string;
    icon: ReactNode;
}

interface NetworkInfo {
  local_ip?: string;
  gateway?: string;
  subnet?: string;
}
const API_URL = 'http://localhost:5000/';

const fetchNetworkInfo = async (): Promise<NetworkInfo | undefined> => {
    try {
        const response = await fetch(`${API_URL}/api/network/info`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching network info:', error);
    }
};

const Device: FunctionComponent<IDeviceProps> = ({label, icon}) => {
    const fetchNetwork = use(fetchNetworkInfo());

    return <Card>
        <div className="flex items-center space-x-3 mb-2">
            { icon }
            <h3 className="text-lg font-semibold">{label}</h3>
        </div>
        <p className="text-2xl font-mono text-blue-300">
            { fetchNetwork?.local_ip }
        </p>
    </Card>;
};

export default Device;
