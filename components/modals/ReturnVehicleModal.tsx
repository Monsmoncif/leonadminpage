"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  Gauge, 
  DollarSign,
  Banknote,
  CreditCard,
  Coins,
  Camera,
  Fuel
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useToast } from "@/components/providers/ToastProvider";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

interface ReturnVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  contract: any;
}

export default function ReturnVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  contract,
}: ReturnVehicleModalProps) {
  const [step, setStep] = useState(1);
  const [returnOdometer, setReturnOdometer] = useState("");
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(100);
  const [newDamages, setNewDamages] = useState("");
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});
  const [salikCharge, setSalikCharge] = useState("0");
  const [parkingCharge, setParkingCharge] = useState("0");
  const [finesCharge, setFinesCharge] = useState("0");
  const [fuelCharge, setFuelCharge] = useState("0");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [damages, setDamages] = useState<any[]>([]);
  const [allDamages, setAllDamages] = useState<any[]>([]);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<string>("Cash");
  const toast = useToast();

  useEffect(() => {
    if (isOpen && contract) {
      setStep(1);
      setReturnPaymentMethod(contract.paymentMethod || "Cash");
      setReturnFuelLevel(contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100);
      // Sync additional charges from contract
      setSalikCharge(String(contract.salikCharge || contract.salikFees || 0));
      setParkingCharge(String(contract.parkingCharge || contract.parkingFees || 0));
      setFinesCharge(String(contract.finesCharge || contract.finesFees || 0));
      setFuelCharge(String(contract.fuelCharge || contract.fuelFees || 0));
      const initialPhotos: Record<string, string> = {};
      if (Array.isArray(contract.returnPhotos)) {
        contract.returnPhotos.forEach((url: string, idx: number) => {
          if (url && VEHICLE_ANGLES[idx]) {
            initialPhotos[VEHICLE_ANGLES[idx]] = url;
          }
        });
      }
      setReturnPhotos(initialPhotos);
      fetch("/api/damages")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const contractDamages = data.filter(d => {
              const cId = d.contractId && typeof d.contractId === 'object' ? d.contractId._id : d.contractId;
              return cId && String(cId) === String(contract._id);
            });
            setDamages(contractDamages);
            setAllDamages(data);
          }
        })
        .catch(err => console.error("Error fetching damages:", err));
    }
  }, [isOpen, contract]);

  useEffect(() => {
    if (isOpen) {
      setReturnOdometer("");
      setNewDamages("");
      setError("");
    }
  }, [isOpen]);

  if (!isOpen || !contract) return null;

  const initialMileage = contract.checkoutMileage || contract.unitMileage || 0;
  const currentOdometer = Number(returnOdometer) || initialMileage;
  
  // Calculate extra KMs
  const totalLimit = (contract.dailyKmLimit || 0) * (contract.totalDays || 1);
  const kmDriven = Math.max(0, currentOdometer - initialMileage);
  const extraKm = Math.max(0, kmDriven - totalLimit);
  const pricePerExtraKm = contract.pricePerExtraKm || 0;
  const extraKmCharge = extraKm * pricePerExtraKm;

  const damageChargeNum = damages.reduce((sum, d) => sum + (d.cost || 0), 0);
  const salikChargeNum = Number(salikCharge) || 0;
  const parkingChargeNum = Number(parkingCharge) || 0;
  const finesChargeNum = Number(finesCharge) || 0;
  const fuelChargeNum = Number(fuelCharge) || 0;
  const finalTotal = extraKmCharge + damageChargeNum + salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum;

  const handleNext = () => {
    if (step === 1) {
      if (!returnOdometer) {
        setError("Please enter the return odometer reading.");
        return;
      }
      if (currentOdometer < initialMileage) {
        setError("Return odometer cannot be less than initial mileage.");
        return;
      }
    }
    setError("");
    setStep((prev) => prev + 1);
  };

  const handleBack = () => setStep((prev) => prev - 1);

  const handleSubmit = async () => {
    if (currentOdometer < initialMileage) {
      setError("Return odometer cannot be less than initial mileage.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const orderedReturnPhotos = VEHICLE_ANGLES.map(angle => returnPhotos[angle] || "");

      const payload = {
        status: "Completed",
        returnOdometer: currentOdometer,
        returnFuelLevel: Number(returnFuelLevel),
        newDamages,
        damageCharge: damageChargeNum,
        extraKmCharge,
        salikFees: salikChargeNum,
        salikCharge: salikChargeNum,
        parkingFees: parkingChargeNum,
        parkingCharge: parkingChargeNum,
        finesFees: finesChargeNum,
        finesCharge: finesChargeNum,
        fuelFees: fuelChargeNum,
        fuelCharge: fuelChargeNum,
        paymentMethod: returnPaymentMethod,
        paymentStatus: "Paid",
        returnAmountCollected: finalTotal,
        returnPaymentMethod: returnPaymentMethod,
        returnPhotos: orderedReturnPhotos,
      };

      const contractId = contract._id || contract.id;
      const response = await fetch(`/api/contracts/${contractId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete contract");
      }

      toast.success("Vehicle returned and contract closed successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to process return");
      toast.error(err.message || "Failed to process return");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <h3 className="text-lg font-bold flex items-center gap-2"><Gauge size={18} className="text-brand"/> Step 1: Odometer & Mileage</h3>
            
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mb-4">
              <h3 className="text-sm font-bold text-blue-900 mb-2">Contract Data</h3>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Daily Rate</span>
                <span className="font-semibold text-blue-900">${contract.dailyRate || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Daily KM Limit</span>
                <span className="font-semibold text-blue-900">{contract.dailyKmLimit ? `${contract.dailyKmLimit} km` : "Unlimited"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700 font-medium">Price per Extra KM</span>
                <span className="font-semibold text-blue-900">${contract.pricePerExtraKm || 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Initial Mileage
                </label>
                <div className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-100 text-text-secondary cursor-not-allowed">
                  {initialMileage.toLocaleString()} km
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  Return Odometer <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={initialMileage}
                  value={returnOdometer}
                  onChange={(e) => {
                    setReturnOdometer(e.target.value);
                    setError("");
                  }}
                  className={`w-full text-sm border rounded-xl px-4 py-2.5 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all ${error ? 'border-red-300 focus:border-red-500' : 'border-border focus:border-brand'}`}
                  placeholder="Enter final mileage"
                />
              </div>
            </div>

            {/* Fuel Level Selector */}
            <div className="p-3.5 bg-gray-50/80 rounded-xl border border-border/70">
              <FuelLevelSelector
                value={returnFuelLevel}
                onChange={(val) => setReturnFuelLevel(val)}
                label="Return Fuel Level (مستوى الوقود عند الاسترجاع)"
                sublabel={`Vehicle fuel percentage upon return (Initial was ${contract.checkoutFuelLevel !== undefined ? contract.checkoutFuelLevel : 100}%)`}
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-border/50 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Included KM Limit</span>
                <span className="font-semibold text-text-primary">{totalLimit.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Total KM Driven</span>
                <span className="font-semibold text-text-primary">{kmDriven.toLocaleString()} km</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">Extra KM</span>
                <span className={`font-semibold ${extraKm > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {extraKm.toLocaleString()} km
                </span>
              </div>
              <div className="flex justify-between text-sm pt-3 border-t border-border">
                <span className="text-text-primary font-semibold">Extra KM Charge</span>
                <span className="font-bold text-red-600">${extraKmCharge.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <h3 className="text-lg font-bold flex items-center gap-2"><ExecutiveCarIcon size={18} className="text-brand"/> Step 2: Damages & Condition</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider text-muted">Damages Recorded</h4>
                <span className="text-sm font-bold text-red-600">Total: ${damageChargeNum.toFixed(2)}</span>
              </div>
              
              {damages.length > 0 ? (
                <div className="space-y-2">
                  {damages.map((d: any) => (
                    <div key={d._id} className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-start shadow-sm">
                      <div>
                        <p className="text-sm font-semibold text-red-900">{d.description}</p>
                        <p className="text-xs text-red-700 mt-1">Status: {d.status}</p>
                      </div>
                      <span className="text-sm font-bold text-red-600">${d.cost}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-text-muted italic bg-gray-50 p-4 rounded-xl border border-border/50 text-center">
                  No damages recorded for this contract.<br/>(Add them in the Damages page)
                </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-semibold text-text-primary mb-1.5">
                  New Damages Found?
                </label>
                <select 
                  value={newDamages}
                  onChange={(e) => setNewDamages(e.target.value)}
                  className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                >
                  <option value="">No new damages</option>
                  {allDamages.filter(d => contract && (d.contractId?._id === contract._id || d.contractId === contract._id || d.contractId === contract.id)).map(d => (
                    <option key={d._id} value={d.description}>Damage Contract {d.contractId?.id || contract.id} - {d.description}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Camera size={18} className="text-brand" /> Step 3: Return Inspection Photos
            </h3>
            <VehicleInspectionPhotoCapture
              photos={returnPhotos}
              onChange={setReturnPhotos}
              title="Return Inspection Photos (صور فحص الاسترجاع)"
              subtitle="Capture or upload 8 standard angles to document vehicle condition upon return."
              badgeLabel="Shop Return"
            />
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-5 animate-fade-in-up">
            <h3 className="text-lg font-bold flex items-center gap-2"><DollarSign size={18} className="text-brand"/> Step 4: Return Charges &amp; Settlement</h3>
            
            {/* Additional Return Charges (SALIK, PARKING, FINES, FUEL) */}
            <div className="p-4 rounded-xl bg-surface border border-border/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Coins size={16} className="text-brand" />
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">Additional Return Charges & Penalties</h4>
                    <p className="text-[10px] text-text-muted">Enter any tolls, parking, violations, or fuel fees</p>
                  </div>
                </div>
                {(salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum) > 0 && (
                  <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                    +${(salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum).toFixed(2)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* SALIK */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-border/80">
                  <label className="text-[11px] font-bold text-text-primary flex items-center justify-between">
                    <span>SALIK (سالك)</span>
                    <span className="text-[9px] text-text-muted">$</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={salikCharge}
                      onChange={(e) => setSalikCharge(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                </div>

                {/* PARKING */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-border/80">
                  <label className="text-[11px] font-bold text-text-primary flex items-center justify-between">
                    <span>PARKING (مواقف)</span>
                    <span className="text-[9px] text-text-muted">$</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={parkingCharge}
                      onChange={(e) => setParkingCharge(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                </div>

                {/* FINES */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-border/80">
                  <label className="text-[11px] font-bold text-text-primary flex items-center justify-between">
                    <span>FINES (مخالفات)</span>
                    <span className="text-[9px] text-text-muted">$</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={finesCharge}
                      onChange={(e) => setFinesCharge(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-red-600 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                </div>

                {/* FUEL */}
                <div className="space-y-1 bg-white p-3 rounded-lg border border-border/80">
                  <label className="text-[11px] font-bold text-text-primary flex items-center justify-between">
                    <span>FUEL (وقود)</span>
                    <span className="text-[9px] text-text-muted">$</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={fuelCharge}
                      onChange={(e) => setFuelCharge(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Settlement Breakdown */}
            <div className="bg-gray-50 border border-border p-4 rounded-xl space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Extra KM Charge</span>
                <span className={`font-semibold ${extraKmCharge > 0 ? 'text-red-600' : 'text-text-primary'}`}>
                  {extraKmCharge > 0 ? `+$${extraKmCharge.toFixed(2)}` : "$0.00"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Damage Charges</span>
                <span className={`font-semibold ${damageChargeNum > 0 ? 'text-red-600' : 'text-text-primary'}`}>
                  {damageChargeNum > 0 ? `+$${damageChargeNum.toFixed(2)}` : "$0.00"}
                </span>
              </div>

              {salikChargeNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">SALIK / Tolls</span>
                  <span className="font-semibold text-brand">+${salikChargeNum.toFixed(2)}</span>
                </div>
              )}
              {parkingChargeNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Parking Fee</span>
                  <span className="font-semibold text-brand">+${parkingChargeNum.toFixed(2)}</span>
                </div>
              )}
              {finesChargeNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Traffic Fines</span>
                  <span className="font-semibold text-red-600">+${finesChargeNum.toFixed(2)}</span>
                </div>
              )}
              {fuelChargeNum > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Fuel Charge</span>
                  <span className="font-semibold text-brand">+${fuelChargeNum.toFixed(2)}</span>
                </div>
              )}

              {/* Payment Method for Extra Charges */}
              {finalTotal > 0 && (
                <div className="pt-2 border-t border-border">
                  <PaymentMethodSelector
                    value={returnPaymentMethod}
                    onChange={(val) => setReturnPaymentMethod(val)}
                    totalAmount={finalTotal}
                    totalLabel="Return Charges Due"
                    label="Payment Method for Extra Charges (طريقة دفع الرسوم الإضافية)"
                  />
                </div>
              )}
            </div>

            <div className="bg-brand/5 border border-brand/20 p-4 rounded-xl text-center">
              <p className="text-text-secondary text-xs font-medium mb-0.5">Total Return Charges Due</p>
              <div className={`text-2xl font-black ${finalTotal > 0 ? 'text-brand' : 'text-emerald-700'}`}>
                ${finalTotal.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-medium border border-emerald-100 flex items-start gap-2.5">
               <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
               <p>By completing this step, the vehicle status will automatically be set back to Available and the contract will be marked as Completed.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-lg font-bold text-text-primary">Return Vehicle</h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-1.5 shrink-0">
          <div 
            className="bg-brand h-1.5 transition-all duration-300 ease-out"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-start gap-3 border border-red-100">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50/50 flex justify-between items-center shrink-0">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle size={16} /> Complete Return
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
