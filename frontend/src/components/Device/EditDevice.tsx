import  type { KeyboardEvent, MouseEvent } from 'react'; 
import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchResource, putResource } from '../../utils';
import ROUTES from '../../routes';
import type { IDevice } from '../../App.types';
import { SquarePenIcon, TrashIcon, CheckIcon, XIcon } from 'lucide-react';
interface EditDeviceProps {
    device: IDevice
}

const EditDevice: React.FC<EditDeviceProps> = ({
  device
}) => {
  const queryClient = useQueryClient();
  const [ deviceLabel, setDeviceLabel ] = useState<string>('');
  const [ isEditingLabel, setIsEditingLabel ] = useState(false);

  if(!device || !device.mac) {
    return "We need a MAC address to create a Label"
  }
  
  const editLabelRequest = useMutation<IDevice, Error, {mac: string, label:string}>({
    mutationFn: async ({mac,label}) => {
        const devicesRequestPut = putResource(ROUTES.PUTDEVICELABEL(mac), {label});
        return await fetchResource(devicesRequestPut)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      },
  });

  const delLabelRequest = useMutation<IDevice, Error, {mac: string, label:string}>({
    mutationFn: async ({mac,label}) => {
        const devicesRequestPut = putResource(ROUTES.PUTDEVICELABEL(mac), {label});
        return await fetchResource(devicesRequestPut)
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      },
  });

  const handleInputKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if(!device.mac) return false;
    if(event.key === 'Enter') {
      setDeviceLabel(event.currentTarget.value);
      editLabelRequest.mutate({mac: device.mac, label: event.currentTarget.value} );
      setIsEditingLabel(false);
    }
    if(event.key === 'Escape'){
      setIsEditingLabel(false)
    }

  } 

  const handleEditButton = (event: 
    MouseEvent<HTMLButtonElement> | 
    KeyboardEvent<HTMLButtonElement>
  ) => {
    if(!device.mac) return null;
    setIsEditingLabel(true);
    setDeviceLabel(event.currentTarget.value);
    editLabelRequest.mutate({mac: device.mac, label: event.currentTarget.value} );
    console.log('Enter pressed! Submitting:', deviceLabel);
    // setIsEditingLabel(false);
  };

  const handleDeleteClick = (event:MouseEvent<HTMLButtonElement>) => {
    if (device.mac && !isEditingLabel) {
      delLabelRequest.mutate({mac: device.mac, label: event.currentTarget.value});
    }
    setIsEditingLabel(prev => !prev);
  }

  useEffect(() => {
    // If we click outside, hide the input and go back to the text label.
    const handleClickOutside = () => {
      setIsEditingLabel(false);
    }
    document.addEventListener('click', handleClickOutside);
    return document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className='flex align-middle gap-1 min-w-full max-w-52 justify-between'>
      {!isEditingLabel? 
      <p className='flex items-center grow  align-middle'>{editLabelRequest.isPending? 'Changing value...' : device.label }</p> : 
      <input
        type="text"
        defaultValue={device.label || ''}
        onKeyDown={handleInputKeyboard}
        placeholder="Device name..."
        name={`${device.mac}-label`}
        className='px-2 py-1 outline outline-blue-300 bg-gray-500 text-black rounded-lg max-w-max grow'
      />}
      <div className='flex gap-1 justify-self-end'>
        <button
          type="button"
          onClick={handleEditButton}
          className='flex px-1 py-1 bg-gray-800 rounded-lg border border-gray-700'
          aria-label='Edit the device`s label'
        >
          {isEditingLabel? 
            <CheckIcon className='fill-transparent mx-0.5 my-1 flex-1 flex-nowrap' focusable='false' /> : 
            <SquarePenIcon className='fill-transparent mx-0.5 my-1 flex-1 flex-nowrap' focusable='false'/>
          }
        </button>
        <button
          type="button"
          onClick={handleDeleteClick}
          className='flex px-1 py-1 bg-gray-800 rounded-lg border border-gray-700'
          aria-label='Delete the device`s label'
        >
          {isEditingLabel? 
            <XIcon className='fill-transparent mx-0.5 my-1 flex-1 flex-nowrap' focusable='false'/> : 
            <TrashIcon className='fill-transparent mx-0.5 my-1 flex-1 flex-nowrap' focusable='false'/>}
        </button>
      </div>
    </div>
  );
};

export default EditDevice;
