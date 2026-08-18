import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FunctionComponent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    createColumnHelper,
    createExpandedRowModel,
    createFilteredRowModel,
    createSortedRowModel,
    columnFilteringFeature,
    rowExpandingFeature,
    rowSortingFeature,
    filterFn_equalsString,
    tableFeatures,
    useTable,
} from "@tanstack/react-table";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, ChevronUp, ChevronsUpDown } from "lucide-react";
import Layout from "../Layout";
import { fetchResource, getResource } from "../utils";
import type { IWifiBssidLoad, IWifiNeighborNetwork, TWifiNetworksScan } from "../App.types";
import ROUTES from '../routes';
import Error from "../components/States/Error";
import FilterTabs, { type FilterTabOption } from "../components/Filters/FilterTabs";
import { SkeletonTable } from "../components/States/Loading";

export const Route = createFileRoute('/WifiNetworks')({
    component: WifiNetwork,
});

interface IWifiTableData {
    ssid?: string;
    network_type?: string | null;
    authentication?: string | null;
    encryption?: string | null;
    bssid?: string;
    signal_percent?: number | null;
    radio_type?: string | null;
    band?: string | null;
    channel?: number | null;
    bss_load?: IWifiBssidLoad | null;
    connected_stations?: number | null;
    channel_utilization_percent?: number | null;
    subRows?: IWifiTableData[];
}

const features = tableFeatures({
    rowExpandingFeature,
    expandedRowModel: createExpandedRowModel(),
    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    filterFns: { equalsString: filterFn_equalsString },
});
type Features = typeof features;

const helper = createColumnHelper<Features, IWifiTableData>();

const flattenNetworks = (networks: IWifiNeighborNetwork[]): IWifiTableData[] =>
    networks.map((network) => ({
        ssid: network.ssid,
        network_type: network.network_type,
        authentication: network.authentication,
        encryption: network.encryption,
        subRows: (network.bssids ?? []).map((bssid) => ({
            bssid: bssid.bssid,
            signal_percent: bssid.signal_percent,
            radio_type: bssid.radio_type,
            band: bssid.band,
            channel: bssid.channel,
            bss_load: bssid.bss_load,
            connected_stations: bssid.bss_load?.connected_stations,
            channel_utilization_percent: bssid.bss_load?.channel_utilization_percent,
        })),
    }));

const signalColor = (value: number): string => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 60) return 'bg-blue-500';
    if (value >= 40) return 'bg-amber-500';
    return 'bg-red-500';
};

const utilizationColor = (value: number): string => {
    if (value < 50) return 'bg-green-500';
    if (value < 80) return 'bg-amber-500';
    return 'bg-red-500';
};

const SecurityBadge: FunctionComponent<{ encryption?: string | null }> = ({ encryption }) => {
    const open = !encryption || /none|open/i.test(encryption);
    const className = open
        ? 'bg-red-600/20 text-red-300 border-red-500'
        : /wep/i.test(encryption)
            ? 'bg-amber-600/20 text-amber-300 border-amber-500'
            : 'bg-green-600/20 text-green-300 border-green-500';
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${className}`}>
            {open ? 'Open' : encryption}
        </span>
    );
};

const BandChip: FunctionComponent<{ children: string }> = ({ children }) => (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 border border-gray-600 text-blue-300">
        {children}
    </span>
);

const ProgressBar: FunctionComponent<{ value: number | null | undefined; color: (value: number) => string }> = ({ value, color }) => {
    if (value == null) return <span className="text-sm text-gray-500">—</span>;
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 h-2 rounded-full bg-gray-700 overflow-hidden">
                <div className={`h-full ${color(value)}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
            </div>
            <span className="font-mono text-sm text-gray-300">{value}%</span>
        </div>
    );
};

const columns = helper.columns([
    helper.accessor('ssid', {
        header: 'Network',
        enableSorting: false,
        cell: ({ row }) => {
            if (!row.getCanExpand()) return null;
            return (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={row.getToggleExpandedHandler()}
                        aria-label={row.getIsExpanded() ? 'Collapse access points' : 'Expand access points'}
                        className="shrink-0 text-gray-400 hover:text-gray-100"
                    >
                        <ChevronRight className={`w-4 h-4 transition-transform ${row.getIsExpanded() ? 'rotate-90' : ''}`} />
                    </button>
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-100">{row.original.ssid || 'Hidden network'}</p>
                            <SecurityBadge encryption={row.original.encryption} />
                        </div>
                        {row.original.network_type || row.original.authentication ? (
                            <p className="text-xs text-gray-500">{row.original.network_type}{row.original.network_type && row.original.authentication ? ' · ' : ''}{row.original.authentication}</p>
                        ) : null}
                    </div>
                </div>
            );
        },
    }),
    helper.accessor('signal_percent', {
        header: 'Signal',
        sortUndefined: 'last',
        cell: ({ row }) => {
            if (row.getCanExpand()) {
                const values = row.subRows
                    .map((subRow) => subRow.original.signal_percent)
                    .filter((value): value is number => value != null);
                return <ProgressBar value={values.length ? Math.max(...values) : null} color={signalColor} />;
            }
            return <ProgressBar value={row.original.signal_percent} color={signalColor} />;
        },
    }),
    helper.accessor('band', {
        header: 'Band',
        filterFn: 'equalsString',
        enableSorting: false,
        cell: ({ row }) => {
            if (row.getCanExpand()) {
                const bands = Array.from(
                    new Set(row.subRows.map((subRow) => subRow.original.band).filter((band): band is string => Boolean(band)))
                );
                return bands.length ? (
                    <div className="flex flex-wrap gap-1">
                        {bands.map((band) => <BandChip key={band}>{band}</BandChip>)}
                    </div>
                ) : <span className="text-sm text-gray-500">—</span>;
            }
            return row.original.band ? (
                <BandChip>{row.original.band}</BandChip>
            ) : <span className="text-sm text-gray-500">—</span>;
        },
    }),
    helper.accessor('channel', {
        header: 'Channel',
        sortUndefined: 'last',
        cell: ({ row }) => (
            row.getCanExpand() ? null : <span className="font-mono text-sm text-gray-400">{row.original.channel ?? '—'}</span>
        ),
    }),
    helper.accessor('channel_utilization_percent', {
        header: 'Utilization',
        enableSorting: false,
        cell: ({ row }) => (
            row.getCanExpand() ? null : <ProgressBar value={row.original.channel_utilization_percent} color={utilizationColor} />
        ),
    }),
    helper.accessor('connected_stations', {
        header: 'Stations',
        enableSorting: false,
        cell: ({ row }) => (
            row.getCanExpand() ? null : <span className="font-mono text-sm text-gray-400">{row.original.connected_stations ?? '—'}</span>
        ),
    }),
]);

const EMPTY_NETWORKS: IWifiNeighborNetwork[] = [];

function WifiNetwork() {
    const wifiNetworksRequest = getResource(ROUTES.SCAN_WIFI_NETWORKS);
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    const { data, isSuccess, isLoading, isError, error, isRefetching, refetch } = useQuery({
        queryKey: ['Wifi Networks scan'],
        queryFn: () => fetchResource<TWifiNetworksScan>(wifiNetworksRequest),
        refetchInterval: 30000,
    });

    const networks = data ?? EMPTY_NETWORKS;
    const tableData = useMemo(() => flattenNetworks(networks), [networks]);

    const table = useTable({
        features,
        columns,
        data: tableData,
        getSubRows: (row) => row.subRows,
        getRowCanExpand: (row) => Boolean(row.subRows?.length),
        filterFromLeafRows: true,
        state: { columnFilters },
        onColumnFiltersChange: setColumnFilters,
    });

    const activeBand = (table.state.columnFilters.find((filter) => filter.id === 'band')?.value as string | undefined) ?? 'all';

    const bandOptions: FilterTabOption<string>[] = useMemo(() => {
        const bandCounts = new Map<string, number>();
        networks.forEach((network) => {
            const uniqueBands = Array.from(new Set((network.bssids ?? []).map((bssid) => bssid.band).filter((band): band is string => Boolean(band))));
            uniqueBands.forEach((band) => bandCounts.set(band, (bandCounts.get(band) ?? 0) + 1));
        });
        return [
            { value: 'all', label: 'All', count: networks.length },
            ...Array.from(bandCounts.keys()).sort().map((band) => ({
                value: band,
                label: band,
                count: bandCounts.get(band),
            })),
        ];
    }, [networks]);

    const handleBandChange = (band: string) => {
        setColumnFilters(band === 'all' ? [] : [{ id: 'band', value: band }]);
    };

    const rows = table.getRowModel().rows;
    return (
        <Layout title='WiFi Networks' isRefreshLoading={isLoading || isRefetching} refetch={refetch}>
            {isError && <Error error={error} />}
            {isSuccess && networks.length > 0 && (
                <div className="space-y-6">
                    <FilterTabs
                        options={bandOptions}
                        value={activeBand}
                        onChange={handleBandChange}
                        ariaLabel="Filter WiFi networks by band"
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
                                {isLoading && networks.length === 0 ? (
                                    <SkeletonTable rows={4} cols={columns.length} />
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-700 transition-colors whitespace-nowrap">
                                            {row.getAllCells().map((cell) => (
                                                <td key={cell.id} className="px-6 py-4">
                                                    <table.FlexRender cell={cell} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        {!isLoading && rows.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                No networks match the {activeBand === 'all' ? '' : `${activeBand} `}band filter.
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isSuccess && networks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No WiFi networks found. Click "Refresh" to scan again.
                </div>
            )}
        </Layout>
    );
}