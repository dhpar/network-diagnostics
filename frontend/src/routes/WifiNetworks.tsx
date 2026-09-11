import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
    FlexRender,
} from "@tanstack/react-table";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import Layout from "../Layout";
import type { IWifiNeighborNetwork, IWifiTableData, TNetworks } from "../App.types";
import FilterTabs, { type FilterTabOption } from "../components/Filters/FilterTabs";
import { SSID } from "../components/WifiNetwork/Cells/SSID";
import { SignalPercent } from "../components/WifiNetwork/Cells/SignalPercent";
import { Band } from "../components/WifiNetwork/Cells/Band";
import { Channel } from "../components/WifiNetwork/Cells/Channel";
import { Utilitzation } from "../components/WifiNetwork/Cells/Utilitzation";
import { ConnectedStations } from "../components/WifiNetwork/Cells/ConnectedStations";
import { HeaderRow } from "../components/WifiNetwork/HeaderRow";
import { InterchannelInterference } from "../components/Graphs/InterchannelInterference";
import Card from "../components/Layout/Card/Card";
import SuspenseWrapper from "../components/States/SuspenseWrapper";
import { useWifiNeightbors } from "../hooks/useWifiNeighbors";
import { useScanWifi } from "../hooks/useScanWifi";

export const Route = createFileRoute('/WifiNetworks')({
    component: WifiNetwork,
});

type Features = typeof features;


const features = tableFeatures({
    rowExpandingFeature,
    expandedRowModel: createExpandedRowModel(),
    columnFilteringFeature,
    filteredRowModel: createFilteredRowModel(),
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    
    filterFns: { equalsString: filterFn_equalsString },
});

const helper = createColumnHelper<Features, IWifiTableData>();

const flattenNetworks = (networks: IWifiNeighborNetwork[]): IWifiTableData[] =>
    networks.map((network) => ({
        ssid: network.ssid,
        network_type: network.network_type,
        authentication: network.authentication,
        encryption: network.encryption,
        ...(Object.entries(network.bssids).length === 1? {
            bssid: network.bssids[0].bssid,
            signal_percent: network.bssids[0].signal_percent,
            radio_type: network.bssids[0].radio_type,
            band: network.bssids[0].band,
            channel: network.bssids[0].channel,
            bss_load: network.bssids[0].bss_load,
            connected_stations: network.bssids[0].bss_load?.connected_stations,
            channel_utilization_percent: network.bssids[0].bss_load?.channel_utilization_percent,
        } : {
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
        }),
    
    }));

const columns = helper.columns([
    helper.accessor('ssid', {
        header: 'Network',
        enableSorting: false,
        cell: SSID
    }),
    helper.accessor('signal_percent', {
        header: 'Signal',
        id: 'signal',
        sortUndefined: 'last',
        cell: SignalPercent,
    }),
    helper.accessor('band', {
        header: 'Band',
        filterFn: 'equalsString',
        enableSorting: false,
        cell: Band,
    }),
    helper.accessor('channel', {
        header: 'Channel',
        sortUndefined: 'last',
        enableSorting: true,
        cell: Channel,
    }),

    helper.accessor('channel_utilization_percent', {
        header: 'Utilization',
        enableSorting: false,
        cell: Utilitzation,
    }),
    helper.accessor('connected_stations', {
        header: 'Stations',
        enableSorting: false,
        cell: ConnectedStations,
    }),
]);

const filterBands = ( data: IWifiTableData[] ) => {
    const sortedFilteredBands = data
        .map((subRow) => subRow.band)
        .filter((band): band is string => Boolean(band))
        .sort((a, b) => parseInt(a) - parseInt(b));
    return Array.from(new Set(sortedFilteredBands));
}

function WifiNetwork() {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [sorting, setSorting] = useState<SortingState>([{
        id: 'signal',
        desc: true
    }]);
    const wifiScan = useScanWifi();
    const { data, isRefetching, refetch, isLoading } = useWifiNeightbors();
    
    const tableData = data? 
        flattenNetworks(data) : [];

    const table = useTable({
        features,
        columns,
        data: tableData || [],
        getSubRows: (row) => row.subRows,
        getRowCanExpand: (row) => Boolean(row.subRows?.length),
        initialState: { sorting },
        filterFromLeafRows: true,
        state: { columnFilters },
        onColumnFiltersChange: setColumnFilters,
        onSortingChange: setSorting
    });
    
    const activeBand = (table.state.columnFilters.find((filter) => 
        filter.id === 'band')?.value as string | undefined) ?? 'all';

    const bandOptions: FilterTabOption<string>[] = useMemo(() => {
        const bandCounts = new Map<string, number>();
        const networkBands = filterBands(tableData)
            .map((band) => ({
                value: band,
                label: band,
                count: bandCounts.get(band),
            }));
        return [
            { 
                value: 'all', 
                label: 'All', 
                count: networkBands.length 
            },
            ...networkBands,
        ];
    }, [tableData]);
    const getNetworkByBand = (band?: string): TNetworks =>
        data?.flatMap((network) =>
            network.bssids
                .filter((bssid) => band === undefined || bssid.band === band)
                .map((bssid) => ({
                    ssid: network.ssid,
                    bssid: bssid.bssid,
                    channel: bssid.channel,
                    signalPercent: bssid.signal_percent,
                    band: bssid.band
                }))
        ) ?? [];

    
    const handleBandChange = (band: string) => setColumnFilters(band === 'all' ? [] : [{ id: 'band', value: band }]);
    const { rows } = table.getRowModel();
    
    return (
        <Layout title='WiFi Networks' isRefreshLoading={isLoading || isRefetching} refetch={refetch}>
            <div className="space-y-6">
                <div className="flex flex-nowrap space-x-6">
                    <Card className="w-1/2" cardTitle="2.4 Ghz Band">
                        <SuspenseWrapper message={wifiScan.error?.message || 'Error loading'}>
                            <InterchannelInterference 
                                currentChannel={wifiScan.data?.channel || 0}
                                networks={getNetworkByBand("2.4 GHz")}
                                currentNetwork={wifiScan.data?.interface?.SSID || 'Unknown'}
                                selectedBand="2.4 GHz"
                                numberOfChannels={14}
                            />
                        </SuspenseWrapper>
                    </Card>
                    <Card className="w-1/2" cardTitle="5 Ghz Band">
                        <SuspenseWrapper message={wifiScan.error?.message || 'Error loading'}>
                            <InterchannelInterference 
                                currentChannel={wifiScan.data?.channel || 0}
                                networks={getNetworkByBand("5 GHz")}
                                currentNetwork={wifiScan.data?.interface?.SSID || 'Unknown'}
                                selectedBand="5 GHz"
                                numberOfChannels={48}
                            />
                        </SuspenseWrapper>
                    </Card>

                </div>
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
                                    <HeaderRow headerGroup={headerGroup} />
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-700 transition-colors whitespace-nowrap">
                                        {row.getAllCells().map((cell) => (
                                            <td key={cell.id} className={`px-6 py-4 max-w-[200px] text-wrap`}>
                                                <FlexRender cell={cell} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            }
                        </tbody>
                    </table>
                    {rows.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            No networks match the {activeBand === 'all' ? '' : `${activeBand} `}band filter.
                        </div>
                    )}
                </div>
            </div>
            {bandOptions.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    No WiFi networks found. Click "Refresh" to scan again.
                </div>
            )}
        </Layout>
    );
}