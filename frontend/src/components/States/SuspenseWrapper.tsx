import { Suspense, useState, type FunctionComponent, type ReactNode } from 'react';
import { RefreshCw, WifiOffIcon } from 'lucide-react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';

interface ISuspenseWrapper {
    message: string; 
    isATableLoading?: boolean;
    children: ReactNode;
}

interface TLoadingTable {
    rows?: number;
    cols?: number;
}

export const SkeletonElement: FunctionComponent = () => <p className="mx-6 my-4 rounded bg-gray-200 h-3 max-w-2/3"></p>;

export const SkeletonTable: FunctionComponent<TLoadingTable> = ({rows = 3, cols = 3}) => {
    const Cols = Array(cols).fill(null).map((_, i) => 
        <td key={i}>
            <SkeletonElement />
        </td>
    );

    const RowsAndCols = Array(rows).fill(Cols).map((element, i) => 
        <tr className="hover:bg-gray-700 transition-colors whitespace-nowrap font-mono text-sm text-gray-400 animate-pulse" key={i}>
            {element}
        </tr>
    );

    return RowsAndCols;
}    

interface IFallbackErrorBoundary {
    message: string;
    resetErrorBoundary: (...args: unknown[]) => void;
}

const FallbackErrorBoundary:FunctionComponent<IFallbackErrorBoundary> = ({ message, resetErrorBoundary }) => {
    const [isRefreshLoading, setIsRefreshLoading] = useState(false);
    const handleRefresh = () => {
        resetErrorBoundary();
        setIsRefreshLoading(prev => !prev);
    }
    return (
        <div className="bg-gray-800 rounded-lg p-12 border border-gray-700 flex flex-col items-center space-y-2">
            <p className="text-red-400">{message}</p>
            <button onClick={handleRefresh} className='flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded-lg transition-colors'>
                <RefreshCw className={`w-4 h-4 ${isRefreshLoading? 'animate-spin' : ''}`} />
                Try again
            </button>
        </div>
    );
}    

const SuspenseWrapper: FunctionComponent<ISuspenseWrapper> = ({message, children, isATableLoading = false}) => {
    const Loading = () => isATableLoading? 
        <SkeletonTable /> : 
        <p className="text-sm text-white">Loading...</p>;
    
    return (
        <QueryErrorResetBoundary>
        {({ reset }) => (
            <ErrorBoundary
                onReset={reset}
                fallbackRender={({error, resetErrorBoundary}) => <FallbackErrorBoundary message={error instanceof Error ? error.message : message} resetErrorBoundary={resetErrorBoundary} />}>
                <Suspense fallback={<Loading />}>
                    {children}
                </Suspense>
            </ErrorBoundary>
        )}
        </QueryErrorResetBoundary>
)};

export default SuspenseWrapper;
