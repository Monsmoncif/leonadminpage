"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { 
  User, 
  Calendar, 
  MapPin, 
  UserCheck, 
  Clock, 
  FileText, 
  CheckCircle2, 
  Loader2, 
  DollarSign, 
  Send, 
  ArrowLeft, 
  Navigation, 
  Gauge, 
  Phone, 
  Building2, 
  AlertTriangle, 
  ShieldCheck, 
  Check,
  ArrowRight,
  UserCog,
  Search,
  CheckCircle,
  Camera,
  RotateCcw,
  Coins,
  Fuel
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

// Helper for initials (matches clients & drivers page)
const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// Pastel avatar colors matching clients page
const getAvatarColor = (name: string) => {
  if (!name) return "bg-blue-100 text-blue-700";
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

// Step definitions matching /bookings/new pattern
const SHOP_STEPS = [
  { id: 1, title: "Contract & Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Mileage & Fuel", icon: Gauge },
  { id: 3, title: "Inspection & Condition", icon: Camera },
  { id: 4, title: "Settlement & Check-in", icon: CheckCircle2 },
];

const DISPATCH_STEPS = [
  { id: 1, title: "Contract & Car", icon: ExecutiveCarIcon },
  { id: 2, title: "Driver & Pickup", icon: UserCheck },
  { id: 3, title: "Review & Dispatch", icon: Send },
];

function ReturnPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const [contracts, setContracts] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [loading, setLoading] = useState(true);

  // Wizard State
  const [currentStep, setCurrentStep] = useState(1);
  const [contractSearchQuery, setContractSearchQuery] = useState("");
  const [isChangingContract, setIsChangingContract] = useState(false);

  // Return mode: "shop" (In-Store Counter) or "dispatch" (Dispatch Driver to Collect)
  const [returnMode, setReturnMode] = useState<"shop" | "dispatch">("shop");

  // In-Store Return form states
  const [returnOdometer, setReturnOdometer] = useState<string>("");
  const [shopReturnTime, setShopReturnTime] = useState<string>("");
  const [hasDamages, setHasDamages] = useState<boolean>(false);
  const [damageDescription, setDamageDescription] = useState<string>("");
  const [damageCost, setDamageCost] = useState<string>("0");
  const [salikCharge, setSalikCharge] = useState<string>("0");
  const [parkingCharge, setParkingCharge] = useState<string>("0");
  const [finesCharge, setFinesCharge] = useState<string>("0");
  const [fuelCharge, setFuelCharge] = useState<string>("0");
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(100);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<string>("Cash");
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});

  // Dispatch Driver form states
  const [returnDriverId, setReturnDriverId] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [instructions, setInstructions] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top smoothly on step change
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof document !== "undefined") {
      document.documentElement?.scrollTo({ top: 0, behavior: "smooth" });
      document.body?.scrollTo({ top: 0, behavior: "smooth" });
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToTop();
  }, [currentStep, returnMode]);

  // Load contracts and drivers
  useEffect(() => {
    Promise.all([
      fetch("/api/contracts", { cache: "no-store" }).then(res => res.json()),
      fetch("/api/drivers", { cache: "no-store" }).then(res => res.json())
    ])
      .then(([contractsData, driversData]) => {
        const list = contractsData.contracts || [];
        const activeList = list.filter((c: any) => c.status === "Active");
        setContracts(activeList.length > 0 ? activeList : list);

        const driversList = Array.isArray(driversData) ? driversData : (driversData.drivers || []);
        setDrivers(driversList);

        const qId = searchParams.get("contractId");
        if (qId) {
          const match = list.find((c: any) => c._id === qId || c.id === qId);
          if (match) setSelectedContractId(match._id);
        } else if (activeList.length > 0) {
          setSelectedContractId(activeList[0]._id);
        } else if (list.length > 0) {
          setSelectedContractId(list[0]._id);
        }
      })
      .catch(err => {
        console.error("Failed to load initial data:", err);
        toast.error("Failed to load contracts or drivers");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  const selectedContract = useMemo(() => {
    return contracts.find(c => c._id === selectedContractId || c.id === selectedContractId);
  }, [contracts, selectedContractId]);

  // When selected contract changes, populate fields
  useEffect(() => {
    if (selectedContract) {
      const isShop = selectedContract.contractType === "Shop" || selectedContract.contractType === "In-Store / Counter";
      setReturnMode(isShop ? "shop" : "dispatch");

      const initialLoc = (selectedContract.dropoffLocation && selectedContract.dropoffLocation !== "Main Office") 
        ? selectedContract.dropoffLocation 
        : (selectedContract.pickupLocation || "");
      setPickupLocation(initialLoc);
      
      setReturnDriverId(selectedContract.returnDriverId || "");

      const nowTimeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());
      if (selectedContract.checkinTime && selectedContract.checkinTime !== "Pending Handover") {
        setScheduledTime(selectedContract.checkinTime);
        setShopReturnTime(selectedContract.checkinTime);
      } else {
        setScheduledTime("10:00 AM");
        setShopReturnTime(nowTimeStr);
      }

      if (selectedContract.returnNotes) {
        setInstructions(selectedContract.returnNotes);
      } else {
        const legacyMatch = selectedContract.notes?.match(/\[Return Pickup Notes:\s*([\s\S]*?)\]$/);
        setInstructions(legacyMatch && legacyMatch[1] ? legacyMatch[1].trim() : "");
      }

      const initialOdo = selectedContract.checkoutMileage || selectedContract.unitMileage || 0;
      setReturnOdometer(String(initialOdo));
      setReturnFuelLevel(selectedContract.checkoutFuelLevel !== undefined ? Number(selectedContract.checkoutFuelLevel) : 100);
      setHasDamages(false);
      setDamageDescription("");
      setDamageCost("0");
      setSalikCharge(String(selectedContract.salikFees || selectedContract.salikCharge || 0));
      setParkingCharge(String(selectedContract.parkingFees || selectedContract.parkingCharge || 0));
      setFinesCharge(String(selectedContract.finesFees || selectedContract.finesCharge || 0));
      setFuelCharge(String(selectedContract.fuelFees || selectedContract.fuelCharge || 0));

      setReturnPaymentMethod(selectedContract.paymentMethod || "Cash");

      const initialPhotos: Record<string, string> = {};
      if (Array.isArray(selectedContract.returnPhotos)) {
        selectedContract.returnPhotos.forEach((url: string, idx: number) => {
          if (url && VEHICLE_ANGLES[idx]) {
            initialPhotos[VEHICLE_ANGLES[idx]] = url;
          }
        });
      }
      setReturnPhotos(initialPhotos);
    }
  }, [selectedContract]);

  const openGoogleMaps = (location: string) => {
    if (!location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  };

  // Calculations
  const vehicleName = selectedContract?.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
  const plateNumber = selectedContract?.vehiclePlate || "";
  const customerName = selectedContract?.customer || "Customer";
  const handoverLocation = selectedContract?.pickupLocation || "";

  const depositAmount = Number(selectedContract?.depositAmount) || (selectedContract?.deposit ? Number(String(selectedContract.deposit).replace(/[^0-9.]/g, '')) : 0);

  const initialMileage = Number(selectedContract?.checkoutMileage || selectedContract?.unitMileage || 0);
  const currentOdometerNum = returnOdometer.trim() !== "" ? (Number(returnOdometer) || 0) : initialMileage;
  const kmDriven = Math.max(0, currentOdometerNum - initialMileage);
  const dailyKmLimit = Number(selectedContract?.dailyKmLimit || 0);
  const totalDays = Number(selectedContract?.totalDays || 1);
  const totalIncludedKm = dailyKmLimit * totalDays;
  const extraKm = dailyKmLimit > 0 ? Math.max(0, kmDriven - totalIncludedKm) : 0;
  const pricePerExtraKm = Number(selectedContract?.pricePerExtraKm || 0);
  const extraKmCharge = extraKm * pricePerExtraKm;
  const damageChargeNum = hasDamages ? (Number(damageCost) || 0) : 0;
  const salikChargeNum = Number(salikCharge) || 0;
  const parkingChargeNum = Number(parkingCharge) || 0;
  const finesChargeNum = Number(finesCharge) || 0;
  const fuelChargeNum = Number(fuelCharge) || 0;

  // Return charges settlement
  const totalReturnCharges = extraKmCharge + damageChargeNum + salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum;

  // Stepper config
  const STEPS = returnMode === "shop" ? SHOP_STEPS : DISPATCH_STEPS;
  const totalSteps = STEPS.length;

  const handleNext = () => {
    // Step 1: Contract Selection validation
    if (currentStep === 1) {
      if (!selectedContract) {
        toast.error("Please select an active contract to return.");
        return;
      }
      setIsChangingContract(false);
    }

    // Step 2: Mileage & Fuel (Shop mode)
    if (returnMode === "shop" && currentStep === 2) {
      const odo = Number(returnOdometer);
      if (!returnOdometer.trim() || isNaN(odo) || odo < 0) {
        toast.error("Please enter a valid return odometer reading.");
        return;
      }
    }

    // Step 2: Driver & Pickup (Dispatch mode)
    if (returnMode === "dispatch" && currentStep === 2) {
      if (!returnDriverId) {
        toast.error("Please choose a return driver.");
        return;
      }
      if (!pickupLocation.trim()) {
        toast.error("Please specify a collection pickup location.");
        return;
      }
    }

    // Step 3: Condition & Photos (Shop mode)
    if (returnMode === "shop" && currentStep === 3) {
      if (hasDamages && !damageDescription.trim()) {
        toast.error("Please enter a description for the reported damage.");
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(c => c + 1);
      scrollToTop();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(c => c - 1);
      scrollToTop();
    }
  };

  // Submit In-Store Return
  const handleShopReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedContract) return;

    const odoNum = Number(returnOdometer);
    if (isNaN(odoNum) || odoNum < 0) {
      toast.error("Please enter a valid return odometer reading");
      return;
    }

    try {
      setIsSubmitting(true);

      const orderedReturnPhotos = VEHICLE_ANGLES.map(angle => returnPhotos[angle] || "");

      const payload = {
        status: "Completed",
        deliveryStatus: "Returned",
        checkinTime: shopReturnTime.trim() || scheduledTime || "10:00 AM",
        returnOdometer: odoNum,
        returnFuelLevel: Number(returnFuelLevel),
        extraKmCharge: extraKmCharge,
        damageCharge: damageChargeNum,
        salikFees: salikChargeNum,
        salikCharge: salikChargeNum,
        parkingFees: parkingChargeNum,
        parkingCharge: parkingChargeNum,
        finesFees: finesChargeNum,
        finesCharge: finesChargeNum,
        fuelFees: fuelChargeNum,
        fuelCharge: fuelChargeNum,
        damages: hasDamages && damageDescription.trim() ? [{
          description: damageDescription.trim(),
          cost: damageChargeNum,
          date: new Date()
        }] : [],
        paymentMethod: returnPaymentMethod,
        paymentStatus: "Paid",
        returnAmountCollected: totalReturnCharges,
        returnPaymentMethod: returnPaymentMethod,
        returnPhotos: orderedReturnPhotos,
        notes: instructions.trim() ? `${selectedContract.notes || ""}\n[Return Inspection Remarks: ${instructions.trim()}]`.trim() : selectedContract.notes
      };

      const res = await fetch(`/api/contracts/${selectedContract._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to complete return process");
      }

      toast.success("Vehicle returned and contract completed successfully!");
      setTimeout(() => {
        router.push("/bookings");
      }, 800);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while completing return");
      setIsSubmitting(false);
    }
  };

  // Submit Driver Dispatch
  const handleDispatch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedContract) return;

    if (!returnDriverId) {
      toast.error("Please select a return driver to dispatch");
      return;
    }

    if (!pickupLocation.trim()) {
      toast.error("Please enter a pickup location");
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedDriver = drivers.find(d => (d._id || d.userId) === returnDriverId);

      const res = await fetch(`/api/contracts/${selectedContract._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnDriverId: returnDriverId,
          returnDriver: selectedDriver ? selectedDriver.name : "Assigned Driver",
          dropoffLocation: pickupLocation.trim(),
          checkinTime: scheduledTime.trim() || "10:00 AM",
          returnNotes: instructions.trim(),
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to assign return driver");
      }

      toast.success("Return driver assigned successfully!");
      setTimeout(() => {
        router.push("/bookings");
      }, 800);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "An error occurred while assigning driver");
      setIsSubmitting(false);
    }
  };

  // Filter contracts by query
  const filteredContracts = useMemo(() => {
    if (!contractSearchQuery.trim()) return contracts;
    const q = contractSearchQuery.toLowerCase();
    return contracts.filter(c => 
      c.vehicle?.toLowerCase().includes(q) ||
      c.vehiclePlate?.toLowerCase().includes(q) ||
      c.customer?.toLowerCase().includes(q) ||
      c.id?.toLowerCase().includes(q) ||
      c._id?.toLowerCase().includes(q)
    );
  }, [contracts, contractSearchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 size={36} className="animate-spin text-brand" />
        <p className="text-sm font-semibold text-text-secondary">Loading vehicle return console...</p>
      </div>
    );
  }

  // ===================== STEP RENDERERS =====================

  // STEP 1: Contract & Vehicle Selection
  const renderContractStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Step 1: Select Active Contract &amp; Vehicle</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Confirm the active booking being returned to calculate initial mileage, duration, and settlement.
            </p>
          </div>
          {selectedContract && !isChangingContract && (
            <button
              type="button"
              onClick={() => setIsChangingContract(true)}
              className="text-xs font-bold text-brand hover:text-brand-dark px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/15 transition-all self-start sm:self-auto cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Change Contract</span>
            </button>
          )}
        </div>

        {/* Contract Selection Browser (shown if no contract or user clicked change) */}
        {(!selectedContract || isChangingContract) ? (
          <div className="space-y-4 p-5 rounded-2xl bg-surface border border-border/80">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-text-primary">Active Fleet Bookings</span>
              {selectedContract && (
                <button
                  type="button"
                  onClick={() => setIsChangingContract(false)}
                  className="text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Keep Selected Contract
                </button>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={contractSearchQuery}
                onChange={(e) => setContractSearchQuery(e.target.value)}
                placeholder="Search by car make, model, plate, client name, or contract #..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm font-medium text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
              />
            </div>

            {/* Contracts List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredContracts.map(c => {
                const isSelected = c._id === selectedContractId;
                const vName = c.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => {
                      setSelectedContractId(c._id);
                      setIsChangingContract(false);
                      toast.success(`Selected contract #${c.id || c._id.substring(0,8).toUpperCase()}`);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-xs"
                        : "border-border bg-white hover:border-gray-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-text-primary truncate">{vName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-text-secondary border border-border shrink-0">
                            {c.vehiclePlate || "NO-PLATE"}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary font-medium mt-0.5 truncate">
                          Client: <strong>{c.customer}</strong>
                        </p>
                      </div>
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                          <Check size={14} />
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-text-muted px-2 py-0.5 bg-gray-50 rounded border border-gray-200 shrink-0">
                          #{c.id || c._id.substring(0,8).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted border-t border-border/60 pt-2">
                      <span>{c.startDate || "—"} → {c.endDate || "—"}</span>
                      <span className="font-bold text-text-primary">
                        {c.contractType || "Shop"}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filteredContracts.length === 0 && (
                <div className="col-span-2 py-8 text-center text-text-muted text-xs">
                  No active contracts matching "{contractSearchQuery}".
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Selected Contract Executive Overview Card */
          <div className="space-y-4">
            {/* Top Metric Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard
                icon={DollarSign}
                label="Return Charges Due"
                value={`$${totalReturnCharges.toFixed(2)}`}
                accentColor={totalReturnCharges > 0 ? "#E53935" : "#22C55E"}
                subtitle={totalReturnCharges > 0 ? "Extra mileage & damages due" : "Clean return — no fees due"}
                sparkData={[0, 0, extraKmCharge, damageChargeNum, totalReturnCharges]}
              />
              <StatCard
                icon={Gauge}
                label="Checkout Mileage"
                value={`${initialMileage.toLocaleString()} km`}
                accentColor="#3B82F6"
                subtitle="Starting baseline odometer"
                sparkData={[initialMileage - 200, initialMileage - 100, initialMileage]}
              />
              <StatCard
                icon={Calendar}
                label="Rental Duration"
                value={`${totalDays} Days`}
                accentColor="#22C55E"
                subtitle={`${selectedContract?.startDate || "—"} to ${selectedContract?.endDate || "—"}`}
                sparkData={[1, 3, 5, 7, totalDays]}
              />
            </div>

            {/* Detailed Vehicle & Customer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Vehicle Details Card */}
              <div className="p-4 rounded-2xl bg-white border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <ExecutiveCarIcon size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Vehicle</span>
                    <h3 className="text-base font-bold text-text-primary truncate">{vehicleName}</h3>
                    <span className="inline-block mt-0.5 text-xs font-bold text-text-secondary px-2 py-0.5 bg-gray-100 rounded border border-border">
                      {plateNumber || "NO-PLATE"}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Contract Type:</span>
                    <strong className="font-semibold text-text-primary">{selectedContract.contractType || "Shop"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Checkout Mileage:</span>
                    <strong className="font-semibold text-text-primary">{initialMileage.toLocaleString()} km</strong>
                  </div>
                </div>
              </div>

              {/* 2. Customer Profile Card */}
              <div className="p-4 rounded-2xl bg-white border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${getAvatarColor(customerName)}`}>
                    {getInitials(customerName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Customer</span>
                    <h3 className="text-base font-bold text-text-primary truncate capitalize">{customerName}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-text-secondary font-medium mt-0.5">
                      <Phone size={12} className="text-text-muted shrink-0" />
                      <span className="truncate">{selectedContract.customerPhone || "No phone recorded"}</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Customer Type:</span>
                    <strong className="font-semibold text-text-primary">{selectedContract.customerType || "B2C"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pre-collected Deposit:</span>
                    <strong className="font-semibold text-emerald-700">${depositAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* 3. Rental Period & Location Card */}
              <div className="p-4 rounded-2xl bg-white border border-border shadow-xs space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Calendar size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Period</span>
                    <h3 className="text-base font-bold text-text-primary">{totalDays} Rental Days</h3>
                    <span className="text-xs text-text-secondary truncate block mt-0.5">
                      {selectedContract.startDate} → {selectedContract.endDate}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-1.5 pt-2 border-t border-border/60">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Daily Km Allowance:</span>
                    <strong className="font-semibold text-text-primary">{dailyKmLimit > 0 ? `${dailyKmLimit} km/day` : "Unlimited"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Pickup Location:</span>
                    <strong className="font-semibold text-text-primary truncate max-w-[150px]">{handoverLocation || "Main Office"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // STEP 2 (Shop): Mileage & Fuel Level Check-in
  const renderMileageAndFuelStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 2: Mileage &amp; Fuel Level Inspection</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Record the final odometer reading from the dashboard and inspect the remaining fuel level percentage.
          </p>
        </div>

        {/* 1. Odometer & Return Time Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Gauge size={18} className="text-brand" />
              <h3 className="text-sm font-bold text-text-primary">Odometer Reading &amp; Check-in Time</h3>
            </div>
            <span className="text-xs text-text-muted">
              Checkout Baseline: <strong className="font-bold text-text-primary">{initialMileage.toLocaleString()} km</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Odometer Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary block">
                  Final Return Odometer (km) <span className="text-brand">*</span>
                </label>
                <span className="text-xs font-medium text-text-muted">
                  Baseline: <strong className="text-text-secondary">{initialMileage.toLocaleString()} km</strong>
                </span>
              </div>
              <input
                type="number"
                required
                min="0"
                value={returnOdometer}
                onChange={(e) => setReturnOdometer(e.target.value)}
                placeholder={`e.g. ${initialMileage || 0}`}
                className="w-full text-base font-bold border border-border rounded-xl px-4 py-2.5 bg-white text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
              />
              {returnOdometer.trim() !== "" && Number(returnOdometer) < initialMileage && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium pt-0.5">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>Entered reading ({Number(returnOdometer).toLocaleString()} km) is lower than checkout baseline ({initialMileage.toLocaleString()} km).</span>
                </p>
              )}
            </div>

            {/* Check-in Time */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary">
                  Check-in Time <span className="text-brand">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());
                    setShopReturnTime(now);
                  }}
                  className="text-xs font-bold text-brand hover:underline cursor-pointer"
                >
                  Set Current Time
                </button>
              </div>
              <input
                type="text"
                required
                value={shopReturnTime}
                onChange={(e) => setShopReturnTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full text-sm font-bold border border-border rounded-xl px-4 py-2.5 bg-white text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Live Mileage Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3.5 bg-white rounded-xl border border-border text-center shadow-2xs">
              <span className="text-[11px] text-text-muted block uppercase tracking-wider font-semibold">Distance Driven</span>
              <strong className="font-bold text-text-primary text-base mt-0.5 block">{kmDriven} km</strong>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-border text-center shadow-2xs">
              <span className="text-[11px] text-text-muted block uppercase tracking-wider font-semibold">Included Allowance</span>
              <strong className="font-bold text-text-primary text-base mt-0.5 block">
                {dailyKmLimit > 0 ? `${totalIncludedKm} km` : "Unlimited"}
              </strong>
            </div>
            <div className={`p-3.5 rounded-xl border text-center shadow-2xs ${extraKm > 0 ? 'bg-red-50 border-red-200 text-brand' : 'bg-white border-border text-text-primary'}`}>
              <span className="text-[11px] block uppercase tracking-wider font-semibold opacity-80">Extra Mileage</span>
              <strong className="font-bold text-base mt-0.5 block">
                {extraKm > 0 ? `+${extraKm} km ($${extraKmCharge.toFixed(2)})` : "0 km"}
              </strong>
            </div>
          </div>
        </div>

        {/* 2. Fuel Level Selector */}
        <FuelLevelSelector
          value={returnFuelLevel}
          onChange={(val) => setReturnFuelLevel(val)}
          label="Return Fuel Level Percentage"
          sublabel="Indicate current tank fuel level. Baseline checkout fuel was recorded upon car handover."
        />
      </div>
    );
  };

  // STEP 3 (Shop): Inspection Photos & Condition
  const renderInspectionStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 3: Vehicle Inspection Photos &amp; Damage Status</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Document exterior condition across 8 standard angles and record any new damages discovered during handover.
          </p>
        </div>

        {/* Condition / Damages Toggle Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Vehicle Condition &amp; Damage Status</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasDamages(false)}
              className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !hasDamages
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm"
                  : "bg-white text-text-secondary border-border hover:bg-gray-50"
              }`}
            >
              <CheckCircle2 size={16} className={!hasDamages ? "text-emerald-600" : ""} />
              <span>Clean / No New Damages</span>
            </button>

            <button
              type="button"
              onClick={() => setHasDamages(true)}
              className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                hasDamages
                  ? "bg-red-50 text-brand border-red-300 shadow-sm"
                  : "bg-white text-text-secondary border-border hover:bg-gray-50"
              }`}
            >
              <AlertTriangle size={16} className={hasDamages ? "text-brand" : ""} />
              <span>Damages Reported</span>
            </button>
          </div>

          {hasDamages && (
            <div className="p-4 bg-red-50/60 border border-red-200 rounded-xl space-y-3 text-sm animate-fade-in">
              <div>
                <label className="font-semibold text-text-primary block mb-1 text-xs">
                  Damage Description &amp; Location <span className="text-brand">*</span>
                </label>
                <input
                  type="text"
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="e.g. Scratched rear bumper, cracked left headlight..."
                  className="w-full p-2.5 rounded-xl border border-red-200 bg-white text-sm text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-text-primary block mb-1 text-xs">
                  Repair / Compensation Charge ($)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-brand">$</span>
                  <input
                    type="number"
                    min="0"
                    value={damageCost}
                    onChange={(e) => setDamageCost(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl border border-red-200 bg-white text-sm font-bold text-brand focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8-Angle Vehicle Photo Inspection Capture */}
        <VehicleInspectionPhotoCapture
          photos={returnPhotos}
          onChange={setReturnPhotos}
          title="Return Inspection Photos (صور فحص الاسترجاع بالمحل)"
          subtitle="Capture or upload 8 standard angles to document vehicle condition and mileage upon shop return."
          badgeLabel="Shop Return"
        />
      </div>
    );
  };

  // STEP 4 (Shop): Settlement & Final Check-in
  const renderSettlementStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 4: Final Settlement &amp; Close Contract</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review the final return breakdown, settle any outstanding mileage or damage charges, and mark the contract Completed.
          </p>
        </div>

        {/* Additional Return Charges (SALIK, PARKING, FINES, FUEL) */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Coins size={18} className="text-brand" />
              <div>
                <h3 className="text-sm font-bold text-text-primary">Additional Return Charges &amp; Penalties</h3>
                <p className="text-[11px] text-text-muted">Enter any incurred tolls, parking tickets, traffic violations, or fuel replenishment fees</p>
              </div>
            </div>
            {(salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum) > 0 && (
              <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">
                +${(salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum).toFixed(2)} Added
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. SALIK (Tolls) */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-border/80 shadow-2xs">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>SALIK / Tolls (سالك)</span>
                <span className="text-[10px] text-text-muted">AED / $</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={salikCharge}
                  onChange={(e) => setSalikCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-surface text-sm font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[10px] text-text-muted block">Highway &amp; gate toll charges</span>
            </div>

            {/* 2. PARKING */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-border/80 shadow-2xs">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>PARKING (مواقف)</span>
                <span className="text-[10px] text-text-muted">AED / $</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={parkingCharge}
                  onChange={(e) => setParkingCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-surface text-sm font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[10px] text-text-muted block">Municipal / airport parking fees</span>
            </div>

            {/* 3. FINES */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-border/80 shadow-2xs">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>FINES (مخالفات)</span>
                <span className="text-[10px] text-text-muted">AED / $</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={finesCharge}
                  onChange={(e) => setFinesCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-surface text-sm font-bold text-red-600 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[10px] text-text-muted block">Traffic violations &amp; penalties</span>
            </div>

            {/* 4. FUEL */}
            <div className="space-y-1.5 bg-white p-3.5 rounded-xl border border-border/80 shadow-2xs">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>FUEL (وقود)</span>
                <span className="text-[10px] text-text-muted">AED / $</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fuelCharge}
                  onChange={(e) => setFuelCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-border bg-surface text-sm font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[10px] text-text-muted block">Refueling / fuel difference fee</span>
            </div>
          </div>
        </div>

        {/* Summary Breakdown Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-brand" />
              <h3 className="text-sm font-bold text-text-primary">Return Settlement Summary</h3>
            </div>
            {totalReturnCharges > 0 ? (
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                Payment Due: ${totalReturnCharges.toFixed(2)}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Zero Extra Charges ($0.00)
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-text-secondary">Distance Driven:</span>
              <strong className="font-semibold text-text-primary">{kmDriven} km (Checkout: {initialMileage} km → Return: {returnOdometer} km)</strong>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-text-secondary">Extra Mileage Fee:</span>
              <strong className={`font-bold ${extraKmCharge > 0 ? 'text-brand' : 'text-text-primary'}`}>
                {extraKmCharge > 0 ? `+$${extraKmCharge.toFixed(2)} (${extraKm} km)` : "$0.00"}
              </strong>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-text-secondary">Damage / Repair Fee:</span>
              <strong className={`font-bold ${damageChargeNum > 0 ? 'text-brand' : 'text-text-primary'}`}>
                {damageChargeNum > 0 ? `+$${damageChargeNum.toFixed(2)}` : "$0.00"}
              </strong>
            </div>

            {salikChargeNum > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-text-secondary">SALIK / Tolls Fee:</span>
                <strong className="font-bold text-brand">+${salikChargeNum.toFixed(2)}</strong>
              </div>
            )}

            {parkingChargeNum > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-text-secondary">Parking Fee:</span>
                <strong className="font-bold text-brand">+${parkingChargeNum.toFixed(2)}</strong>
              </div>
            )}

            {finesChargeNum > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-text-secondary">Traffic Fines:</span>
                <strong className="font-bold text-red-600">+${finesChargeNum.toFixed(2)}</strong>
              </div>
            )}

            {fuelChargeNum > 0 && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-text-secondary">Fuel Charge:</span>
                <strong className="font-bold text-brand">+${fuelChargeNum.toFixed(2)}</strong>
              </div>
            )}

            <div className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-gray-50 border border-border/60">
              <span className="text-text-primary font-bold text-xs uppercase tracking-wider">Total Return Charges Due:</span>
              <strong className={`font-black text-xl ${totalReturnCharges > 0 ? 'text-brand' : 'text-emerald-700'}`}>
                ${totalReturnCharges.toFixed(2)}
              </strong>
            </div>
          </div>

          {/* Banner Status */}
          <div className={`p-4 rounded-xl border text-center transition-all ${
            totalReturnCharges > 0
              ? 'bg-red-50 border-red-200 text-brand'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            {totalReturnCharges > 0 ? (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-brand">
                  Additional Client Payment Required
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-brand">
                  <span className="font-black text-2xl">+${totalReturnCharges.toFixed(2)}</span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Collect the remaining balance for extra mileage and/or reported damages from the client.
                </p>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-emerald-800">
                  Clean Return — Zero Balance Due
                </span>
                <div className="mt-1 flex items-center justify-center gap-1.5 text-emerald-700">
                  <span className="font-black text-2xl">$0.00 Due</span>
                </div>
                <p className="text-xs text-emerald-700 mt-1">
                  No extra mileage or damage fees recorded. The car will be marked Available in fleet.
                </p>
              </div>
            )}
          </div>

          {/* Payment Method Selector if extra fees are due */}
          {totalReturnCharges > 0 && (
            <div className="pt-2 border-t border-border/60">
              <PaymentMethodSelector
                value={returnPaymentMethod}
                onChange={(val) => setReturnPaymentMethod(val)}
                totalAmount={totalReturnCharges}
                totalLabel="Return Charges Due"
                label="Payment Method for Extra Charges (طريقة دفع الرسوم الإضافية)"
              />
            </div>
          )}
        </div>

        {/* Staff Remarks */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <FileText size={15} className="text-brand" />
            <span>Staff Return Remarks (Optional)</span>
          </label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Keys and registration retrieved, vehicle cleaned and parked in showroom."
            className="w-full text-sm border border-border rounded-xl p-3 bg-white text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none shadow-sm"
          />
        </div>
      </div>
    );
  };

  // STEP 2 (Dispatch): Assign Driver & Logistics
  const renderDispatchDriverStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 2: Assign Return Driver &amp; Logistics</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Select an available driver and specify where and when they should collect the vehicle from the client.
          </p>
        </div>

        {/* Driver Selection Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <UserCheck size={18} className="text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Choose Collection Driver</h3>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-text-primary block">
              Assign Return Driver <span className="text-brand">*</span>
            </label>
            <select
              value={returnDriverId}
              onChange={(e) => setReturnDriverId(e.target.value)}
              className="w-full p-3 rounded-xl border border-border bg-white text-sm font-semibold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none cursor-pointer shadow-sm"
              required
            >
              <option value="">-- Choose Driver to Collect Vehicle --</option>
              {drivers.map(d => (
                <option key={d._id || d.userId} value={d._id || d.userId}>
                  {d.name} {d.phone ? `(${d.phone})` : ""} {d.dutyStatus ? `• ${d.dutyStatus}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pickup Logistics Card */}
        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <MapPin size={18} className="text-brand" />
            <h3 className="text-sm font-bold text-text-primary">Collection Location &amp; Schedule</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary">
                  Collection Pickup Location <span className="text-brand">*</span>
                </label>
                {pickupLocation.trim() && (
                  <button
                    type="button"
                    onClick={() => openGoogleMaps(pickupLocation.trim())}
                    className="text-xs font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation size={11} className="rotate-45" />
                    <span>Google Maps</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                placeholder="e.g. Airport Terminal 1, Hotel Lobby, Client Residence..."
                className="w-full p-3 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
                required
              />
              {handoverLocation && (
                <button
                  type="button"
                  onClick={() => setPickupLocation(handoverLocation)}
                  className="text-xs text-text-secondary hover:text-text-primary font-semibold flex items-center gap-1 cursor-pointer mt-1"
                >
                  <MapPin size={12} className="text-brand" />
                  <span>Use Handover Address ({handoverLocation})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock size={14} className="text-brand" />
                  <span>Scheduled Pickup Time</span>
                </label>
                <input
                  type="text"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  placeholder="10:00 AM"
                  className="w-full p-2.5 rounded-xl border border-border bg-white text-sm font-semibold focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <User size={14} className="text-brand" />
                  <span>Customer Phone Contact</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={`${customerName} (${selectedContract?.customerPhone || "No Phone"})`}
                  className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-text-muted cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <FileText size={15} className="text-brand" />
            <span>Return Instructions for Driver</span>
          </label>
          <textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Call client 20 minutes prior to arrival, inspect tires and bumpers, retrieve all keys and papers."
            className="w-full text-sm border border-border rounded-xl p-3 bg-white text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none shadow-sm"
          />
        </div>
      </div>
    );
  };

  // STEP 3 (Dispatch): Review & Dispatch
  const renderDispatchReviewStep = () => {
    const selectedDriver = drivers.find(d => (d._id || d.userId) === returnDriverId);

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 3: Review &amp; Dispatch Task</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review assignment details. Once dispatched, the driver will automatically be notified via WhatsApp and Gmail.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2">
              <Send size={18} className="text-brand" />
              <h3 className="text-sm font-bold text-text-primary">Dispatch Task Summary</h3>
            </div>
            <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-full">
              Driver Return Pickup Task
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {/* Driver Box */}
            <div className="p-4 rounded-xl bg-white border border-border shadow-2xs space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Assigned Driver</span>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs">
                  {getInitials(selectedDriver?.name || "Driver")}
                </div>
                <div>
                  <h4 className="font-bold text-text-primary">{selectedDriver?.name || "Unassigned"}</h4>
                  <p className="text-xs text-text-secondary">{selectedDriver?.phone || "No phone"}</p>
                </div>
              </div>
            </div>

            {/* Client & Vehicle Box */}
            <div className="p-4 rounded-xl bg-white border border-border shadow-2xs space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">Target Vehicle &amp; Client</span>
              <div>
                <h4 className="font-bold text-text-primary">{vehicleName} ({plateNumber})</h4>
                <p className="text-xs text-text-secondary">Client: {customerName} ({selectedContract?.customerPhone})</p>
              </div>
            </div>
          </div>

          {/* Pickup Details Box */}
          <div className="p-4 rounded-xl bg-white border border-border shadow-2xs space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Collection Location:</span>
              <strong className="font-semibold text-text-primary">{pickupLocation}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Scheduled Time:</span>
              <strong className="font-semibold text-text-primary">{scheduledTime || "10:00 AM"}</strong>
            </div>
            {instructions && (
              <div className="pt-2 border-t border-border/40 text-xs">
                <span className="text-text-muted block font-semibold mb-1">Driver Instructions:</span>
                <p className="text-text-primary bg-gray-50 p-2 rounded-lg border border-border/60">{instructions}</p>
              </div>
            )}
          </div>

          {/* Automated Notification Note */}
          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center gap-2.5">
            <Clock size={16} className="text-blue-600 shrink-0" />
            <span>The assigned driver will automatically receive the task notification with pickup coordinates and client details.</span>
          </div>
        </div>
      </div>
    );
  };

  // Determine step content
  const renderStepContent = () => {
    if (returnMode === "shop") {
      if (currentStep === 1) return renderContractStep();
      if (currentStep === 2) return renderMileageAndFuelStep();
      if (currentStep === 3) return renderInspectionStep();
      if (currentStep === 4) return renderSettlementStep();
    } else {
      if (currentStep === 1) return renderContractStep();
      if (currentStep === 2) return renderDispatchDriverStep();
      if (currentStep === 3) return renderDispatchReviewStep();
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* ===== HEADER ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push("/bookings")}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Bookings
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Vehicle Return &amp; Check-in</h1>
          <p className="text-sm text-text-secondary mt-1">
            {returnMode === "shop"
              ? "In-Store Return — inspect mileage, record fuel, document condition, and settle contract at counter."
              : "Driver Dispatch — assign a driver to pick up and retrieve the vehicle from the client."}
          </p>
        </div>

        {/* Return Mode Pill Switcher (Matches /bookings/new) */}
        <div className="bg-gray-100 p-1 rounded-2xl flex items-center border border-gray-200/80 shadow-2xs self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setReturnMode("shop");
              if (currentStep > 4) setCurrentStep(4);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              returnMode === "shop"
                ? "bg-white text-brand shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Building2 size={14} />
            <span>In-Store Return (بالمحل)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReturnMode("dispatch");
              if (currentStep > 3) setCurrentStep(3);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              returnMode === "dispatch"
                ? "bg-white text-brand shadow-xs"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <UserCog size={14} />
            <span>Dispatch Driver (مع سائق)</span>
          </button>
        </div>
      </div>

      {/* ===== STEPPER HEADER (Matches /bookings/new) ===== */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 sm:p-6 animate-fade-in-up stagger-1">
        <div className="relative w-full max-w-4xl mx-auto px-2 sm:px-4">
          {/* Background Track Line */}
          <div 
            className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-gray-200 z-0 hidden sm:block pointer-events-none" 
            style={{
              left: `${100 / (2 * totalSteps)}%`,
              right: `${100 / (2 * totalSteps)}%`,
            }}
          />
          {/* Active Progress Line */}
          <div 
            className="absolute top-[18px] -translate-y-1/2 h-[2px] bg-brand z-0 transition-all duration-300 hidden sm:block pointer-events-none" 
            style={{
              left: `${100 / (2 * totalSteps)}%`,
              width: totalSteps > 1 
                ? `${((currentStep - 1) / (totalSteps - 1)) * (100 - (100 / totalSteps))}%` 
                : "0%",
            }}
          />
          
          <div className="flex items-start w-full relative z-10">
            {STEPS.map((step) => (
              <div key={step.id} className="flex-1 min-w-0 flex flex-col items-center">
                <button 
                  type="button"
                  onClick={() => {
                    if (step.id < currentStep) setCurrentStep(step.id);
                    else if (step.id === currentStep + 1) handleNext();
                  }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 border-2 cursor-pointer ${
                    currentStep === step.id 
                      ? "border-brand bg-brand text-white shadow-md shadow-brand/20 scale-105 ring-4 ring-white" 
                      : currentStep > step.id 
                      ? "border-brand bg-white text-brand ring-4 ring-white" 
                      : "border-gray-200 bg-white text-gray-400 ring-4 ring-white"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle size={15} className="text-brand shrink-0" />
                  ) : (
                    <span className="leading-none">{step.id}</span>
                  )}
                </button>
                <span 
                  className={`text-xs font-semibold hidden sm:block text-center w-full px-1 mt-2.5 leading-snug transition-colors ${
                    currentStep === step.id 
                      ? "text-brand font-bold" 
                      : currentStep > step.id 
                      ? "text-text-primary font-medium" 
                      : "text-text-muted"
                  }`}
                  title={step.title}
                >
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== WIZARD STEP CONTENT ===== */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 animate-fade-in-up stagger-2">
        {renderStepContent()}

        {/* Step Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border pt-6 mt-8">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft size={16} />
              Previous Step
            </button>
          ) : (
            <Link
              href="/bookings"
              className="px-4 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back to Bookings
            </Link>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={returnMode === "shop" ? () => handleShopReturn() : () => handleDispatch()}
              disabled={isSubmitting || (returnMode === "shop" ? (!returnOdometer.trim() || isNaN(Number(returnOdometer))) : (!returnDriverId || !pickupLocation.trim()))}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-colors shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{returnMode === "shop" ? "Closing Contract..." : "Dispatching Driver..."}</span>
                </>
              ) : (
                <>
                  {returnMode === "shop" ? <CheckCircle2 size={18} /> : <Send size={18} />}
                  <span>{returnMode === "shop" ? "Complete Return & Check-in" : "Dispatch Return Driver"}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

export default function BookingReturnPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={36} className="animate-spin text-brand" />
      </div>
    }>
      <ReturnPageContent />
    </Suspense>
  );
}
