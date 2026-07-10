export interface IDevice {
  id?: number;
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  last_seen?: string;
  status: string;
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

export interface IDNSResult {
  domain: string;
  ip?: string;
  time_ms?: number;
  status: 'success' | 'failed';
  error?: string;
}

export type TDevices = {
  devices: IDevice[], 
  count: number,
}
export type TWifiNetworks = IWifiNetwork[];
export type TDNSResults = IDNSResult[];


export type TabType = 'dashboard' | 'devices' | 'wifi' | 'DNS' | 'traceroute';