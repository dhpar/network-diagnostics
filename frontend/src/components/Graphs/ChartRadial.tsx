import { 
    RadialBarChart, 
    PolarGrid, 
    RadialBar, 
    PolarRadiusAxis, 
    Label, 
    Tooltip
} from "recharts";

import { ChartContainer, type ChartConfig } from "./Chart";
import type { FunctionComponent } from "react";
import {valueToPropertyColor} from "../../Utils/cssClasses";
export const description = "A radial chart with a custom shape";

const chartConfig = {
    signal: {
        label: "Signal",
    // color: "#2563eb",
  }
} satisfies ChartConfig

interface IChartRadialShape {  
    value: number
}

export const ChartRadialShape:FunctionComponent<IChartRadialShape> = ({ 
    value, 
}) => {
    const angle = (value/100)*360;
    const color = valueToPropertyColor(value);
    const chartData = [{  
        signal: value,
        color: color,
    }];
    
    return (
        <ChartContainer
          config={chartConfig}
          className={`mx-auto aspect-square max-h-[250px]`} 
          
        >
          <RadialBarChart
            data={chartData}
            endAngle={angle}
            innerRadius={65}
            outerRadius={95}
            className="stroke-round transition-colors"
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              className="stroke-gray-100 stroke-10"
              polarRadius={[80]}
            />
            <RadialBar dataKey="signal" background className={color}/>
            
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const {cx, cy} = viewBox;
                    return (
                      <text
                        x={cx}
                        y={cy}
                        textAnchor="middle"
                        dominantBaseline="alphabetic"
                      >
                        <tspan
                          x={cx}
                          y={cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {value}
                        </tspan>
                        <tspan 
                          x={cx + 30}
                          y={cy}
                          className="text-xl" 
                        >
                          %
                        </tspan>
                        <tspan
                          x={cx}
                          y={(cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Signal
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
    )
}
