import type { IRowProps } from '../../../App.types';
import { ChevronRight } from 'lucide-react';
import { SecurityBadge } from '../../Wifi/SecurityBadges';

export function SSID ({row}: IRowProps) {
    const { original: { 
        ssid, 
        encryption, 
        network_type, 
        authentication
    }} = row;
    return (
        <div className="flex items-center gap-3">
            { row.getCanExpand()? 
            <button
                type="button"
                onClick={row.getToggleExpandedHandler()}
                aria-label={row.getIsExpanded() ? 'Collapse access points' : 'Expand access points'}
                className="shrink-0 text-gray-400 hover:text-gray-100"
            >
                <ChevronRight className={`w-4 h-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
            </button> : null}
            <div className={`flex flex-col gap-0.5 ${row.getCanExpand()? '' : 'ml-1'}`}>
                <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-100">{ssid || 'Hidden network'}</p>
                    <SecurityBadge encryption={encryption} />
                </div>
                {network_type || authentication ? (
                    <p className="text-xs text-gray-500">
                        {network_type}
                        {network_type && authentication ? ' · ' : ''}{authentication}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
