"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Calendar, 
  DollarSign, 
  Plus, 
  Minus,
  CalendarPlus,
  User,
  Phone,
  Clock,
  ArrowRight,
  CreditCard,
  Sparkles,
  Gauge,
  Banknote,
  Coins
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useToast } from "@/components/providers/ToastProvider";

interface ExtendRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contract: any;
}

export default function ExtendRentalModal({
  isOpen,
  onClose,
  onSuccess,
  contract,
}: ExtendRentalModalProps) {
  const [extraDays, setExtraDays] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setExtraDays(1);
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  const contractNum = (contract._id || contract.id || "").toString().substring(0, 8).toUpperCase();
  const dailyRate = Number(contract.dailyRate) || 0;

  // Compute dates
  const currentEndDate = contract.rawEndDate 
    ? new Date(contract.rawEndDate) 
    : new Date(contract.endDate);
  
  const safeCurrentEndDate = isNaN(currentEndDate.getTime()) ? new Date() : currentEndDate;

  const newEndDate = new Date(safeCurrentEndDate);
  newEndDate.setDate(newEndDate.getDate() + extraDays);

  const currentTotalDays = Number(contract.totalDays) || 1;
  const newTotalDays = currentTotalDays + extraDays;
  const extensionCost = extraDays * dailyRate;

  // Auxiliary fees
  const babySeatFees = Number(contract.babySeatFees) || 0;
  const tintingFees = Number(contract.tintingFees) || 0;
  const deliveryCharges = Number(contract.deliveryCharges) || 0;
  const salikFees = Number(contract.salikFees) || 0;
  const cleaningFees = Number(contract.cleaningFees) || 0;
  const extraKmCharge = Number(contract.extraKmCharge) || 0;
  const damageCharge = Number(contract.damageCharge) || 0;

  const newTotalAmount = (newTotalDays * dailyRate) + babySeatFees + tintingFees + deliveryCharges + salikFees + cleaningFees + extraKmCharge + damageCharge;
  const currentContractAmount = Number(contract.totalAmount) || ((currentTotalDays * dailyRate) + babySeatFees + tintingFees + deliveryCharges + salikFees + cleaningFees + extraKmCharge + damageCharge);

  const vehicleName = contract.vehicle || (contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle");
  const vehiclePlate = contract.vehiclePlate || contract.unitId?.plate || "";
  const clientName = contract.customer || contract.clientId?.name || "Client";
  const clientPhone = contract.customerPhone || contract.clientId?.phone || "";
  const paymentMethod = contract.paymentMethod || "Cash";
  const paymentStatus = contract.paymentStatus || "Pending";

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString("en-US", { 
      weekday: "short", 
      month: "short", 
      day: "numeric", 
      year: "numeric" 
    });
  };

  const handleSubmit = async () => {
    if (extraDays < 1) {
      setError("Extension must be at least 1 day.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        endDate: newEndDate.toISOString(),
        totalDays: newTotalDays,
        totalAmount: newTotalAmount,
      };

      const contractId = contract._id || contract.id;
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to extend rental");
      }

      toast.success(`Rental extended by ${extraDays} day${extraDays > 1 ? 's' : ''}! New return date: ${formatDateDisplay(newEndDate)}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to extend rental");
      toast.error(err.message || "Failed to extend rental");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl sm:max-w-3xl md:max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-border/80 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        
        {/* ================= MODAL HEADER (MATCHES CONTRACT DETAILS MODAL) ================= */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border/80 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarPlus size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
                  Extend Rental Contract
                </h2>
              </div>
              <p className="text-[11px] sm:text-xs text-text-muted truncate mt-0.5">
                تمديد فترة الإيجار — Add extra days, update scheduled return date, and recalculate financials.
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-200 active:scale-95 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= CONTENT AREA (MATCHES CONTRACT DETAILS MODAL) ================= */}
        <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain space-y-4 sm:space-y-5">
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 border border-red-200 shadow-2xs animate-fade-in">
              <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-600" />
              <div>
                <strong className="block font-bold mb-0.5">Extension Notice:</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* ================= SECTION 1: CURRENT RENTAL AGREEMENT CONTEXT ================= */}
          <div className="bg-gray-50/80 rounded-2xl border border-border p-3.5 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-text-primary">
                    Current Rental Baseline
                  </h4>
                  <p className="text-[11px] sm:text-xs text-text-muted">
                    Assigned vehicle, customer contract terms, and active agreement timeline
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-text-secondary bg-white px-2.5 py-1 rounded-lg border border-border/80 shadow-2xs">
                Agreement Snapshot
              </span>
            </div>

            {/* Baseline Detail Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              
              {/* Vehicle Card */}
              <div className="bg-white p-3 rounded-xl border border-border/70 space-y-1 shadow-2xs">
                <span className="text-text-muted block text-[11px] mb-0.5">Assigned Vehicle:</span>
                <strong className="text-text-primary font-bold flex items-center gap-1.5 truncate text-xs">
                  <ExecutiveCarIcon size={14} className="text-brand shrink-0" />
                  <span className="truncate">{vehicleName}</span>
                </strong>
                {vehiclePlate && (
                  <span className="text-[10px] text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded font-semibold inline-block">
                    {vehiclePlate}
                  </span>
                )}
              </div>

              {/* Client Card */}
              <div className="bg-white p-3 rounded-xl border border-border/70 space-y-1 shadow-2xs">
                <span className="text-text-muted block text-[11px] mb-0.5">Customer:</span>
                <strong className="text-text-primary font-bold flex items-center gap-1.5 truncate text-xs">
                  <User size={13} className="text-brand shrink-0" />
                  <span className="truncate">{clientName}</span>
                </strong>
                {clientPhone && (
                  <span className="text-[10px] text-text-muted flex items-center gap-1 truncate">
                    <Phone size={10} className="text-text-muted" />
                    {clientPhone}
                  </span>
                )}
              </div>

              {/* Current Duration & Daily Rate */}
              <div className="bg-white p-3 rounded-xl border border-border/70 space-y-1 shadow-2xs">
                <span className="text-text-muted block text-[11px] mb-0.5">Rate &amp; Duration:</span>
                <strong className="text-text-primary font-bold flex items-center gap-1 text-xs">
                  <DollarSign size={13} className="text-emerald-600 shrink-0" />
                  ${dailyRate}/day • {currentTotalDays} days
                </strong>
                <span className="text-[10px] text-text-muted block">
                  Original: ${currentContractAmount.toFixed(2)}
                </span>
              </div>

              {/* Payment Method & Status */}
              <div className="bg-white p-3 rounded-xl border border-border/70 space-y-1 shadow-2xs">
                <span className="text-text-muted block text-[11px] mb-0.5">Payment Terms:</span>
                <div className="flex items-center justify-between">
                  <strong className="text-text-primary font-bold text-xs flex items-center gap-1.5">
                    {paymentMethod?.startsWith("Split") ? (
                      <>
                        <CreditCard size={13} className="text-brand shrink-0" />
                        <span>{paymentMethod}</span>
                      </>
                    ) : paymentMethod === "Crypto" ? (
                      <>
                        <Coins size={13} className="text-amber-600 shrink-0" />
                        <span>Crypto (USDT)</span>
                      </>
                    ) : paymentMethod === "Card" ? (
                      <>
                        <CreditCard size={13} className="text-blue-600 shrink-0" />
                        <span>Card</span>
                      </>
                    ) : (
                      <>
                        <Banknote size={13} className="text-emerald-600 shrink-0" />
                        <span>Cash</span>
                      </>
                    )}
                  </strong>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    paymentStatus === "Paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paymentStatus === "Partial"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {paymentStatus}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ================= SECTION 2: EXTENSION DAYS CONFIGURATION ================= */}
          <div className="bg-white rounded-2xl border border-border p-3.5 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-text-primary">
                    Rental Duration Extension
                  </h4>
                  <p className="text-[11px] sm:text-xs text-text-muted">
                    Configure the number of additional days and preview the new return date
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg">
                +{extraDays} {extraDays === 1 ? "Day" : "Days"} Extension
              </span>
            </div>

            {/* Stepper & Input Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              
              {/* Stepper Controls */}
              <div className="space-y-2.5 bg-gray-50/70 p-3.5 rounded-xl border border-border/60">
                <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarPlus size={14} className="text-brand" />
                    Extra Days to Add (عدد الأيام الإضافية)
                  </span>
                  <span className="text-[10px] text-text-muted font-normal">Min: 1 day</span>
                </label>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExtraDays(Math.max(1, extraDays - 1))}
                    disabled={extraDays <= 1 || isSubmitting}
                    className="w-11 h-11 rounded-xl border border-border bg-white hover:bg-gray-100 active:scale-95 text-text-primary font-bold text-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
                    title="Decrease 1 Day"
                  >
                    <Minus size={18} />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="1"
                      value={extraDays}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 1);
                        setExtraDays(val);
                      }}
                      className="w-full text-center text-2xl font-black text-brand border border-border rounded-xl py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand shadow-2xs"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-text-muted uppercase">
                      Days
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExtraDays(extraDays + 1)}
                    disabled={isSubmitting}
                    className="w-11 h-11 rounded-xl border border-border bg-white hover:bg-gray-100 active:scale-95 text-text-primary font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    title="Add 1 Day"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-text-muted font-semibold mr-1">Quick Select:</span>
                  {[
                    { days: 1, label: "+1 Day" },
                    { days: 3, label: "+3 Days" },
                    { days: 7, label: "+1 Week" },
                    { days: 14, label: "+2 Weeks" },
                    { days: 30, label: "+1 Month" },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => setExtraDays(preset.days)}
                      disabled={isSubmitting}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        extraDays === preset.days
                          ? "bg-brand text-white border-brand shadow-2xs ring-1 ring-brand"
                          : "bg-white hover:bg-gray-100 text-text-secondary border-border"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Comparison Visualizer */}
              <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/70 space-y-2.5">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Clock size={14} className="text-brand" />
                  Scheduled Return Date Comparison
                </span>

                <div className="space-y-2 text-xs">
                  {/* Before */}
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-text-muted block">Current Scheduled Return:</span>
                      <strong className="text-text-primary font-bold">
                        {formatDateDisplay(safeCurrentEndDate)}
                      </strong>
                    </div>
                    <span className="text-[10px] font-semibold text-text-muted bg-gray-100 px-2 py-0.5 rounded">
                      {currentTotalDays} days
                    </span>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="flex items-center justify-center">
                    <span className="text-[11px] font-bold text-brand bg-white px-3 py-0.5 rounded-full border border-blue-200 shadow-2xs flex items-center gap-1">
                      <span>Extension: +{extraDays} day{extraDays > 1 ? 's' : ''}</span>
                      <ArrowRight size={11} className="text-brand" />
                    </span>
                  </div>

                  {/* After */}
                  <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-semibold block">New Extended Return Date:</span>
                      <strong className="text-emerald-900 font-bold">
                        {formatDateDisplay(newEndDate)}
                      </strong>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                      {newTotalDays} days total
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ================= SECTION 3: FINANCIAL SETTLEMENT & RECALCULATION ================= */}
          <div className="bg-white rounded-2xl border border-border p-3.5 sm:p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-text-primary">
                    Financial Summary &amp; Recalculation
                  </h4>
                  <p className="text-[11px] sm:text-xs text-text-muted">
                    Dynamic contract recalculation based on daily rate and additional duration
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
                Live Calculation
              </span>
            </div>

            {/* 3 Metric Cards (Matches Return Dispatcher / Booking Details) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Card 1: Current Total */}
              <div className="p-3 bg-gray-50 rounded-xl border border-border/60 space-y-1">
                <span className="text-[11px] font-medium text-text-muted block">
                  Current Total Amount
                </span>
                <strong className="text-base sm:text-lg font-black text-text-primary block">
                  ${currentContractAmount.toFixed(2)}
                </strong>
                <span className="text-[10px] text-text-muted block">
                  {currentTotalDays} days @ ${dailyRate}/day
                </span>
              </div>

              {/* Card 2: Extension Cost */}
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    Extension Cost Addition
                  </span>
                  <span className="text-[9px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                    +{extraDays}d
                  </span>
                </div>
                <strong className="text-base sm:text-lg font-black text-amber-700 block">
                  +${extensionCost.toFixed(2)}
                </strong>
                <span className="text-[10px] text-amber-700/90 block">
                  {extraDays} day{extraDays > 1 ? 's' : ''} × ${dailyRate}/day
                </span>
              </div>

              {/* Card 3: New Total */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 block">
                    New Total Contract Value
                  </span>
                  <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                    Updated
                  </span>
                </div>
                <strong className="text-base sm:text-lg font-black text-emerald-700 block">
                  ${newTotalAmount.toFixed(2)}
                </strong>
                <span className="text-[10px] text-emerald-700/80 block">
                  {newTotalDays} total rental days
                </span>
              </div>

            </div>

          </div>

        </div>

        {/* ================= FOOTER (MATCHES CONTRACT DETAILS MODAL) ================= */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-gray-50/80 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 min-h-[42px] sm:min-h-[40px] text-text-secondary hover:text-text-primary hover:bg-gray-200 active:scale-[0.98] rounded-xl transition-all font-semibold text-xs sm:text-sm cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 min-h-[42px] sm:min-h-[40px] bg-brand hover:bg-brand-dark active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Updating Contract...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Extension (+{extraDays} Days)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
