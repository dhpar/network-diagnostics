import { useMemo, useState, type FunctionComponent } from 'react';
import {
    createColumnHelper,
    createFilteredRowModel,
    createSortedRowModel,
    columnFilteringFeature,
    rowSortingFeature,
    filterFn_equalsString,
    sortFn_datetime,
    sortFn_text,
    tableFeatures,
    useTable,
} from '@tanstack/react-table';
import type { ColumnFiltersState } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Circle, Smartphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import Layout from '../Layout';
import { getResource, fetchResource } from '../utils';
import type { IDevice, TDevices, TStatusType } from '../App.types';
import ROUTES from '../routes';
import EditDevice from '../components/Device/EditDevice';
import FilterTabs, { type FilterTabOption } from '../components/Filters/FilterTabs';

export const Route = createFileRoute('/Devices')({
    component: Devices,
})

type StatusFilter = 'all' | TStatusType;

const features = tableFeatures({
    columnFilteringFeature,
    rowSortingFeature,
    filteredRowModel: createFilteredRowModel(),
    sortedRowModel: createSortedRowModel(),
    filterFns: { equalsString: filterFn_equalsString },
    sortFns: { datetime: sortFn_datetime, text: sortFn_text },
});
type Features = typeof features;

const helper = createColumnHelper<Features, IDevice>();

const getDeviceDisplayName = (device: IDevice): string =>
    device.label || (device.hostname && device.hostname !== 'Unknown' ? device.hostname : 'Unknown');

const ConnectionIcon: FunctionComponent<{ status: TStatusType }> = ({ status }) => {
    switch (status) {
        case 'online':
            return <Circle className='w-5 h-5 text-green-500' aria-label='Online' />
        case 'offline':
            return <Circle className='w-5 h-5 text-red-500' aria-label='Offline' />
        case 'unknown':
        default:
            return <Circle className='w-5 h-5 stroke-gray-700' aria-label='Unknown' />
    }
};

const DeviceIdentity: FunctionComponent<{ device: IDevice }> = ({ device }) => (
    <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
            <p className="font-medium text-gray-100">{getDeviceDisplayName(device)}</p>
            {Boolean(device.random_mac) && (
                <Smartphone
                    className="w-4 h-4 text-gray-400 fill-current"
                    aria-label="Random MAC address"
                />
            )}
        </div>
        <div className="font-mono text-sm">
            <span className="text-blue-300">{device.ip}</span>
            {device.mac && <span className="text-gray-400"> · {device.mac}</span>}
        </div>
        {device.vendor && <p className="text-xs text-gray-500">{device.vendor}</p>}
    </div>
);

const columns = helper.columns([
    helper.accessor('status', {
        header: 'Status',
        filterFn: 'equalsString',
        sortFn: 'text',
        cell: ({ getValue }) => <ConnectionIcon status={getValue()} />,
    }),
    helper.accessor(getDeviceDisplayName, {
        id: 'device',
        header: 'Device',
        sortFn: 'text',
        sortUndefined: 'last',
        cell: ({ row }) => <DeviceIdentity device={row.original} />,
    }),
    helper.accessor('last_seen', {
        header: 'Last Seen',
        sortFn: 'datetime',
        sortUndefined: 'last',
        cell: ({ getValue }) => {
            const lastSeen = getValue();
            return (
                <span className="text-sm text-gray-400">
                    {lastSeen ? new Date(lastSeen).toLocaleString() : 'N/A'}
                </span>
            );
        },
    }),
    helper.display({
        id: 'actions',
        header: 'Label',
        enableSorting: false,
        cell: ({ row }) => <EditDevice device={row.original} />,
    }),
]);

const EMPTY_DEVICES: IDevice[] = [];

function Devices() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const devicesRequest = getResource(ROUTES.DEVICES);
    const { data, refetch, isLoading, isRefetching } = useQuery({
        queryKey: ['devices'],
        queryFn: () => fetchResource<TDevices>(devicesRequest),
        // Refetch once every 30 seconds
        refetchInterval: 30000,
    });

    const devices = data?.devices ?? EMPTY_DEVICES;

    const table = useTable({
        features,
        columns,
        data: devices,
        state: { columnFilters },
        onColumnFiltersChange: setColumnFilters,
    });

    const activeStatus: StatusFilter =
        (table.state.columnFilters.find((filter) => filter.id === 'status')?.value as StatusFilter | undefined) ?? 'all';

    const statusOptions: FilterTabOption<StatusFilter>[] = useMemo(() => {
        const counts = { online: 0, offline: 0, unknown: 0 };
        devices.forEach((device) => {
            if (device.status === 'online') counts.online++;
            else if (device.status === 'offline') counts.offline++;
            else counts.unknown++;
        });
        return [
            { value: 'all' as const, label: 'All', count: devices.length },
            { value: 'online' as const, label: 'Online', count: counts.online, activeClassName: 'bg-green-600 border-green-500 text-white' },
            { value: 'offline' as const, label: 'Offline', count: counts.offline, activeClassName: 'bg-red-600 border-red-500 text-white' },
            { value: 'unknown' as const, label: 'Unknown', count: counts.unknown, activeClassName: 'bg-gray-600 border-gray-400 text-white' },
        ];
    }, [devices]);

    const handleFilterChange = (value: StatusFilter) => {
        setColumnFilters(value === 'all' ? [] : [{ id: 'status', value }]);
    };

    const rows = table.getRowModel().rows;

    return (
        <>
            <Layout title='Network Devices' isRefreshLoading={isLoading || isRefetching} refetch={refetch}>
                <div className="space-y-6">
                    <FilterTabs
                        options={statusOptions}
                        value={activeStatus}
                        onChange={handleFilterChange}
                        ariaLabel="Filter devices by connection status"
                    />
                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-700">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => {
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
                                        })}
                                    </tr>
                                ))}
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-700 transition-colors">
                                        {row.getAllCells().map((cell) => (
                                            <td key={cell.id} className="px-6 py-4 whitespace-nowrap mx-auto">
                                                <table.FlexRender cell={cell} />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {isLoading && devices.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                Loading devices...
                            </div>
                        ) : devices.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                No devices found. Click "Refresh" to scan the network.
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                No {activeStatus === 'all' ? '' : `${activeStatus} `}devices match the current filter.
                            </div>
                        ) : null}
                    </div>
                </div>
            </Layout>
        </>
    );
}