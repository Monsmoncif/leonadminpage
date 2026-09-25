"use client";

import { useState, useEffect } from "react";
import { 
  Camera, 
  Gauge, 
  Fuel, 
  AlertTriangle, 
  CheckCircle, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Plus, 
  Trash2, 
  Loader2, 
  Navigation, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle,
  ShieldCheck,
  RotateCcw,
  Coins,
  DollarSign
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

const STEPS = [
  { id: 1, title: "Vehicle & Mileage", arTitle: "المركبة والعداد" },
  { id: 2, title: "Inspection Photos", arTitle: "صور الفحص" },
  { id: 3, title: "Damage Check", arTitle: "فحص الأضرار" },
  { id: 4, title: "Review & Check-in", arTitle: "المراجعة والتأكيد" },
];

export default function VehicleReturnPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data: session } = useSession();

  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Return inspection form state
  const [returnOdometer, setReturnOdometer] = useState("");
  const [returnFuelLevel, setReturnFuelLevel] = useState<number>(100);
  const [checkinTime, setCheckinTime] = useState("10:00 AM");
  const [returnNotes, setReturnNotes] = useState("");
  const [salikCharge, setSalikCharge] = useState("0");
  const [parkingCharge, setParkingCharge] = useState("0");
  const [finesCharge, setFinesCharge] = useState("0");
  const [fuelCharge, setFuelCharge] = useState("0");

  // Photos
  const [returnPhotos, setReturnPhotos] = useState<Record<string, string>>({});

  // Damages
  const [hasNewDamage, setHasNewDamage] = useState(false);
  const [newDamages, setNewDamages] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [isUploadingDamagePhoto, setIsUploadingDamagePhoto] = useState(false);

  // Final confirmation checkbox
  const [isConfirmed, setIsConfirmed] = useState(false);

  const getCurrentFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Load contracts assigned to this return driver
  useEffect(() => {
    const driverId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;
    const qId = searchParams.get("contractId");

    const contractsUrl = driverId && userRole !== "admin" 
      ? `/api/contracts?driverId=${driverId}`
      : `/api/contracts`;

    fetch(contractsUrl, { cache: "no-store" })
      .then((res) => res.json())
      .then(async (contractsData) => {
        const allList = contractsData.contracts || [];
        
        // Filter contracts for this return driver (or all for admin)
        let activeContracts = allList.filter((c: any) => 
          (c.status === "Active" || c.deliveryStatus === "Delivered") && 
          (!driverId || userRole === "admin" || c.returnDriverId === driverId || c.returnDriverId?._id === driverId)
        );

        if (qId) {
          const match = allList.find((c: any) => c._id === qId || c.id === qId);
          if (match) {
            if (!activeContracts.some((c: any) => c._id === match._id)) {
              activeContracts = [match, ...activeContracts];
            }
            setSelectedContract(match._id || match.id);
          } else {
            // Direct fetch fallback for contract by ID
            try {
              const resSingle = await fetch(`/api/contracts/${qId}`, { cache: "no-store" });
              if (resSingle.ok) {
                const single = await resSingle.json();
                if (single && (single._id || single.id)) {
                  activeContracts = [single, ...activeContracts];
                  setSelectedContract(single._id || single.id);
                }
              }
            } catch (e) {
              console.error("Failed to load direct contract:", e);
            }
          }
        } else if (activeContracts.length > 0) {
          setSelectedContract(activeContracts[0]._id || activeContracts[0].id);
        }

        setContracts(activeContracts);
      })
      .catch((err) => {
        console.error("Failed to load contracts:", err);
        toast.error("Failed to load return contracts.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchParams, session]);

  const selectedContractData = contracts.find((c) => c._id === selectedContract || c.id === selectedContract);

  // Synchronize form when selected contract changes
  useEffect(() => {
    if (selectedContractData) {
      const initialOdo = selectedContractData.unitMileage !== undefined 
        ? selectedContractData.unitMileage 
        : (selectedContractData.checkoutMileage || 0);
      setReturnOdometer(String(initialOdo));
      setReturnFuelLevel(selectedContractData.checkoutFuelLevel !== undefined ? Number(selectedContractData.checkoutFuelLevel) : 100);
      setHasNewDamage(false);
      setNewDamages("");
      setDamagePhotos([]);
      setReturnNotes(selectedContractData.returnNotes || "");
      setSalikCharge(String(selectedContractData.salikFees || selectedContractData.salikCharge || 0));
      setParkingCharge(String(selectedContractData.parkingFees || selectedContractData.parkingCharge || 0));
      setFinesCharge(String(selectedContractData.finesFees || selectedContractData.finesCharge || 0));
      setFuelCharge(String(selectedContractData.fuelFees || selectedContractData.fuelCharge || 0));

      const nowTimeStr = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date());
      setCheckinTime(selectedContractData.checkinTime && selectedContractData.checkinTime !== "Pending Handover" ? selectedContractData.checkinTime : nowTimeStr);

      const initialPhotos: Record<string, string> = {};
      if (Array.isArray(selectedContractData.returnPhotos)) {
        selectedContractData.returnPhotos.forEach((url: string, idx: number) => {
          if (url && VEHICLE_ANGLES[idx]) {
            initialPhotos[VEHICLE_ANGLES[idx]] = url;
          }
        });
      }
      setReturnPhotos(initialPhotos);
      setIsConfirmed(false);
      setError(null);
    }
  }, [selectedContract, selectedContractData]);

  // Derived baseline information
  const contractNum = selectedContractData?.contractNumber || selectedContractData?.id || selectedContractData?._id?.substring(0, 8)?.toUpperCase() || "2000";
  const vehicleName = selectedContractData?.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
  const plateNumber = selectedContractData?.vehiclePlate || selectedContractData?.unitId?.plate || "";
  const customerName = selectedContractData?.customer || selectedContractData?.clientId?.name || "Client";
  const customerPhone = selectedContractData?.customerPhone || selectedContractData?.clientId?.phone || "";
  const returnLocation = selectedContractData?.dropoffLocation || selectedContractData?.pickupLocation || "Main Office";
  const initialMileage = Number(selectedContractData?.checkoutMileage || selectedContractData?.unitMileage || 0);
  const currentOdoNum = Number(returnOdometer) || initialMileage;
  const kmDriven = Math.max(0, currentOdoNum - initialMileage);
  const vehicleMake = selectedContractData?.unitId?.make || "Vehicle";
  const vehicleYear = selectedContractData?.vehicleYear || selectedContractData?.unitId?.year || "";
  const vehicleColor = selectedContractData?.vehicleColor || selectedContractData?.unitId?.color || "";
  const vehicleFuel = selectedContractData?.vehicleFuel || selectedContractData?.unitId?.fuelType || "Petrol";
  const vehicleImage = selectedContractData?.vehicleImage || selectedContractData?.unitId?.images?.[0] || "";
  const dailyKmLimit = Number(selectedContractData?.dailyKmLimit || 0);
  const pricePerExtraKm = Number(selectedContractData?.pricePerExtraKm || 0);
  const totalDays = Number(selectedContractData?.totalDays || 1);
  const totalIncludedKm = dailyKmLimit * totalDays;
  const extraKm = dailyKmLimit > 0 ? Math.max(0, kmDriven - totalIncludedKm) : 0;
  const extraKmCharge = extraKm * pricePerExtraKm;

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
        } else {
          toast.error(`Failed to upload photo: ${file.name}`);
        }
      }
    } catch (err) {
      console.error("Error uploading damage photo:", err);
      toast.error("Failed to upload damage photo.");
    } finally {
      setIsUploadingDamagePhoto(false);
      e.target.value = "";
    }
  };

  const handleRemoveDamagePhoto = (indexToRemove: number) => {
    setDamagePhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Step Validation & Navigation
  const handleNext = () => {
    setError(null);

    if (currentStep === 1) {
      if (!returnOdometer.trim()) {
        setError("Return odometer reading is required.");
        toast.error("Please enter the return odometer reading.");
        return;
      }
      const odo = Number(returnOdometer);
      if (isNaN(odo) || odo < initialMileage) {
        setError(`Return odometer cannot be less than initial pickup mileage (${initialMileage} km).`);
        toast.error(`Odometer cannot be less than ${initialMileage} km.`);
        return;
      }
    }

    if (currentStep === 3) {
      if (hasNewDamage && !newDamages.trim()) {
        setError("Please provide a description of the new damages found.");
        toast.error("Damage description is required when new damages are reported.");
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Complete Return Submission
  const handleCompleteReturn = async () => {
    setError(null);

    if (!selectedContract) {
      setError("No contract selected.");
      return;
    }

    const odo = Number(returnOdometer);
    if (isNaN(odo) || odo < initialMileage) {
      setError(`Return odometer cannot be less than ${initialMileage} km.`);
      toast.error("Invalid odometer reading.");
      setCurrentStep(1);
      return;
    }

    if (hasNewDamage && !newDamages.trim()) {
      setError("Please describe the new damages before finalizing return.");
      toast.error("Damage description is required.");
      setCurrentStep(3);
      return;
    }

    if (!isConfirmed) {
      setError("Please confirm vehicle possession and return completion before submitting.");
      toast.error("Please confirm return completion checkbox.");
      return;
    }

    setIsSubmitting(true);
    toast.success("Finalizing return inspection and updating vehicle status...");

    try {
      const orderedReturnPhotos = VEHICLE_ANGLES.map((angle) => returnPhotos[angle] || "");
      const damageDescription = hasNewDamage && newDamages.trim() ? newDamages.trim() : "None";

      const payload = {
        status: "Completed",
        deliveryStatus: "Returned",
        checkinTime: checkinTime.trim() || "10:00 AM",
        returnOdometer: odo,
        returnFuelLevel: Number(returnFuelLevel),
        extraKmCharge: extraKmCharge,
        salikFees: Number(salikCharge) || 0,
        salikCharge: Number(salikCharge) || 0,
        parkingFees: Number(parkingCharge) || 0,
        parkingCharge: Number(parkingCharge) || 0,
        finesFees: Number(finesCharge) || 0,
        finesCharge: Number(finesCharge) || 0,
        fuelFees: Number(fuelCharge) || 0,
        fuelCharge: Number(fuelCharge) || 0,
        newDamages: damageDescription,
        damagePhotos: hasNewDamage ? damagePhotos : [],
        returnPhotos: orderedReturnPhotos,
        returnNotes: returnNotes.trim() ? returnNotes.trim() : selectedContractData?.returnNotes || "",
        returnedAt: new Date().toISOString(),
        returnedBy: (session?.user as any)?.name || "Driver",
      };

      const res = await fetch(`/api/contracts/${selectedContract}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to process vehicle return.");
      }

      toast.success("Vehicle returned successfully and contract marked as Completed! ✓");
      setTimeout(() => {
        router.push("/driver");
      }, 1000);
    } catch (err: any) {
      console.error("Return completion error:", err);
      setError(err.message || "Failed to finalize vehicle return.");
      toast.error(err.message || "Return failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
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

  if (contracts.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        <button
          onClick={() => router.push("/driver")}
          className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Back to Driver Dashboard
        </button>
        <div className="bg-white p-10 rounded-2xl border border-border text-center space-y-3 shadow-sm">
          <CheckCircle size={40} className="mx-auto text-emerald-500/60" />
          <h2 className="text-lg font-bold text-text-primary">No Active Return Tasks Assigned</h2>
          <p className="text-xs text-text-muted max-w-md mx-auto">
            You currently have no return pickups assigned to you. When an admin assigns you to collect a vehicle from a client, it will appear here and on your dashboard.
          </p>
          <button
            onClick={() => router.push("/driver")}
            className="mt-3 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer inline-flex items-center gap-2"
          >
            <ArrowLeft size={14} /> Return to Driver Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalSteps = STEPS.length;

  // ===================== STEP 1: VEHICLE & MILEAGE =====================
  const renderVehicleStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Step 1: Vehicle &amp; Return Details</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Verify vehicle identity, record current return odometer reading, and select return fuel level
          </p>
        </div>
        {contracts.length > 1 && (
          <div className="w-full sm:w-auto">
            <select
              value={selectedContract}
              onChange={(e) => setSelectedContract(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-gray-50 border border-border rounded-xl text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 outline-none cursor-pointer"
            >
              {contracts.map((c) => (
                <option key={c._id} value={c._id}>
                  Contract #{c.contractNumber || c.id || c._id.substring(0, 8)} • {c.vehicle || "Vehicle"}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Vehicle Profile Card (Matching Handover / New Booking Car Card Style) */}
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

        {/* Right: Return Schedule, Mileage & Fuel */}
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
                    onClick={() => setCheckinTime(getCurrentFormattedTime())}
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
                      value={checkinTime}
                      onChange={(e) => setCheckinTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full p-2.5 pl-10 rounded-xl border border-border bg-white text-sm font-medium text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckinTime(getCurrentFormattedTime())}
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
              </div>

              {/* Return Pickup Location */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Return Pickup Location (موقع الاسترجاع)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      readOnly
                      value={returnLocation}
                      className="w-full p-2.5 pl-10 rounded-xl border border-border bg-gray-50 text-xs font-medium text-text-primary outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(returnLocation)}`, "_blank")}
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
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
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
              sublabel={`Handover baseline was ${selectedContractData?.checkoutFuelLevel !== undefined ? selectedContractData.checkoutFuelLevel : 100}%. Select current tank percentage.`}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ===================== STEP 2: INSPECTION PHOTOS =====================
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
        title="Vehicle Return Inspection (فحص استرجاع السيارة)"
        subtitle="Capture photos using direct camera or upload from gallery across all 8 standard angles."
        badgeLabel="Return Condition"
      />
    </div>
  );

  // ===================== STEP 3: DAMAGE CHECK =====================
  const renderDamageStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Step 3: Damage Inspection (فحص الأضرار)</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Inspect body panels, glass, and interior. Record any new damages discovered during return pickup.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <label className="text-sm font-bold text-text-primary flex items-center gap-2">
          <AlertTriangle size={18} className={hasNewDamage ? "text-red-500" : "text-brand"} />
          <span>Were Any New Damages Found Upon Return? (هل توجد أي أضرار جديدة؟)</span>
        </label>

        {/* Binary Choice Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setHasNewDamage(false);
              setNewDamages("");
              setDamagePhotos([]);
            }}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 text-left ${
              !hasNewDamage
                ? "border-emerald-500 bg-emerald-50/70 shadow-sm"
                : "border-border bg-white hover:bg-gray-50 text-text-muted"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              !hasNewDamage ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              <CheckCircle size={20} />
            </div>
            <div>
              <strong className={`block text-sm font-bold ${!hasNewDamage ? "text-emerald-950" : "text-text-primary"}`}>
                No New Damages (سليمة تماماً)
              </strong>
              <span className="text-xs text-text-muted">Vehicle returned in clean condition without new scratches or dents</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setHasNewDamage(true)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 text-left ${
              hasNewDamage
                ? "border-red-500 bg-red-50/70 shadow-sm"
                : "border-border bg-white hover:bg-gray-50 text-text-muted"
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              hasNewDamage ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400"
            }`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <strong className={`block text-sm font-bold ${hasNewDamage ? "text-red-950" : "text-text-primary"}`}>
                New Damages Found (توجد أضرار)
              </strong>
              <span className="text-xs text-text-muted">New scratches, dents, cracked glass, or interior stains noticed</span>
            </div>
          </button>
        </div>

        {/* Detailed Damage Form If Damages Marked */}
        {hasNewDamage && (
          <div className="p-5 bg-red-50/70 rounded-2xl border border-red-200 space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-bold text-red-950 mb-1.5">
                Damage Description (وصف الأضرار بالتفصيل) <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={newDamages}
                onChange={(e) => setNewDamages(e.target.value)}
                placeholder="Describe each damaged part clearly (e.g. Dent on front right fender, deep scratch on rear bumper...)"
                className="w-full p-3 rounded-xl border border-red-200 bg-white text-xs text-text-primary focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none resize-none font-medium"
                required
              />
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

  // ===================== STEP 4: REVIEW & CHECK-IN =====================
  const renderReviewStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Step 4: Review &amp; Complete Return</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Review vehicle inspection details and confirm completion of return check-in
        </p>
      </div>

      {/* Summary Profile Grid (Matching Handover Cards) */}
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
          <span className="text-xs text-text-muted font-mono">{plateNumber || ""}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-text-muted text-xs block mb-1">Return Location</span>
          <strong className="text-text-primary text-xs font-bold block truncate" title={returnLocation}>
            {returnLocation}
          </strong>
          <span className="text-xs text-text-muted">{checkinTime}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <span className="text-text-muted text-xs block mb-1">Return Mileage</span>
          <strong className="text-brand text-sm font-bold block">
            {Number(returnOdometer).toLocaleString()} km
          </strong>
          <span className="text-xs text-emerald-600 font-semibold">+{kmDriven.toLocaleString()} km driven</span>
        </div>
      </div>

      {/* Condition & Logistics Summary */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-3">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-text-muted">Return Fuel Level:</span>
            <span className="font-bold text-emerald-700">{returnFuelLevel}%</span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-text-muted">Inspection Photos:</span>
            <span className="font-bold text-text-primary">
              {Object.values(returnPhotos).filter(Boolean).length}/8 photos captured
            </span>
          </div>

          <div className="flex justify-between py-1.5 border-b border-gray-100 items-center">
            <span className="text-text-muted">Physical Condition:</span>
            {hasNewDamage ? (
              <span className="px-2.5 py-0.5 rounded-lg bg-red-100 text-red-800 text-xs font-bold inline-flex items-center gap-1">
                <AlertTriangle size={12} className="text-red-600" />
                <span>New Damages Logged ({damagePhotos.length} photos)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1">
                <CheckCircle2 size={12} className="text-emerald-600" />
                <span>Clean / No New Damages</span>
              </span>
            )}
          </div>

          {returnNotes && (
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-text-muted">Driver Remarks:</span>
              <span className="font-medium text-text-primary italic text-right max-w-sm">{returnNotes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Inspection Photos Thumbnails */}
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

      {/* Additional Return Charges (SALIK, PARKING, FINES, FUEL) */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-brand" />
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Additional Return Charges &amp; Penalties (رسوم ومخالفات الإرجاع)
            </h3>
          </div>
          {(extraKmCharge + (Number(salikCharge) || 0) + (Number(parkingCharge) || 0) + (Number(finesCharge) || 0) + (Number(fuelCharge) || 0)) > 0 && (
            <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full">
              +${(extraKmCharge + (Number(salikCharge) || 0) + (Number(parkingCharge) || 0) + (Number(finesCharge) || 0) + (Number(fuelCharge) || 0)).toFixed(2)} Total Due
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

        {/* Summary note */}
        {(extraKmCharge + (Number(salikCharge) || 0) + (Number(parkingCharge) || 0) + (Number(finesCharge) || 0) + (Number(fuelCharge) || 0)) > 0 ? (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-semibold">Total additional charges to report/collect:</span>
            <strong className="font-bold text-sm text-brand">
              ${(extraKmCharge + (Number(salikCharge) || 0) + (Number(parkingCharge) || 0) + (Number(finesCharge) || 0) + (Number(fuelCharge) || 0)).toFixed(2)}
            </strong>
          </div>
        ) : (
          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Clean return: No extra mileage, fines, parking, salik, or fuel charges.</span>
          </div>
        )}
      </div>

      {/* Mandatory Checkbox: Confirm Return Completion */}
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
              Confirm Vehicle Return Completion (تأكيد استلام السيارة وإتمام الاسترجاع) *
            </strong>
            <span className="text-text-muted mt-0.5 block">
              I certify that I have physically received and inspected the vehicle, recorded the accurate odometer ({Number(returnOdometer).toLocaleString()} km) and fuel level ({returnFuelLevel}%), and completed the vehicle return inspection.
            </span>
          </div>
        </label>
      </div>
    </div>
  );

  // Render Step Content
  const renderStepContent = () => {
    if (currentStep === 1) return renderVehicleStep();
    if (currentStep === 2) return renderPhotosStep();
    if (currentStep === 3) return renderDamageStep();
    if (currentStep === 4) return renderReviewStep();
    return null;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header (Matching Handover Header Exactly) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <button
            onClick={() => router.push("/driver")}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} /> Back to Driver Dashboard
          </button>
          <h1 className="text-2xl font-bold text-text-primary">Process Vehicle Return (استرجاع السيارة)</h1>
          <p className="text-sm text-text-secondary mt-1">
            Return inspection for contract #{contractNum} — verify mileage &amp; fuel, inspect vehicle condition, and complete check-in.
          </p>
        </div>

        {/* Contract Info Pill (Matching Handover Header) */}
        <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center gap-2 border border-gray-200/80 shadow-2xs self-start md:self-auto shrink-0">
          <span className="px-3 py-1.5 bg-white rounded-xl text-xs font-bold text-brand shadow-xs">
            Contract #{contractNum}
          </span>
          <span className="px-3 py-1.5 text-xs font-semibold text-text-secondary">
            {vehicleName}
          </span>
        </div>
      </div>

      {/* Stepper Header (100% Matching Confirm Handover) */}
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
              width:
                totalSteps > 1
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

      {/* Main Wizard Content Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 animate-fade-in-up stagger-2 min-h-[480px]">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700 animate-shake">
            <AlertCircle size={18} className="shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {renderStepContent()}

        {/* Navigation Footer (Inside Card Container) */}
        <div className="flex items-center justify-between pt-6 mt-8 border-t border-border">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="px-5 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-gray-50 text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Previous Step</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/driver")}
              className="px-5 py-2.5 rounded-xl border border-border text-text-muted hover:bg-gray-50 text-sm font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-brand/20 cursor-pointer"
            >
              <span>Next Step</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCompleteReturn}
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Return...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Complete Vehicle Return (تأكيد استرجاع السيارة)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
