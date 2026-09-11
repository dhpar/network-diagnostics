import * as d3 from "d3";
import { useEffect, useMemo, useRef } from "react";
import { valueToPropertyColor } from "../../Utils/cssClasses";

type GaugeProps = {
  value: number;
  width?: number;
  margin?: number;
  color?: string;
  trackColor?: string;
  className?: string;
};

export default function Gauge({
  value,
  width = 240,
  trackColor = "fill-white",
  className = ''
}: GaugeProps) {
  const valuePathRef = useRef<SVGPathElement>(null);
  const gaugeColor = valueToPropertyColor(value || 0);
  const clamped = Math.max(0, Math.min(100, value));

  const height = width * 0.6;
  const centerX = width / 2;
  const centerY = height * 0.55;
  const outerRadius = Math.min(centerX, centerY);
  const innerRadius = outerRadius * 0.7;

  const buildArc = useMemo(
    () =>
      (pct: number) => {
        const start = (3 * Math.PI) / 2;
        const end = start + (Math.PI * pct) / 100;
        return (
          d3
            .arc()
            .cornerRadius(Math.min(10, (outerRadius - innerRadius) / 2))({
              innerRadius,
              outerRadius,
              startAngle: start,
              endAngle: end
            }) ?? ""
        );
      },
    [innerRadius, outerRadius]
  );

  useEffect(() => {
    d3.select(valuePathRef.current)
      // .transition(`translate(${centerX}, ${centerY})`)
      // .duration(600)
      .attr("d", buildArc(clamped));
  }, [clamped, buildArc]);

  const trackPath = buildArc(100);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={`Gauge: ${Math.round(clamped)}%`}
      className={className}
    >
      <g transform={`translate(${centerX}, ${centerY})`}>
        <path d={trackPath} className={`mask-clip-content mask-size-[auto_100px]${trackColor}`} />
        <path ref={valuePathRef} d={buildArc(0)} className={`animate-rotate ${gaugeColor}`} />
        <text
          y={innerRadius * 0.45}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={outerRadius * 0.45}
          fontWeight={600}
          fill="currentColor"
          className="font-mono text-2xl"
        >
          {Math.round(clamped)}%
        </text>
      </g>
    </svg>
  );
}
