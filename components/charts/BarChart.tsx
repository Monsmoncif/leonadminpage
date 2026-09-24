"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { useState } from "react";

interface BarChartProps {
  data: Array<Record<string, unknown>>;
  bars: Array<{ dataKey: string; color: string; name: string; stackId?: string; radius?: [number, number, number, number]; gradientTo?: string }>;
  xKey?: string;
  height?: number;
  showLegend?: boolean;
  yAxisFormatter?: (value: number) => string;
}

export default function BarChartComponent({
  data,
  bars,
  xKey = "month",
  height = 280,
  showLegend = false,
  yAxisFormatter = (v: number) => `${v}`,
}: BarChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        barGap={2}
        onMouseMove={(state) => {
          if (state?.activeTooltipIndex !== undefined && typeof state.activeTooltipIndex === "number") {
            setActiveIndex(state.activeTooltipIndex);
          }
        }}
        onMouseLeave={() => setActiveIndex(null)}
      >
        <defs>
          {bars.map((bar) => (
            <linearGradient key={`grad-${bar.dataKey}`} id={`barGrad-${bar.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={bar.gradientTo || bar.color} stopOpacity={1} />
              <stop offset="100%" stopColor={bar.color} stopOpacity={0.7} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
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
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
        />
        {showLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          />
        )}
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={`url(#barGrad-${bar.dataKey})`}
            stackId={bar.stackId}
            radius={bar.radius || [6, 6, 0, 0]}
            maxBarSize={36}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fillOpacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                style={{ transition: "fill-opacity 0.2s ease" }}
              />
            ))}
          </Bar>
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
