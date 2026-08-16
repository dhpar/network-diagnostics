import Card from '../Layout/Card/Card';
import type { FunctionComponent } from 'react';

interface TLoadingTable {
    rows: number;
    cols: number;
}

interface TLoading {}

export const SkeletonElement: FunctionComponent<{}> = () => <p className="mx-6 my-4 rounded bg-gray-200 h-3 max-w-2/3"></p>;

export const SkeletonTable: FunctionComponent<TLoadingTable> = ({rows, cols}) => {
    const Cols = Array(cols).fill(null).map((element, i) => <td key={i}><SkeletonElement /></td>);

    const RowsAndCols = Array(rows).fill(Cols).map((element, i) => 
        <tr className="hover:bg-gray-700 transition-colors whitespace-nowrap font-mono text-sm text-gray-400 animate-pulse" key={i}>
            {element}
        </tr>
    );

    return RowsAndCols;
}

const Loading: FunctionComponent<TLoading> = ({}) => 
    <Card><p className="text-sm text-white">Loading...</p></Card>

export default Loading;
