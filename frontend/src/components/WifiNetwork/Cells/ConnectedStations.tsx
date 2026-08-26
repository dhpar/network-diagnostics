import type { IRowProps } from "../../../App.types";
import { CellFallback } from "../../Table/CellFallback";

export function ConnectedStations ({ row }: IRowProps) {
    if(row.getCanExpand() || !row.original.connected_stations) {
        return <CellFallback />;
    }
    
    return <span className="font-mono text-sm text-gray-400">{row.original.connected_stations}</span>
}