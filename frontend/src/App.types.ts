

// 1. Create a plain object configuration
const Status = {
  Online: "online",
  Offline: "offline",
  Unknown: "unknown"
} as const; // Makes all properties read-only literal types

// 2. Extract the values into a reusable union type
export type TStatusType = typeof Status[keyof typeof Status]; 

export interface IDNSResult {
  domain: string;
  ip?: string;
  time_ms?: number;
  status: TStatusType;
  error?: string;
}

export type TDevices = {
  devices: IDevice[], 
  count: number,
}

export interface IDevice {
  id?: number;
  ip: string;
  mac?: string;
  random_mac?: 0 | 1;
  hostname?: string;
  vendor?: string;
  last_seen?: string;
  label?: string;
  status: TStatusType;
}

export interface IscanInfo {
  local_ip?: string;
  gateway?: string;
  subnet?: string;
}

export interface IWifiNetwork {
  ssid: string;
  signal: number;
  channel?: number;
  security?: string;
}

export type TWifiNetworks = IWifiNetwork[];

export interface IWifiInterface {
  name?: string;
  description?: string;
  physical_address?: string;
  state?: string;
  SSDI?: string;
  band?: string;
  channel?: string;
  radio_type?: string;
  authentication?: string;
  cipher?: string;
  recieve_rate_mbps?: string;
  transmit_rate_mbps?: string;
  signal?: string;
}

export type TWifiScan = {
  signal_quality_percent?: number;
  signal_strength_dbm?: number;
  snr_db?: number;
  channel?: number;
  frequency_ghz?: number;
  interference_level?: string;
  recommendation?: string;
  status?: string;
  interface?: IWifiInterface;
}

export interface IWifiBssidLoad {
  connected_stations?: number | null;
  channel_utilization_raw?: number | null;
  channel_utilization_percent?: number | null;
  medium_available_capacity?: number | null;
  medium_available_capacity_unit?: string | null;
}

export interface IWifiBssid {
  bssid: string;
  signal_percent?: number | null;
  radio_type?: string | null;
  band?: string | null;
  channel?: number | null;
  details?: string | null;
  bss_load?: IWifiBssidLoad | null;
  qos_mscs_supported?: boolean | null;
  qos_map_supported?: boolean | null;
  basic_rates_mbps?: number[];
  other_rates_mbps?: number[];
}

export interface IWifiNeighborNetwork {
  ssid: string;
  network_type?: string | null;
  authentication?: string | null;
  encryption?: string | null;
  bssids: IWifiBssid[];
}

export type TWifiNetworksScan = IWifiNeighborNetwork[];

export type TDNSResults = IDNSResult[];
export type TTracerouteHop = {
  "failed_at_hops": Array<number>,
  "has_failures": Boolean,
  "hops": Array<{
      "hop": number,
      "hostname": string,
      "ip": string,
      "rtt_ms": number,
      "status": "ok" | string;
  }>,
  "reached": Boolean,
  "target": string,
  "target_ip": string,
  "timing": {
    "traceroute_ms": number,
    "dns_lookup_ms": number,
    "total_ms": number,
    "destination_rtt_ms": number,
    "estimated_one_way_ms": number
  },
  "total_hops": number
}

export type TTracerouteResults = TTracerouteHop[];

export type TabType = 'dashboard' | 'devices' | 'wifi' | 'DNS' | 'traceroute';
