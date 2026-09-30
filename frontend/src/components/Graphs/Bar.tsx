import type { FunctionComponent } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
export const BarGraph:FunctionComponent<{}> = ({}) => (
<ResponsiveContainer
  height="100%"
  width="100%"
>
  <BarChart
    accessibilityLayer
    barCategoryGap="10%"
    barGap={4}
    data={[
      {
        amt: 1400,
        name: 'Page A',
        pv: 800,
        uv: 590
      }
    ]}
    height={300}
    layout="horizontal"
    margin={{
      bottom: 5,
      left: 20,
      right: 30,
      top: 20
    }}
    responsive={false}
    reverseStackOrder={false}
    stackOffset="none"
    syncMethod="index"
    throttleDelay="raf"
    throttledEvents={[
      'mousemove',
      'touchmove',
      'pointermove',
      'scroll',
      'wheel'
    ]}
    width={500}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Legend
      onClick={function tH(){}}
      onMouseEnter={function tH(){}}
      onMouseOut={function tH(){}}
    />
    <Bar
      activeBar={{
        fill: 'gold'
      }}
      dataKey="pv"
      fill="#8884d8"
      hide={false}
      stackId="a"
    />
    <Bar
      activeBar={{
        fill: 'silver'
      }}
      dataKey="uv"
      fill="#82ca9d"
      hide={false}
      stackId="a"
    />
    <Tooltip
      defaultIndex={1}
      shared={false}
    />
  </BarChart>
</ResponsiveContainer>)