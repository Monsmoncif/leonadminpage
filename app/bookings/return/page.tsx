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
  Fuel,
  Plus,
  Trash2
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/providers/ToastProvider";
import Link from "next/link";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

// Step definitions matching driver/return and bookings/new pattern
const SHOP_STEPS = [
  { id: 1, title: "Vehicle & Mileage", icon: ExecutiveCarIcon },
  { id: 2, title: "Inspection Photos", icon: Camera },
  { id: 3, title: "Damage Check", icon: AlertTriangle },
  { id: 4, title: "Settlement & Check-in", icon: CheckCircle2 },
];

const DISPATCH_STEPS = [
  { id: 1, title: "Vehicle & Pickup", icon: ExecutiveCarIcon },
  { id: 2, title: "Assign Driver", icon: UserCheck },
  { id: 3, title: "Review & Dispatch", icon: Send },
];

function ReturnPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();

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
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [isUploadingDamagePhoto, setIsUploadingDamagePhoto] = useState(false);
  const [salikCharge, setSalikCharge] = useState<string>("0");
  const [parkingCharge, setParkingCharge] = useState<string>("0");
  const [finesCharge, setFinesCharge] = useState<string>("0");
  const [fuelCharge, setFuelCharge] = useState<string>("0");
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(100);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState<string>("Cash");
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Dispatch Driver form states
  const [returnDriverId, setReturnDriverId] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [instructions, setInstructions] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const getCurrentFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

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
        const activeList = list.filter((c: any) => c.status === "Active" || c.deliveryStatus === "Delivered");
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
        : (selectedContract.pickupLocation || "Main Office");
      setPickupLocation(initialLoc);
      
      setReturnDriverId(selectedContract.returnDriverId || "");

      const nowTimeStr = getCurrentFormattedTime();
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
      setDamagePhotos([]);
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
      setIsConfirmed(false);
    }
  }, [selectedContract]);

  const openGoogleMaps = (location: string) => {
    if (!location) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, "_blank");
  };

  // Calculations
  const contractNum = selectedContract?.contractNumber || selectedContract?.id || selectedContract?._id?.substring(0, 8)?.toUpperCase() || "N/A";
  const vehicleName = selectedContract?.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || (selectedContract?.unitId ? `${selectedContract.unitId.make} ${selectedContract.unitId.model}` : "Vehicle");
  const plateMatch = (selectedContract?.vehicle || "").match(/\(([^)]+)\)/);
  const plateNumber = selectedContract?.vehiclePlate || selectedContract?.unitId?.plate || (plateMatch ? plateMatch[1] : "");
  const vehicleMake = selectedContract?.unitId?.make || "Vehicle";
  const vehicleYear = selectedContract?.vehicleYear || selectedContract?.unitId?.year || "";
  const vehicleColor = selectedContract?.vehicleColor || selectedContract?.unitId?.color || "";
  const vehicleFuel = selectedContract?.vehicleFuel || selectedContract?.unitId?.fuelType || "Petrol";
  const vehicleImage = selectedContract?.vehicleImage || selectedContract?.unitId?.images?.[0] || "";

  const customerName = selectedContract?.customer || selectedContract?.clientId?.name || "Customer";
  const customerPhone = selectedContract?.customerPhone || selectedContract?.clientId?.phone || "";
  const handoverLocation = selectedContract?.pickupLocation || "Main Office";

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

  // Damage photo uploader
  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDamagePhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setDamagePhotos((prev) => [...prev, data.url]);
          }
        }
      }
      toast.success("Damage photos uploaded.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload damage photo.");
    } finally {
      setIsUploadingDamagePhoto(false);
      e.target.value = "";
    }
  };

  const handleRemoveDamagePhoto = (index: number) => {
    setDamagePhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleNext = () => {
    // Step 1: Contract & Mileage validation
    if (currentStep === 1) {
      if (!selectedContract) {
        toast.error("Please select an active contract to return.");
        return;
      }
      if (returnMode === "shop") {
        const odo = Number(returnOdometer);
        if (!returnOdometer.trim() || isNaN(odo) || odo < initialMileage) {
          toast.error(`Return odometer cannot be less than initial pickup mileage (${initialMileage.toLocaleString()} km).`);
          return;
        }
      } else {
        if (!pickupLocation.trim()) {
          toast.error("Please specify a collection pickup location.");
          return;
        }
      }
      setIsChangingContract(false);
    }

    // Step 2: Driver & Pickup (Dispatch mode)
    if (returnMode === "dispatch" && currentStep === 2) {
      if (!returnDriverId) {
        toast.error("Please choose a return driver.");
        return;
      }
    }

    // Step 3: Damage Check (Shop mode)
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
    if (isNaN(odoNum) || odoNum < initialMileage) {
      toast.error(`Return odometer cannot be less than initial pickup mileage (${initialMileage.toLocaleString()} km).`);
      return;
    }

    if (hasDamages && !damageDescription.trim()) {
      toast.error("Please describe the reported damages.");
      setCurrentStep(3);
      return;
    }

    if (!isConfirmed) {
      toast.error("Please confirm return completion checkbox.");
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
        newDamages: hasDamages && damageDescription.trim() ? damageDescription.trim() : "None",
        damagePhotos: hasDamages ? damagePhotos : [],
        paymentMethod: returnPaymentMethod,
        paymentStatus: "Paid",
        returnAmountCollected: totalReturnCharges,
        returnPaymentMethod: returnPaymentMethod,
        returnPhotos: orderedReturnPhotos,
        notes: instructions.trim() ? `${selectedContract.notes || ""}\n[Return Remarks: ${instructions.trim()}]`.trim() : selectedContract.notes,
        returnedAt: new Date().toISOString(),
        returnedBy: (session?.user as any)?.name || "Admin",
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

      toast.success("Vehicle returned and contract completed successfully! ✓");
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
      <div className="max-w-5xl mx-auto space-y-6 pb-20 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="h-8 w-64 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-96 bg-gray-200 rounded-lg mt-3"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 flex items-center justify-between">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 h-96"></div>
      </div>
    );
  }

  // ===================== STEP 1: VEHICLE & MILEAGE =====================
  const renderVehicleStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Step 1: Vehicle &amp; Return Details</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Verify vehicle identity, record current return odometer reading, and select return fuel level
            </p>
          </div>
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
          /* 2-Column Layout (100% Identical to driver/return and bookings/new) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Vehicle Profile Card */}
            <div className="bg-card rounded-2xl border border-brand bg-brand-light/10 ring-2 ring-brand/30 p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-text-muted font-bold mb-0.5">
                      {vehicleMake} • {vehicleYear || new Date().getFullYear()}
                    </p>
                    <h3 className="text-base font-bold text-text-primary leading-tight">{vehicleName}</h3>
                  </div>
                  <span className="bg-brand text-white p-1 rounded-full shrink-0">
                    <CheckCircle2 size={16} />
                  </span>
                </div>

                <div className="flex items-center justify-center min-h-[140px] my-2 relative bg-gray-50/70 rounded-xl border border-gray-100">
                  {vehicleImage ? (
                    <img
                      src={vehicleImage}
                      alt={vehicleName}
                      className="max-w-full max-h-32 object-contain drop-shadow-sm"
                    />
                  ) : (
                    <ExecutiveCarIcon size={52} className="text-gray-300" />
                  )}
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  {plateNumber && (
                    <span className="font-mono text-brand font-bold bg-brand/10 px-2.5 py-1 rounded-md border border-brand/20">
                      {plateNumber}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="text-xs text-text-muted">Color: </span>
                    <span className="font-semibold text-text-primary">{vehicleColor || "Standard"}</span>
                    <span className="mx-1.5 text-gray-300">•</span>
                    <span className="text-xs text-text-muted">Fuel: </span>
                    <span className="font-semibold text-text-primary">{vehicleFuel}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                  <div className="bg-white p-3 rounded-xl border border-border/80">
                    <span className="text-text-muted text-[11px] block">Checkout Mileage</span>
                    <span className="font-bold text-text-primary text-sm">
                      {initialMileage.toLocaleString()} km
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-border/80">
                    <span className="text-text-muted text-[11px] block">Daily KM Limit</span>
                    <span className="font-bold text-text-primary text-sm">
                      {dailyKmLimit > 0 ? `${dailyKmLimit} km / day` : "Unlimited"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer / Contract Info Pill */}
              <div className="bg-white p-3.5 rounded-xl border border-border/80 space-y-1.5 text-xs mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-[11px]">Primary Customer</span>
                  <span className="font-mono text-[10px] text-brand bg-brand/10 px-2 py-0.5 rounded font-bold">
                    Contract #{contractNum}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <strong className="text-text-primary font-bold">{customerName}</strong>
                  <span className="text-text-muted">{customerPhone || "No phone recorded"}</span>
                </div>
              </div>
            </div>

            {/* Right: Return Schedule & Fuel (Shop mode) or Pickup Logistics (Dispatch mode) */}
            {returnMode === "shop" ? (
              <div className="space-y-5">
                {/* Return Schedule & Mileage Card */}
                <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <Clock size={16} className="text-brand" />
                    <span>Return Schedule &amp; Mileage</span>
                  </h3>

                  <div className="space-y-3">
                    {/* Check-in Return Time */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-text-secondary">
                          Check-in Return Time (وقت الاسترجاع) <span className="text-red-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShopReturnTime(getCurrentFormattedTime())}
                          className="text-xs text-brand hover:text-brand-dark font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>Set time now</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="text"
                            value={shopReturnTime}
                            onChange={(e) => setShopReturnTime(e.target.value)}
                            placeholder="e.g. 10:00 AM"
                            className="w-full p-2.5 pl-10 rounded-xl border border-border bg-white text-sm font-medium text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShopReturnTime(getCurrentFormattedTime())}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-text-secondary text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                        >
                          <Clock size={14} className="text-brand" />
                          <span>Now</span>
                        </button>
                      </div>
                    </div>

                    {/* Return Odometer */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-text-secondary">
                          Return Odometer (km) <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[11px] font-semibold text-text-muted bg-gray-100 px-2 py-0.5 rounded">
                          Handover: {initialMileage.toLocaleString()} km
                        </span>
                      </div>
                      <div className="relative">
                        <Gauge size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input
                          type="number"
                          value={returnOdometer}
                          onChange={(e) => setReturnOdometer(e.target.value)}
                          placeholder={`e.g. ${initialMileage + 120}`}
                          min={initialMileage}
                          className="w-full p-2.5 pl-10 rounded-xl border border-border bg-white text-sm font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                          required
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs pt-1.5">
                        <span className="text-text-muted">Distance driven since handover:</span>
                        <span className="font-bold text-brand text-xs">+{kmDriven.toLocaleString()} km</span>
                      </div>
                      {returnOdometer.trim() !== "" && Number(returnOdometer) < initialMileage && (
                        <p className="text-[11px] text-amber-600 flex items-center gap-1 font-medium pt-1">
                          <AlertTriangle size={12} className="shrink-0" />
                          <span>Entered reading ({Number(returnOdometer).toLocaleString()} km) is lower than checkout baseline ({initialMileage.toLocaleString()} km).</span>
                        </p>
                      )}
                    </div>

                    {/* Return Location */}
                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        Return Pickup / Store Location
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                          <input
                            type="text"
                            readOnly
                            value={handoverLocation || "Main Office / Showroom"}
                            className="w-full p-2.5 pl-10 rounded-xl border border-border bg-gray-50 text-xs font-medium text-text-primary outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(handoverLocation || "Main Office")}
                          className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 border border-emerald-200 flex items-center gap-1.5"
                        >
                          <Navigation size={12} className="rotate-45" />
                          <span>Maps</span>
                        </button>
                      </div>
                    </div>

                    {/* Return Notes */}
                    <div>
                      <label className="text-xs font-semibold text-text-secondary block mb-1">
                        Return Remarks / Notes (ملاحظات الاسترجاع)
                      </label>
                      <textarea
                        rows={2}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Any return observations or hand-over remarks..."
                        className="w-full p-2.5 rounded-xl border border-border bg-white text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Return Fuel Level Selector Card */}
                <div className="bg-white rounded-2xl border border-border p-5 shadow-2xs">
                  <FuelLevelSelector
                    value={returnFuelLevel}
                    onChange={(val) => setReturnFuelLevel(val)}
                    label="Return Fuel Level (مستوى الوقود عند الاسترجاع)"
                    sublabel={`Handover baseline was ${selectedContract?.checkoutFuelLevel !== undefined ? selectedContract.checkoutFuelLevel : 100}%. Select current tank percentage.`}
                  />
                </div>
              </div>
            ) : (
              /* Dispatch Mode: Pickup Logistics Card */
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-border p-5 space-y-4 shadow-2xs">
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                    <MapPin size={16} className="text-brand" />
                    <span>Pickup Location &amp; Schedule</span>
                  </h3>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-secondary">
                          Collection Pickup Location <span className="text-red-500">*</span>
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
                        className="w-full p-2.5 rounded-xl border border-border bg-white text-sm font-medium focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none shadow-sm"
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
                        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
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
                        <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                          <User size={14} className="text-brand" />
                          <span>Customer Phone Contact</span>
                        </label>
                        <input
                          type="text"
                          disabled
                          value={`${customerName} (${customerPhone || "No Phone"})`}
                          className="w-full p-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-text-muted cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Dispatch Notes */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-text-secondary block">
                        Collection Instructions for Driver
                      </label>
                      <textarea
                        rows={3}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="e.g. Meet client in front of lobby, collect second key set..."
                        className="w-full p-2.5 rounded-xl border border-border bg-white text-xs focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ===================== STEP 2 (Shop): INSPECTION PHOTOS =====================
  const renderPhotosStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 2: Return Vehicle Inspection Photos</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Capture or upload 8 standard angles to document vehicle condition upon client return
          </p>
        </div>
      </div>

      <VehicleInspectionPhotoCapture
        photos={returnPhotos}
        onChange={setReturnPhotos}
        title="Vehicle Return Inspection (فحص استرجاع السيارة بالمحل)"
        subtitle="Capture photos using direct camera or upload from gallery across all 8 standard angles."
        badgeLabel="Return Condition"
      />
    </div>
  );

  // ===================== STEP 3 (Shop): DAMAGE CHECK =====================
  const renderDamageStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Step 3: Damage Inspection (فحص الأضرار)</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Inspect body panels, glass, and interior. Record any new damages discovered during return.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <label className="text-sm font-bold text-text-primary flex items-center gap-2">
          <AlertTriangle size={18} className={hasDamages ? "text-red-500" : "text-brand"} />
          <span>Were Any New Damages Found Upon Return? (هل توجد أي أضرار جديدة؟)</span>
        </label>

        {/* Binary Choice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setHasDamages(false);
              setDamageDescription("");
              setDamageCost("0");
              setDamagePhotos([]);
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 text-left ${
              !hasDamages
                ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                : "border-border bg-white hover:bg-gray-50 text-text-muted"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !hasDamages ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              <CheckCircle size={20} />
            </div>
            <div>
              <strong className={`block text-sm font-bold ${!hasDamages ? "text-emerald-950" : "text-text-primary"}`}>
                No New Damages (سليمة تماماً)
              </strong>
              <span className="text-xs text-text-muted">Vehicle returned in clean condition without new scratches or dents</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHasDamages(true)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 text-left ${
              hasDamages
                ? "border-red-500 bg-red-50/70 shadow-sm"
                : "border-border bg-white hover:bg-gray-50 text-text-muted"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasDamages ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <strong className={`block text-sm font-bold ${hasDamages ? "text-red-950" : "text-text-primary"}`}>
                New Damages Found (توجد أضرار)
              </strong>
              <span className="text-xs text-text-muted">New scratches, dents, cracked glass, or interior stains noticed</span>
            </div>
          </button>
        </div>

        {/* Detailed Damage Form If Damages Marked */}
        {hasDamages && (
          <div className="p-5 bg-red-50/70 rounded-2xl border border-red-200 space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-red-950 mb-1.5">
                  Damage Description (وصف الأضرار بالتفصيل) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Describe each damaged part clearly (e.g. Dent on front right fender, deep scratch on rear bumper...)"
                  className="w-full p-3 rounded-xl border border-red-200 bg-white text-xs text-text-primary focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-red-950 mb-1.5">
                  Estimated Repair Cost ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-red-600">$</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={damageCost}
                    onChange={(e) => setDamageCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 pl-8 rounded-xl border border-red-200 bg-white text-base font-bold text-red-600 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                  />
                </div>
                <span className="text-[10px] text-red-700 mt-1 block">Amount charged directly to customer</span>
              </div>
            </div>

            {/* Damage Photos Capture */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                  <Camera size={14} className="text-red-600" />
                  <span>Damage Photos (صور توثيق الأضرار)</span>
                  {damagePhotos.length > 0 && (
                    <span className="bg-red-200 text-red-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {damagePhotos.length}
                    </span>
                  )}
                </label>
                <span className="text-[11px] text-red-700">Take clear close-up photos of damaged areas</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {damagePhotos.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-red-200 shadow-xs bg-gray-100">
                    <img src={url} alt={`Damage ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveDamagePhoto(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </span>
                  </div>
                ))}

                <label className={`aspect-square rounded-xl border-2 border-dashed border-red-300 hover:border-red-500 bg-white hover:bg-red-50/50 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group text-center p-2 ${isUploadingDamagePhoto ? "opacity-50 pointer-events-none" : ""}`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleDamagePhotoUpload}
                    disabled={isUploadingDamagePhoto}
                  />
                  {isUploadingDamagePhoto ? (
                    <Loader2 size={20} className="animate-spin text-red-600" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Plus size={16} />
                    </div>
                  )}
                  <span className="text-[11px] font-bold text-red-700">
                    {isUploadingDamagePhoto ? "Uploading..." : "+ Add Photo"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ===================== STEP 4 (Shop): SETTLEMENT & CHECK-IN =====================
  const renderSettlementStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 4: Settlement &amp; Complete Return</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Review vehicle inspection summary, calculate additional fees, and settle the contract.
          </p>
        </div>

        {/* Executive Summary Profile Grid (Matching driver/return) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-text-muted text-xs block mb-1">Customer</span>
            <strong className="text-text-primary text-sm font-bold block truncate">
              {customerName}
            </strong>
            <span className="text-xs text-text-muted block truncate">{customerPhone || "No phone"}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-text-muted text-xs block mb-1">Vehicle</span>
            <strong className="text-text-primary text-sm font-bold block truncate">{vehicleName}</strong>
            <span className="text-xs text-text-muted font-mono">{plateNumber || "NO-PLATE"}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-text-muted text-xs block mb-1">Return Location</span>
            <strong className="text-text-primary text-xs font-bold block truncate" title={handoverLocation}>
              {handoverLocation || "Main Office / Showroom"}
            </strong>
            <span className="text-xs text-text-muted">{shopReturnTime}</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
            <span className="text-text-muted text-xs block mb-1">Return Mileage</span>
            <strong className="text-brand text-sm font-bold block">
              {Number(returnOdometer).toLocaleString()} km
            </strong>
            <span className="text-xs text-emerald-600 font-semibold">+{kmDriven.toLocaleString()} km driven</span>
          </div>
        </div>

        {/* Condition & Inspection Photos Summary Strip */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Camera size={14} className="text-brand" />
              Return Inspection Photos ({Object.values(returnPhotos).filter(Boolean).length}/8 captured)
            </span>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-[11px] text-brand font-semibold hover:underline cursor-pointer"
            >
              Edit Photos
            </button>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {VEHICLE_ANGLES.map((angle, idx) => {
              const url = returnPhotos[angle];
              return (
                <div
                  key={angle}
                  className="relative aspect-square rounded-lg overflow-hidden border border-border bg-gray-50 flex flex-col items-center justify-center text-center p-1"
                >
                  {url ? (
                    <img src={url} alt={angle} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] text-text-muted font-medium leading-tight">
                      #{idx + 1}
                      <br />
                      {angle.split(" ")[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Return Charges Card */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-brand" />
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Additional Return Charges &amp; Penalties (رسوم ومخالفات الإرجاع)
              </h3>
            </div>
            {totalReturnCharges > 0 && (
              <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                +${totalReturnCharges.toFixed(2)} Total Due
              </span>
            )}
          </div>

          {extraKm > 0 && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs text-red-950">
              <div>
                <span className="font-bold block">Extra Mileage Fee ({extraKm.toLocaleString()} km exceeded limit)</span>
                <span className="text-red-700 text-[11px]">${pricePerExtraKm.toFixed(2)} per extra km • {totalIncludedKm.toLocaleString()} km included</span>
              </div>
              <strong className="font-bold text-sm text-red-600">+${extraKmCharge.toFixed(2)}</strong>
            </div>
          )}

          {hasDamages && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs text-red-950">
              <div>
                <span className="font-bold block">Reported Vehicle Damage ({damagePhotos.length} photos)</span>
                <span className="text-red-700 text-[11px] truncate max-w-sm block">{damageDescription || "Damage reported"}</span>
              </div>
              <strong className="font-bold text-sm text-red-600">+${damageChargeNum.toFixed(2)}</strong>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* SALIK */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-primary block">
                SALIK (سالك)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={salikCharge}
                  onChange={(e) => setSalikCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[9px] text-text-muted block">Toll gates</span>
            </div>

            {/* PARKING */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-primary block">
                PARKING (مواقف)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={parkingCharge}
                  onChange={(e) => setParkingCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[9px] text-text-muted block">Parking tickets</span>
            </div>

            {/* FINES */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-primary block">
                FINES (مخالفات)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={finesCharge}
                  onChange={(e) => setFinesCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-red-600 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[9px] text-text-muted block">Traffic violations</span>
            </div>

            {/* FUEL */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-primary block">
                FUEL (وقود)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-xs text-text-muted">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fuelCharge}
                  onChange={(e) => setFuelCharge(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-6 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                />
              </div>
              <span className="text-[9px] text-text-muted block">Refueling charge</span>
            </div>
          </div>

          {/* Settlement Banner */}
          <div className={`p-4 rounded-xl border text-center transition-all ${
            totalReturnCharges > 0
              ? 'bg-red-50 border-red-200 text-brand'
              : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
          }`}>
            {totalReturnCharges > 0 ? (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block text-brand">
                  Additional Settlement Due from Client
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
            <span>Staff Return Remarks (ملاحظات الإدارة)</span>
          </label>
          <textarea
            rows={2}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Keys and registration retrieved, vehicle cleaned and parked in showroom."
            className="w-full text-sm border border-border rounded-xl p-3 bg-white text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none shadow-sm"
          />
        </div>

        {/* Confirmation Checkbox */}
        <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
            />
            <div className="text-xs">
              <strong className="font-bold text-text-primary block">
                Confirm Vehicle Return &amp; Settlement (تأكيد استلام السيارة وإتمام التسوية) *
              </strong>
              <span className="text-text-muted mt-0.5 block">
                I certify that the vehicle has been physically received and inspected, recorded return odometer is {Number(returnOdometer).toLocaleString()} km, return fuel level is {returnFuelLevel}%, and all settlements are verified.
              </span>
            </div>
          </label>
        </div>
      </div>
    );
  };

  // ===================== STEP 2 (Dispatch): ASSIGN DRIVER =====================
  const renderDispatchDriverStep = () => {
    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 2: Assign Return Driver</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Select an available driver to retrieve the vehicle from the client at the specified location.
          </p>
        </div>

        {/* Driver Selection Grid */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-text-primary block">
            Choose Driver for Retrieval <span className="text-brand">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {drivers.map((d) => {
              const dId = d._id || d.userId;
              const isSelected = returnDriverId === dId;
              return (
                <button
                  key={dId}
                  type="button"
                  onClick={() => setReturnDriverId(dId)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-xs"
                      : "border-border bg-white hover:border-gray-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand font-bold flex items-center justify-center shrink-0">
                      <User size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-text-primary truncate">{d.name}</h4>
                      <p className="text-xs text-text-muted truncate">{d.phone || "No phone"}</p>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
                      <Check size={14} />
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-text-muted px-2 py-0.5 bg-gray-50 rounded border border-gray-200 shrink-0">
                      Select
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ===================== STEP 3 (Dispatch): REVIEW & DISPATCH =====================
  const renderDispatchReviewStep = () => {
    const selectedDriver = drivers.find(d => (d._id || d.userId) === returnDriverId);

    return (
      <div className="space-y-6 animate-fade-in-up">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 3: Review &amp; Dispatch Driver</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Confirm retrieval assignment details and notify the driver to pick up the vehicle.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 space-y-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-text-muted block mb-1">Vehicle</span>
              <strong className="text-sm font-bold text-text-primary block">{vehicleName}</strong>
              <span className="text-xs font-mono text-brand">{plateNumber || "NO-PLATE"}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-text-muted block mb-1">Customer Contact</span>
              <strong className="text-sm font-bold text-text-primary block">{customerName}</strong>
              <span className="text-xs text-text-muted">{customerPhone || "No phone"}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-text-muted block mb-1">Assigned Retrieval Driver</span>
              <strong className="text-sm font-bold text-brand block">{selectedDriver?.name || "Assigned Driver"}</strong>
              <span className="text-xs text-text-muted">{selectedDriver?.phone || "No phone"}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-xs text-text-muted block mb-1">Pickup Schedule</span>
              <strong className="text-sm font-bold text-text-primary block">{scheduledTime || "10:00 AM"}</strong>
              <span className="text-xs text-text-muted truncate block" title={pickupLocation}>{pickupLocation}</span>
            </div>
          </div>

          {instructions && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs">
              <span className="font-semibold text-text-muted block mb-0.5">Driver Remarks:</span>
              <p className="text-text-primary italic">{instructions}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Determine what to render based on current step and return mode
  const renderStepContent = () => {
    if (returnMode === "shop") {
      if (currentStep === 1) return renderVehicleStep();
      if (currentStep === 2) return renderPhotosStep();
      if (currentStep === 3) return renderDamageStep();
      if (currentStep === 4) return renderSettlementStep();
    } else {
      if (currentStep === 1) return renderVehicleStep();
      if (currentStep === 2) return renderDispatchDriverStep();
      if (currentStep === 3) return renderDispatchReviewStep();
    }
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* ===== HEADER (Matching New Booking & Driver Delivery) ===== */}
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
              ? "In-Store Return — verify mileage & fuel, inspect vehicle condition, and settle contract."
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

      {/* ===== STEPPER HEADER (100% Identical to /bookings/new) ===== */}
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
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 animate-fade-in-up stagger-2 min-h-[480px]">
        {renderStepContent()}

        {/* Step Navigation Buttons (Matching /bookings/new) */}
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
