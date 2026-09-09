import { valueToPropertyColor } from '../../Utils/cssClasses';
import { CellFallback } from './CellFallback';

export interface IProgressCellProps { 
    value?: number | null; 
}

export function ProgressCell ({value}: IProgressCellProps) {
    if(!value) 
        return <CellFallback />

    const progressColor = valueToPropertyColor(value, 'bg');
    
    return <div className="flex items-center gap-4 font-mono text-sm text-gray-400">
        <div className="w-20 h-2 rounded-full bg-gray-700 overflow-hidden border border-solid border-gray-500">
            <span className={`h-full ${progressColor} block`} style={{ width: `${value}%` }}/>
        </div>
        <span>{`${value}%`}</span>
    </div>;
}
