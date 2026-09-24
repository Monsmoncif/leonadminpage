import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import React from "react";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  change?: number;
  subtitle?: string;
  iconBg?: string;
  accentColor?: string;
  sparkData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 28;
  const w = 64;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} className="opacity-60 group-hover:opacity-100 transition-opacity duration-300">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  change,
  subtitle = "from last week",
  iconBg = "bg-blue-50",
  accentColor = "#3B82F6",
  sparkData,
}: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div
      className="bg-card rounded-2xl p-5 border border-border card-hover group relative overflow-hidden animate-fade-in-up"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Subtle background gradient */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04] -translate-y-8 translate-x-8 pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)` }}
      />

      <div className="flex items-start justify-between mb-3 relative">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center`}
          style={{
            background: `linear-gradient(135deg, ${accentColor}15 0%, ${accentColor}08 100%)`,
          }}
        >
          <Icon size={20} style={{ color: accentColor }} />
        </div>
        {sparkData && (
          <MiniSparkline data={sparkData} color={accentColor} />
        )}
        {!sparkData && (
          <button className="text-text-muted hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100">
            •••
          </button>
        )}
      </div>
      <p className="text-xs text-text-secondary font-medium mb-1">{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-text-primary animate-count-up">
          {value}
        </p>
        {change !== undefined && (
          <div className="text-right">
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? "bg-green-50 text-success"
                  : "bg-red-50 text-brand"
              }`}
            >
              {isPositive ? (
                <TrendingUp size={12} />
              ) : (
                <TrendingDown size={12} />
              )}
              {isPositive ? "+" : ""}
              {change}%
            </span>
            <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>
          </div>
        )}
      </div>
    </div>
  );
}
