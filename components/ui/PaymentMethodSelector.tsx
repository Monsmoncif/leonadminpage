"use client";

import React, { useState, useEffect } from "react";
import { Banknote, CreditCard, Coins, Check, Split } from "lucide-react";

export type SinglePaymentMethod = "Cash" | "Card" | "Crypto";

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (value: string) => void;
  totalAmount?: number;
  totalLabel?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const METHODS: { id: SinglePaymentMethod; label: string; sublabel: string; icon: any; color: string; bg: string; border: string; activeRing: string }[] = [
  {
    id: "Cash",
    label: "Cash",
    sublabel: "نقداً",
    icon: Banknote,
    color: "text-emerald-600",
    bg: "bg-emerald-50 text-emerald-800",
    border: "border-emerald-400",
    activeRing: "ring-2 ring-emerald-500/30 border-emerald-500 bg-emerald-50/70 text-emerald-900 font-bold",
  },
  {
    id: "Card",
    label: "Card",
    sublabel: "بطاقة",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50 text-blue-800",
    border: "border-blue-400",
    activeRing: "ring-2 ring-blue-500/30 border-blue-500 bg-blue-50/70 text-blue-900 font-bold",
  },
  {
    id: "Crypto",
    label: "Crypto",
    sublabel: "رقمي",
    icon: Coins,
    color: "text-amber-600",
    bg: "bg-amber-50 text-amber-800",
    border: "border-amber-400",
    activeRing: "ring-2 ring-amber-500/30 border-amber-500 bg-amber-50/70 text-amber-900 font-bold",
  },
];

export default function PaymentMethodSelector({
  value = "Cash",
  onChange,
  totalAmount,
  totalLabel = "Total Due",
  label = "Payment Method / طريقة الدفع",
  className = "",
  disabled = false,
}: PaymentMethodSelectorProps) {
  // Parse incoming value to see if it's already split
  const parseInitialState = (val: string) => {
    const isMultiple = val.includes("+") || val.includes(",") || val.includes("and") || val.includes("(");
    const selected: SinglePaymentMethod[] = [];
    if (/cash/i.test(val)) selected.push("Cash");
    if (/card/i.test(val)) selected.push("Card");
    if (/crypto/i.test(val)) selected.push("Crypto");

    // Extract amounts if present: e.g. "Cash ($100) + Card ($200)"
    const amounts: Record<SinglePaymentMethod, string> = { Cash: "", Card: "", Crypto: "" };
    const cashMatch = val.match(/cash\s*(?:\(?\$?\s*([0-9.]+)\)?)?/i);
    const cardMatch = val.match(/card\s*(?:\(?\$?\s*([0-9.]+)\)?)?/i);
    const cryptoMatch = val.match(/crypto\s*(?:\(?\$?\s*([0-9.]+)\)?)?/i);

    if (cashMatch && cashMatch[1]) amounts.Cash = cashMatch[1];
    if (cardMatch && cardMatch[1]) amounts.Card = cardMatch[1];
    if (cryptoMatch && cryptoMatch[1]) amounts.Crypto = cryptoMatch[1];

    return {
      isSplit: isMultiple || selected.length > 1,
      selected: selected.length > 0 ? selected : (["Cash"] as SinglePaymentMethod[]),
      amounts,
    };
  };

  const [initial] = useState(() => parseInitialState(value));
  const [isSplitMode, setIsSplitMode] = useState<boolean>(initial.isSplit);
  const [selectedMethods, setSelectedMethods] = useState<SinglePaymentMethod[]>(initial.selected);
  const [splitAmounts, setSplitAmounts] = useState<Record<SinglePaymentMethod, string>>(initial.amounts);

  // Helper to build the emitted string
  const emitValue = (isSplit: boolean, methods: SinglePaymentMethod[], amounts: Record<SinglePaymentMethod, string>) => {
    if (!isSplit || methods.length <= 1) {
      const single = methods[0] || "Cash";
      onChange(single);
      return;
    }

    const hasAnyAmount = methods.some((m) => amounts[m] && Number(amounts[m]) > 0);
    if (hasAnyAmount) {
      const parts = methods.map((m) => {
        const amt = amounts[m];
        return amt && Number(amt) > 0 ? `${m} ($${amt})` : m;
      });
      onChange(parts.join(" + "));
    } else {
      onChange(methods.join(" + "));
    }
  };

  // Toggle single method click
  const handleSingleSelect = (method: SinglePaymentMethod) => {
    if (disabled) return;
    setSelectedMethods([method]);
    emitValue(false, [method], splitAmounts);
  };

  // Toggle mode
  const handleModeToggle = (split: boolean) => {
    if (disabled) return;
    setIsSplitMode(split);
    if (!split) {
      const fallback = selectedMethods[0] || "Cash";
      setSelectedMethods([fallback]);
      emitValue(false, [fallback], splitAmounts);
    } else {
      // Default to 2 methods if only 1 was active
      let next = [...selectedMethods];
      if (next.length === 1) {
        const other = METHODS.find((m) => m.id !== next[0])?.id || "Card";
        next.push(other);
      }
      setSelectedMethods(next);
      emitValue(true, next, splitAmounts);
    }
  };

  // Toggle method inside split mode
  const handleToggleSplitMethod = (method: SinglePaymentMethod) => {
    if (disabled) return;
    let next: SinglePaymentMethod[];
    if (selectedMethods.includes(method)) {
      if (selectedMethods.length <= 1) return; // Keep at least 1
      next = selectedMethods.filter((m) => m !== method);
    } else {
      next = [...selectedMethods, method];
    }
    setSelectedMethods(next);
    emitValue(true, next, splitAmounts);
  };

  // Handle amount change for split method
  const handleAmountChange = (method: SinglePaymentMethod, val: string) => {
    if (disabled) return;
    const nextAmounts = { ...splitAmounts, [method]: val };
    setSplitAmounts(nextAmounts);
    emitValue(true, selectedMethods, nextAmounts);
  };

  // Split evenly helper
  const handleSplitEvenly = () => {
    if (!totalAmount || totalAmount <= 0 || selectedMethods.length === 0) return;
    const share = (totalAmount / selectedMethods.length).toFixed(2);
    const nextAmounts: Record<SinglePaymentMethod, string> = { Cash: "", Card: "", Crypto: "" };
    selectedMethods.forEach((m) => {
      nextAmounts[m] = share;
    });
    setSplitAmounts(nextAmounts);
    emitValue(true, selectedMethods, nextAmounts);
  };

  // Calculate allocated vs total
  const totalAllocated = selectedMethods.reduce((sum, m) => sum + (Number(splitAmounts[m]) || 0), 0);
  const remaining = totalAmount !== undefined ? Math.max(0, totalAmount - totalAllocated) : undefined;

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-text-primary block">
          {label}
        </label>
        <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[11px] font-semibold">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeToggle(false)}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              !isSplitMode
                ? "bg-white text-text-primary shadow-2xs font-bold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Single Method
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleModeToggle(true)}
            className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
              isSplitMode
                ? "bg-brand text-white shadow-2xs font-bold"
                : "text-text-muted hover:text-brand"
            }`}
          >
            <Split size={12} />
            <span>Split (2 or 3)</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Single Selection (1 of 3) */}
      {!isSplitMode ? (
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMethods[0] === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => handleSingleSelect(m.id)}
                className={`py-2 px-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer select-none ${
                  isSelected
                    ? `${m.activeRing} shadow-sm`
                    : "bg-white text-text-secondary border-border hover:bg-gray-50/80 hover:border-gray-300"
                } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? m.bg : "bg-gray-100"}`}>
                  <Icon size={15} className={isSelected ? m.color : "text-gray-500"} />
                </div>
                <div className="leading-tight text-center">
                  <span className="block text-xs">{m.label}</span>
                  <span className="text-[10px] text-text-muted font-normal block">{m.sublabel}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Mode 2: Split Selection across 2 or 3 Methods with Amount Breakdown */
        <div className="p-3.5 bg-white rounded-xl border border-brand/20 bg-brand/[0.02] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-text-secondary">
              Select 2 or 3 payment methods:
            </span>
            {totalAmount !== undefined && totalAmount > 0 && (
              <button
                type="button"
                onClick={handleSplitEvenly}
                className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
              >
                Split Evenly (${(totalAmount / selectedMethods.length).toFixed(2)} each)
              </button>
            )}
          </div>

          {/* Toggle pills for all 3 methods */}
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethods.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleToggleSplitMethod(m.id)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none ${
                    isSelected
                      ? `${m.activeRing} shadow-sm`
                      : "bg-white text-text-muted border-border hover:bg-gray-50 opacity-70"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Icon size={14} className={isSelected ? m.color : "text-gray-400"} />
                  <span>{m.label}</span>
                  {isSelected && <Check size={13} className="text-brand shrink-0 ml-auto" />}
                </button>
              );
            })}
          </div>

          {/* Split Amount Inputs for Active Methods */}
          <div className="space-y-2 pt-1 border-t border-border/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedMethods.map((m) => {
                const methodInfo = METHODS.find((item) => item.id === m);
                const Icon = methodInfo?.icon || Banknote;
                return (
                  <div key={m} className="p-2.5 rounded-lg border border-border/80 bg-surface flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon size={14} className={methodInfo?.color || "text-brand"} />
                      <span className="text-xs font-bold text-text-primary truncate">{m} Amount:</span>
                    </div>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={splitAmounts[m] || ""}
                        onChange={(e) => handleAmountChange(m, e.target.value)}
                        className="w-full pl-5 pr-2 py-1 text-xs font-bold text-text-primary bg-white border border-border rounded-md focus:ring-1 focus:ring-brand focus:border-brand outline-none text-right"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Split summary indicator if totalAmount is given */}
            {totalAmount !== undefined && totalAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] pt-1 px-1 font-semibold">
                <span className="text-text-muted">
                  {totalLabel}: <strong className="text-text-primary font-bold">${totalAmount.toFixed(2)}</strong>
                </span>
                <span className={Math.abs(totalAllocated - totalAmount) < 0.01 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                  Allocated: ${totalAllocated.toFixed(2)}
                  {Math.abs(totalAllocated - totalAmount) >= 0.01 && remaining !== undefined && (
                    <span className="text-red-600 ml-1">(${remaining.toFixed(2)} left)</span>
                  )}
                  {Math.abs(totalAllocated - totalAmount) < 0.01 && <span className="ml-1 text-emerald-600">✓</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
