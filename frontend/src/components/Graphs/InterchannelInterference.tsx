import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import type { TNetworks } from '../../App.types';

export interface ChannelInterferenceChartProps {
  networks: TNetworks;
  currentChannel: number;
  currentNetwork: string;
  selectedBand?: string;
  numberOfChannels: number;
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
  currentNetwork,
  numberOfChannels,
  selectedBand = '2.4 GHz',
  width = 640,
  height = 300,
  highlightColor = 'var(--color-white)',
  mutedColor = 'fill-gray-600',
}: ChannelInterferenceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  // Guidelines
  const guidelinesColor = 'var(--color-gray-700)';
  // Axis line color
  const axisColor = 'var(--color-white-800)';
  // Y-axis text color
  const yAxisFontColor = 'var(--color-gray-300)';
  const margin = { 
    top: 28, 
    right: 20, 
    bottom: 30, 
    left: 36 
  };
  const boundsWidth = width - margin.right - margin.left;
  const boundsHeight = height - margin.bottom;
  // Y axis
  const yDomain = [0, 100];
  const yRange = [boundsHeight, margin.top];
  const yScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain(yDomain)
      .range(yRange);
  }, [networks, height]);
  
  // X axis;

  const xDomain = [0, numberOfChannels];
  const xRange = [margin.left, boundsWidth];
  const xScale = useMemo(() => {
    return d3
      .scaleLinear()
      .domain(xDomain)
      .range(xRange);
  }, [networks, width]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // clear previous render before redrawing

    // shaded footprint of the current channel (~20MHz wide, so +/-2 channel steps)
    svg
      .append('rect')
      .attr('x', xScale(currentChannel - 2))
      .attr('width', xScale(currentChannel + 2) - xScale(currentChannel - 2))
      .attr('y', margin.top)
      .attr('height', height - margin.top - margin.bottom)
      .attr('fill', highlightColor)
      .attr('fill-opacity', 0.07);
      // .attr('stroke', )
    // horizontal gridlines at 0/25/50/75/100% signal
    [0, 25, 50, 75, 100].forEach((v) => {
      svg
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(v))
        .attr('y2', yScale(v))
        .attr('stroke', guidelinesColor)
        .attr('stroke-width', 1);
    });

    const stepNumber = selectedBand === '2.4 GHz'? 1 : 10;
    // x axis, one tick per channel
    svg
      .append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).tickValues(d3.range(1, numberOfChannels, stepNumber)))
      .call((g) => g.selectAll('text').attr('font-size', 11).attr('class', yAxisFontColor))
      .call((g) => g.selectAll('line,path').attr('stroke', axisColor));

    svg
      .append('g')
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(d3.axisLeft(yScale).tickValues(d3.range(0, 100, 25)))
      .call((g) => 
        g
          .selectAll('text')
          .attr('font-size', 11)
          .attr('fill', yAxisFontColor)
      )
      .call((g) => 
        g
          .selectAll('line,path')
          .attr('stroke', axisColor)
        );
    if(networks.length > 0 && networks[0].band && selectedBand === networks[0].band) {

      svg
        .append('text')
        .attr('x', xScale(currentChannel))
        .attr('y', margin.top - 10)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', highlightColor)
        .text(`${currentNetwork} - (${currentChannel})`);
    }

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
      .x((d) => xScale(d.cx))
      .y0(yScale(0))
      .y1((d) => yScale(d.v))
      .curve(d3.curveCatmullRom.alpha(0.5));

    // draw muted networks first, highlighted ones last so they render on top
    if(networks) {
      networks.sort(
          (a, b) => 
            (a.channel === currentChannel ? 1 : 0) - (b.channel === currentChannel ? 1 : 0)
      ).map(({channel, signalPercent}) => {
          const onCurrent = channel === currentChannel;
          console.log(channel);
          console.log(currentChannel);
          if(channel && signalPercent) {
            svg
              .append('path')
              .datum(humpPoints(channel, signalPercent))
              .attr('d', area)
              .attr('fill', onCurrent ? highlightColor : mutedColor)
              .attr('fill-opacity', onCurrent ? 0.4 : 0.18)
              .attr('stroke', onCurrent ? highlightColor : mutedColor)
              .attr('stroke-width', onCurrent ? 2 : 1)
              .attr('stroke-opacity', onCurrent ? 1 : 0.6);
          }
        });
    }
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
