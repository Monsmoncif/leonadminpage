"use client";

import React, { useState, useEffect } from "react";

interface RentalDaysControlProps {
  days: number;
  onChange: (nextDays: number) => void;
  disabled?: boolean;
}

/**
 * Compact bidirectional Days stepper synced with contract Start/End dates and billing amount.
 */
export default function RentalDaysControl({
  days,
  onChange,
  disabled = false,
}: RentalDaysControlProps) {
  const safeDays = Math.max(1, Math.trunc(Number(days) || 1));
  const [draft, setDraft] = useState(String(safeDays));

  useEffect(() => {
    setDraft(String(safeDays));
  }, [safeDays]);

  return (
    <div className="flex items-center gap-1.5 bg-white border border-border rounded-lg px-2 py-1 shadow-2xs shrink-0">
      <span className="text-[11px] font-semibold text-text-secondary">Days (الأيام):</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, safeDays - 1))}
        disabled={disabled || safeDays <= 1}
        aria-label="Decrease days"
        className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-text-primary font-bold flex items-center justify-center cursor-pointer"
      >
        -
      </button>
      <input
        type="number"
        min={1}
        disabled={disabled}
        value={draft}
        onChange={(e) => {
          const raw = e.target.value;
          setDraft(raw);
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed >= 1) {
            onChange(parsed);
          }
        }}
        onBlur={() => {
          const parsed = parseInt(draft, 10);
          const clamped = isNaN(parsed) || parsed < 1 ? safeDays : parsed;
          setDraft(String(clamped));
          if (clamped !== safeDays) onChange(clamped);
        }}
        className="w-11 text-center text-xs font-bold text-text-primary bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(safeDays + 1)}
        disabled={disabled}
        aria-label="Increase days"
        className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-text-primary font-bold flex items-center justify-center cursor-pointer"
      >
        +
      </button>
    </div>
  );
}

