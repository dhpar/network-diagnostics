import { Area, AreaChart, CartesianGrid, createHorizontalChart, Tooltip, XAxis, YAxis } from 'recharts';
import { generateMockData, RechartsDevtools, type MockDataType } from '@recharts/devtools';

const data = generateMockData(6, 598905);
const Typed = createHorizontalChart<MockDataType, string, number>()({ 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  Tooltip 
});

// #endregion
const SimpleArea = ({ isAnimationActive = true }) => (
  <Typed.AreaChart
    responsive
    data={data}
    className='mt-10 mb-0 mx-0 w-full max-w-3xl max-h-3/4 aspect-video'
  >
    <defs>
      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="var(--color-gray-100)" stopOpacity={0.8} />
        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid />
    <Typed.XAxis dataKey="label" />
    <Typed.YAxis width="auto" />
    <Tooltip />
    <Typed.Area
      type="monotone"
      dataKey="x"
      stroke="#8884d8"
      activeDot={{ stroke: '#8884d8' }}
      fillOpacity={1}
      fill="url(#colorUv)"
      isAnimationActive={isAnimationActive}
      animationBegin={200}
      animationDuration={1300}
    />
    <Typed.Area
      type="monotone"
      dataKey="y"
      stroke="#82ca9d"
      activeDot={{ stroke: '#82ca9d' }}
      fillOpacity={1}
      fill="url(#colorPv)"
      isAnimationActive={isAnimationActive}
    />
    <RechartsDevtools />
  </Typed.AreaChart>
);

export default SimpleArea;
