import type { FunctionComponent } from 'react';
import Card from '../Layout/Card/Card';
import { WifiOffIcon } from 'lucide-react';

const Loading: FunctionComponent<{error: Error}> = ({error}) => {
  return (
        <Card>
            <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 text-center">
                <WifiOffIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <p className="text-red-400">{`Error retrieving WiFi info: ${error?.message || error}`}</p>
            </div>
        </Card>
    );
};

export default Loading;
