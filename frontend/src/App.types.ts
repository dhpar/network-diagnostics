

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
