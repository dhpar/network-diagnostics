import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { IHeaderRowProps } from '../../App.types';

export function HeaderRow ({headerGroup}: IHeaderRowProps) {
    return headerGroup.headers.map((header) => {
        const label = typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : '';
        const sortDirection = header.column.getIsSorted();
        return (
            <th key={header.id} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {header.column.getCanSort() ? (
                    <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 hover:text-white"
                    >
                        {label}
                        {sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                        ) : sortDirection === 'desc' ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                    </button>
                ) : (
                    label
                )}
            </th>
        );
    })
}
