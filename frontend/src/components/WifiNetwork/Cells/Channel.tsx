import type { IRowProps } from "../../../App.types";
import { CellFallback } from "../../Table/CellFallback";

export function Channel ({ row }: IRowProps) {
    const { subRows, channel } = row.original;
    if (row.getCanExpand() && subRows) {
        return <span className="font-mono text-sm text-gray-400">{subRows.map((bssid) => bssid.channel).join(", ")}</span>
    }
    if(!channel) {
        return <CellFallback />;
    } 
    
    const hasSubRows = subRows && subRows.length > 1;
    const channels = hasSubRows? 
        subRows.map((bssid) => bssid.channel).join(", ") : channel;
    
    return <span className="font-mono text-sm text-gray-400">
        {channels}
    </span>;
}