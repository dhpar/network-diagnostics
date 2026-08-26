import type { IRowProps } from '../../../App.types';
import { ProgressCell } from '../../Table/ProgressCell';

export function SignalPercent ({row}: IRowProps) {
  if (row.getCanExpand()) {
        const signalProgress = row.subRows
            .map((subRow) => subRow.original.signal_percent)
            .filter((value): value is number => value != null);
        return <ProgressCell value={Math.max(...signalProgress)} />;
    }
    
    return <ProgressCell value={row.original.signal_percent} />;
}
