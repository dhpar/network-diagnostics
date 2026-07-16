import  type { KeyboardEvent, MouseEvent } from 'react'; 
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchResource, putResource } from '../../utils';
import ROUTES from '../../routes';
import type { IDevice } from '../../App.types';

interface EditDeviceProps {
    device: IDevice
}

const EditDevice: React.FC<EditDeviceProps> = ({
  device
}) => {
  const queryClient = useQueryClient();
  const [ deviceLabel, setDeviceLabel ] = useState<string>('');
  if(!device || !device.mac) {
    return "We need a MAC address to create a Label"
  }
  
  const mutation = useMutation<IDevice, Error, {mac: string, label:string}>({
    mutationFn: async ({mac,label}) => {
        const devicesRequestPut = putResource(ROUTES.PUTDEVICELABEL(mac), {label});
        return await fetchResource(devicesRequestPut)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      },
    });
  
  const handleKeyDown = (event:KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && device.mac) {
      setDeviceLabel(event.currentTarget.value);

      mutation.mutate({mac: device.mac, label: event.currentTarget.value} );
    
      console.log('Enter pressed! Submitting:', deviceLabel);
    }
  };
  
  const handleEditClick = (event:MouseEvent<HTMLButtonElement>) => {
    if (device.mac) {
      mutation.mutate({mac: device.mac, label: event.currentTarget.value});
    }
    // setDeviceLabel({label: event.currentTarget.value});
  }

  const handleDeleteClick = (event:MouseEvent<HTMLButtonElement>) => {}

  return (
    <div className='flex align-middle gap-0.5'>
      <input
        type="text"
        defaultValue={device.label || ''}
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
