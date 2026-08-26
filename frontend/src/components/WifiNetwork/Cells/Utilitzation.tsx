import type { IRowProps } from '../../../App.types';
import { CellFallback } from '../../Table/CellFallback';
import { ProgressCell } from '../../Table/ProgressCell';

export function Utilitzation ({ row }: IRowProps) {
   if(row.getCanExpand()) {
        return <CellFallback />;
    }
    return <ProgressCell value={row.original.channel_utilization_percent} />
}
