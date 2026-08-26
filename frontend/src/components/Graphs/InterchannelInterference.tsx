import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { IWifiNeighborNetwork } from '../../App.types';


export interface ChannelInterferenceChartProps {
  networks: IWifiNeighborNetwork[];
  currentChannel: number;
  width?: number;
  height?: number;
  highlightColor?: string;
  mutedColor?: string;
}

/**
 * Wifi channel interference chart: each network is drawn as a "signal hump"
 * spanning roughly its 20MHz footprint across channels 1-13. The network(s)
 * on `currentChannel` are highlighted; everything else is muted gray.
 */
export function InterchannelInterference({
  networks,
  currentChannel,
  width = 640,
  height = 300,
  highlightColor = '#2a78d6',
  mutedColor = '#9a9890',
}: ChannelInterferenceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear previous render before redrawing

    const margin = { top: 28, right: 20, bottom: 30, left: 36 };
    const x = d3.scaleLinear().domain([0, 14]).range([margin.left, width - margin.right]);
    const y = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]);

    // shaded footprint of the current channel (~20MHz wide, so +/-2 channel steps)
    svg
      .append('rect')
      .attr('x', x(currentChannel - 2))
      .attr('width', x(currentChannel + 2) - x(currentChannel - 2))
      .attr('y', margin.top)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', highlightColor)
      .attr('fill-opacity', 0.07);

    // horizontal gridlines at 0/25/50/75/100% signal
    [0, 25, 50, 75, 100].forEach((v) => {
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', y(v))
        .attr('y2', y(v))
        .attr('stroke', '#e1e0d9')
        .attr('stroke-width', 1);
    });

    // x axis, one tick per channel
    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickValues(d3.range(1, 14)))
      .call((g) => g.selectAll('text').attr('font-size', 11).attr('fill', '#767469'))
      .call((g) => g.selectAll('line,path').attr('stroke', '#c3c2b7'));

    // dashed marker + label for the current channel
    svg
      .append('line')
      .attr('x1', x(currentChannel))
      .attr('x2', x(currentChannel))
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', highlightColor)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,3');

    svg
      .append('text')
      .attr('x', x(currentChannel))
      .attr('y', margin.top - 10)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', highlightColor)
      .text(`Current channel (${currentChannel})`);

    // builds the 5 points that make up one network's signal hump
    const humpPoints = (channel: number, signal: number) => [
      { cx: channel - 2, v: 0 },
      { cx: channel - 1, v: signal * 0.25 },
      { cx: channel, v: signal },
      { cx: channel + 1, v: signal * 0.25 },
      { cx: channel + 2, v: 0 },
    ];

    const area = d3
      .area<{ cx: number; v: number }>()
      .x((d) => x(d.cx))
      .y0(y(0))
      .y1((d) => y(d.v))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // draw muted networks first, highlighted ones last so they render on top
    const sorted = networks.map((network) => 
      network.bssids.sort(
        (a, b) => 
          (a.channel === currentChannel ? 1 : 0) - (b.channel === currentChannel ? 1 : 0)
      ).map((bssid) => {
        const onCurrent = bssid.channel === currentChannel;
        if(bssid.channel && bssid.signal_percent) {
          svg
            .append('path')
            .datum(humpPoints(bssid.channel, bssid.signal_percent))
            .attr('d', area)
            .attr('fill', onCurrent ? highlightColor : mutedColor)
            .attr('fill-opacity', onCurrent ? 0.4 : 0.18)
            .attr('stroke', onCurrent ? highlightColor : mutedColor)
            .attr('stroke-width', onCurrent ? 2 : 1)
            .attr('stroke-opacity', onCurrent ? 1 : 0.6);

        }
      })
    );
   

    // sorted.forEach((net) => {
    //   const onCurrent = net.channel === currentChannel;
    //   svg
    //     .append('path')
    //     .datum(humpPoints(net.channel, net.signal))
    //     .attr('d', area)
    //     .attr('fill', onCurrent ? highlightColor : mutedColor)
    //     .attr('fill-opacity', onCurrent ? 0.4 : 0.18)
    //     .attr('stroke', onCurrent ? highlightColor : mutedColor)
    //     .attr('stroke-width', onCurrent ? 2 : 1)
    //     .attr('stroke-opacity', onCurrent ? 1 : 0.6);
    // });
  }, [networks, currentChannel, width, height, highlightColor, mutedColor]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={`Wifi channel interference chart, channel ${currentChannel} highlighted`}
    />
  );
}

// usage:
// <ChannelInterferenceChart
//   currentChannel={4}
//   networks={[
//     { ssid: 'HomeNet_5G', channel: 1, signal: 88 },
//     { ssid: 'NETGEAR23', channel: 3, signal: 52 },
//     { ssid: 'Linksys-A4F2', channel: 4, signal: 34 },
//     { ssid: 'xfinitywifi', channel: 6, signal: 71 },
//   ]}
// />
