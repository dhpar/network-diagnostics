import type { FunctionComponent } from "react";
import type { IRowProps } from "../../../App.types";
import { CellFallback } from "../../Table/CellFallback";

const BandChip: FunctionComponent<{ children: string }> = ({ children }) => (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 border border-gray-600 text-blue-300">
        {children}
    </span>
);

export function Band ({row}: IRowProps) {
    if (row.getCanExpand()) {
        const bands = row.subRows
            .map((subRow) => subRow.original.band)
            .filter((band): band is string => Boolean(band))
            .sort((a, b) => parseInt(a) - parseInt(b));
        const singleBands = Array.from(new Set(bands));

        return <div className="flex flex-wrap gap-1">
            {singleBands.map((band) => 
                <BandChip key={band}>
                    {band}
                </BandChip>
            )}
        </div>
    }

        return typeof row.original.band === 'string'? <BandChip>
            {row.original.band}
        </BandChip> : <CellFallback />;
}
    