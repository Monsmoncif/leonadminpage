"use client";

import React from "react";
import { Fuel } from "lucide-react";

interface FuelLevelSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  sublabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const PRESET_PERCENTAGES = [10, 25, 50, 75, 100];

export default function FuelLevelSelector({
  value = 100,
  onChange,
  label = "Fuel Level Percentage",
  sublabel,
  required = false,
  disabled = false,
  className = ""
}: FuelLevelSelectorProps) {
  const currentVal = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <div className={`p-5 rounded-2xl bg-surface border border-border/80 space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fuel size={18} className="text-brand shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-text-primary">{label}</h2>
              {required && <span className="text-red-500 font-bold">*</span>}
            </div>
            {sublabel && (
              <p className="text-[11px] text-text-muted mt-0.5">{sublabel}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full shrink-0">
          {currentVal}%
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="5"
        disabled={disabled}
        value={currentVal}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <div className="grid grid-cols-5 gap-2">
        {PRESET_PERCENTAGES.map((pct) => (
          <button
            key={pct}
            type="button"
            disabled={disabled}
            onClick={() => onChange(pct)}
            className={`py-2 rounded-xl text-xs font-bold transition-colors border cursor-pointer select-none ${
              currentVal === pct
                ? "bg-brand text-white border-brand shadow-sm"
                : "bg-white text-text-secondary border-border hover:bg-gray-50"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {pct}%
          </button>
        ))}
      </div>
    </div>
  );
}
