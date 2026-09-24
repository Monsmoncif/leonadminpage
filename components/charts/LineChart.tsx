"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

interface LineChartProps {
  data: Array<Record<string, unknown>>;
  lines: Array<{
    dataKey: string;
    color: string;
    name: string;
    dashed?: boolean;
  }>;
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  yAxisFormatter?: (value: number) => string;
  useArea?: boolean;
}

export default function LineChartComponent({
  data,
  lines,
  xKey = "month",
  height = 280,
  showGrid = true,
  yAxisFormatter = (v: number) => `$${(v / 1000).toFixed(0)}K`,
  useArea = false,
}: LineChartProps) {
  const Chart = useArea ? AreaChart : RechartsLineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data}>
        <defs>
          {lines.map((line) => (
            <linearGradient key={`areaGrad-${line.dataKey}`} id={`areaGrad-${line.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity={0.25} />
              <stop offset="50%" stopColor={line.color} stopOpacity={0.08} />
              <stop offset="100%" stopColor={line.color} stopOpacity={0.01} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        )}
        <XAxis
          dataKey={xKey}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9CA3AF" }}
          tickFormatter={yAxisFormatter}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1E293B",
            border: "none",
            borderRadius: "12px",
            color: "white",
            fontSize: "13px",
            padding: "12px 16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}
          itemStyle={{ color: "white" }}
          labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
          cursor={{ strokeDasharray: "4 4", stroke: "#9CA3AF" }}
        />
        {lines.map((line) =>
          useArea ? (
            <Area
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2.5}
              fill={`url(#areaGrad-${line.dataKey})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: "white", stroke: line.color }}
            />
          ) : (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2.5}
              strokeDasharray={line.dashed ? "8 4" : undefined}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, fill: "white" }}
            />
          )
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
