import  type { KeyboardEvent, MouseEvent } from 'react'; 
import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchResource, getResource, putResource } from '../../utils';
import ROUTES from '../../routes';
import type { IDevice, TDevices } from '../../App.types';

interface EditDeviceProps {
    device: IDevice
}
type ILabel = { label: string };

const EditDevice: React.FC<EditDeviceProps> = ({
    device
}) => {
    if(!device || !device.mac) {
        return "We need a MAC address to create a Label"
    }
    const queryClient = useQueryClient()
    const [ deviceLabel, setDeviceLabel ] = useState<{label: string}>({
      label: device.label ?? ''
    });
    const devicesRequestGet = getResource(ROUTES.DEVICES);
    const devicesRequestPut = putResource(ROUTES.PUTDEVICELABEL(device?.mac), {label: deviceLabel});
    
    const { data } = useMutation<{'mac': string, 'label': string}>({
      mutationKey: ['update device label'],
      mutationFn: async () => {
        const response = await fetch('/api/data', {
          method: 'PUT',
          body: JSON.stringify({ label: deviceLabel }),
          headers: { 'Content-Type': 'application/json' },
        })
        if (!response.ok) {
          throw new Error('Something went wrong.')
        }
        return await response.json()
      },
      onSettled: () => queryClient.invalidateQueries({ 
        queryKey: ['update device label'] 
      }),
    });

    const handleKeyDown = (event:KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
          // Put your action here
          console.log('Enter pressed! Submitting:', deviceLabel);
          setDeviceLabel({label: event.currentTarget.value})
        }
    };
    
    const handleEditClick = (event:MouseEvent<HTMLButtonElement>) => {

    }

    const handleDeleteClick = (event:MouseEvent<HTMLButtonElement>) => {}

  return (
    <div className='flex align-middle gap-0.5'>
      <input
        type="text"
        value={device.label || ''}
        onKeyDown={handleKeyDown}
        placeholder="Device name"
        className='px-0.5 py-1 bg-gray-800 rounded-lg border border-gray-700 min-w-28'
      />
      <button
        type="button"
        onClick={handleEditClick}
        className='px-0.5 py-1 bg-gray-800 rounded-lg border border-gray-700 min-w-28'
      >
        Edit
      </button>
      <button
        type="button"
        onClick={handleDeleteClick}
                className='px-0.5 py-1 bg-gray-800 rounded-lg border border-gray-700 min-w-28'

      >
        Delete
      </button>
    </div>
  );
};

export default EditDevice;
