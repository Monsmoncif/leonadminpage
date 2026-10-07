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
  DollarSign,
  Banknote,
  Image as ImageIcon,
  FileText
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import VehicleInspectionPhotoCapture, { VEHICLE_ANGLES } from "@/components/ui/VehicleInspectionPhotoCapture";

const STEPS = [
  { id: 1, title: "Vehicle & Mileage", arTitle: "المركبة والعداد" },
  { id: 2, title: "Inspection Photos", arTitle: "صور الفحص" },
  { id: 3, title: "Damage Check", arTitle: "فحص الأضرار" },
  { id: 4, title: "Settlement & Check-in", arTitle: "التسوية والاسترجاع" },
];

// Fast client-side image compression for mobile camera photos
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = (event.target?.result as string) || "";
      if (!result) return resolve("");
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width || 800;
            let height = img.height || 600;
            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.8));
              return;
            }
            resolve(result);
          } catch {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      } catch {
        resolve(result);
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

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
  const [damageCost, setDamageCost] = useState("0");
  const [damagePhotos, setDamagePhotos] = useState<string[]>([]);
  const [damageUploadMode, setDamageUploadMode] = useState<"camera" | "gallery">("camera");
  const [isUploadingDamagePhoto, setIsUploadingDamagePhoto] = useState(false);

  // Cash / Payment Documentation Photos
  const [moneyPhotos, setMoneyPhotos] = useState<string[]>([]);
  const [moneyUploadMode, setMoneyUploadMode] = useState<"camera" | "gallery">("camera");
  const [isUploadingMoneyPhoto, setIsUploadingMoneyPhoto] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [returnPaymentMethod, setReturnPaymentMethod] = useState("Cash");

  // Final confirmation checkbox
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isAllMoneyConfirmed, setIsAllMoneyConfirmed] = useState(false);

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
      if (Array.isArray(selectedContractData.returnMoneyPhotos)) {
        setMoneyPhotos(selectedContractData.returnMoneyPhotos);
      } else {
        setMoneyPhotos([]);
      }
      setReturnPhotos(initialPhotos);
      setIsConfirmed(false);
      setIsAllMoneyConfirmed(false);
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
  const checkoutFuelLevel = selectedContractData?.checkoutFuelLevel !== undefined ? Number(selectedContractData.checkoutFuelLevel) : 100;
  const dailyKmLimit = Number(selectedContractData?.dailyKmLimit || 0);
  const pricePerExtraKm = Number(selectedContractData?.pricePerExtraKm || 0);
  const totalDays = Number(selectedContractData?.totalDays || 1);
  const totalIncludedKm = dailyKmLimit * totalDays;
  const extraKm = dailyKmLimit > 0 ? Math.max(0, kmDriven - totalIncludedKm) : 0;
  const extraKmCharge = extraKm * pricePerExtraKm;
  const damageChargeNum = hasNewDamage ? Number(damageCost) || 0 : 0;
  const salikChargeNum = Number(salikCharge) || 0;
  const parkingChargeNum = Number(parkingCharge) || 0;
  const finesChargeNum = Number(finesCharge) || 0;
  const fuelChargeNum = Number(fuelCharge) || 0;
  const totalReturnCharges = extraKmCharge + damageChargeNum + salikChargeNum + parkingChargeNum + finesChargeNum + fuelChargeNum;

  // Breakdown of money collected (Rental collection + deposit + return charges)
  const contractTotalRent = Number(selectedContractData?.totalAmount || 0);
  const contractAdvance = Number(selectedContractData?.advancePayment || 0);
  const contractRentalCollection = Math.max(0, contractTotalRent - contractAdvance);
  const contractDeposit = Number(selectedContractData?.depositAmount) || (selectedContractData?.deposit ? Number(String(selectedContractData.deposit).replace(/[^0-9.]/g, '')) : 0);

  const moneyBreakdownParts: string[] = [];
  if (contractRentalCollection > 0) {
    moneyBreakdownParts.push(`Rental Collection of AED ${contractRentalCollection.toLocaleString()}`);
  }
  if (contractDeposit > 0) {
    moneyBreakdownParts.push(`Deposit of AED ${contractDeposit.toLocaleString()}`);
  }
  if (totalReturnCharges > 0) {
    moneyBreakdownParts.push(`Return Charges of AED ${totalReturnCharges.toLocaleString()}`);
  }

  const grandTotalMoney = contractRentalCollection + contractDeposit + totalReturnCharges;

  const moneyBreakdownText = moneyBreakdownParts.length > 0
    ? `${moneyBreakdownParts.join(" + ")} = Total AED ${grandTotalMoney.toLocaleString()}`
    : `Total AED 0`;

  // Damage photo uploader
  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingDamagePhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await compressImage(file);
        if (!base64) continue;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, folder: "wheelzie_damages" }),
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
      toast.success("Damage photo attached.");
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

  // Money photo uploader
  const handleMoneyPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMoneyPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await compressImage(file);
        if (!base64) continue;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, folder: "wheelzie_settlement" }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setMoneyPhotos((prev) => [...prev, data.url]);
          }
        }
      }
      toast.success("Payment proof photo attached successfully.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload money photo.");
    } finally {
      setIsUploadingMoneyPhoto(false);
      e.target.value = "";
    }
  };

  const handleRemoveMoneyPhoto = (index: number) => {
    setMoneyPhotos((prev) => prev.filter((_, idx) => idx !== index));
    toast.info("Payment photo removed.");
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

    if (!isAllMoneyConfirmed) {
      setError("Please check 'Confirm Get All Money (تأكيد استلام كامل المبلغ)' before finalizing return.");
      toast.error("Confirm Get All Money is required.");
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
        damageCharge: damageChargeNum,
        salikFees: salikChargeNum,
        salikCharge: salikChargeNum,
        parkingFees: parkingChargeNum,
        parkingCharge: parkingChargeNum,
        finesFees: finesChargeNum,
        finesCharge: finesChargeNum,
        fuelFees: fuelChargeNum,
        fuelCharge: fuelChargeNum,
        damages: hasNewDamage && newDamages.trim() ? [{
          description: newDamages.trim(),
          cost: damageChargeNum,
          date: new Date()
        }] : [],
        newDamages: damageDescription,
        damagePhotos: hasNewDamage ? damagePhotos : [],
        moneyPhotos: selectedContractData?.moneyPhotos || [],
        returnMoneyPhotos: moneyPhotos,
        paymentMethod: returnPaymentMethod,
        paymentStatus: "Paid",
        returnAmountCollected: totalReturnCharges,
        returnPaymentMethod: returnPaymentMethod,
        returnPhotos: orderedReturnPhotos,
        returnNotes: returnNotes.trim() ? returnNotes.trim() : selectedContractData?.returnNotes || "",
        notes: returnNotes.trim() ? `${selectedContractData?.notes || ""}\n[Return Remarks: ${returnNotes.trim()}]`.trim() : selectedContractData?.notes,
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

        {/* Right: Return Schedule & Mileage */}
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
                <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                  <span>Check-in Return Time (وقت الاسترجاع)</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={checkinTime}
                      onChange={(e) => setCheckinTime(e.target.value)}
                      placeholder="e.g. 10:00 AM"
                      className="w-full p-2.5 pl-8 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-medium"
                    />
                    <Clock size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckinTime(getCurrentFormattedTime())}
                    className="px-3.5 py-2.5 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 border border-brand/20 flex items-center gap-1.5 shadow-2xs"
                    title="Set current time"
                  >
                    <Clock size={13} />
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

          {/* Return Fuel Level */}
          <div className="bg-white rounded-2xl border border-border p-5 space-y-3 shadow-2xs">
            <FuelLevelSelector
              value={returnFuelLevel}
              onChange={(lvl) => setReturnFuelLevel(lvl)}
              label="Return Fuel Level (مستوى الوقود عند الاسترجاع)"
              sublabel={`Handover Baseline: ${checkoutFuelLevel}%`}
              required
              className="p-0 border-0 bg-transparent"
            />
            {returnFuelLevel < checkoutFuelLevel && (
              <div className="flex items-center justify-between text-xs p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <span className="flex items-center gap-1.5 font-medium">
                  <Fuel size={14} className="text-amber-700 shrink-0" />
                  Fuel is lower than checkout baseline ({checkoutFuelLevel}% → {returnFuelLevel}%).
                </span>
                <span className="font-bold text-amber-800 shrink-0">
                  -{checkoutFuelLevel - returnFuelLevel}%
                </span>
              </div>
            )}
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

      {/* Damage Status Toggle */}
      <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck size={16} className="text-brand" /> Vehicle Condition (حالة السيارة)
        </h3>

        <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-gray-200 shadow-xs">
          <button
            type="button"
            onClick={() => {
              setHasNewDamage(false);
              setNewDamages("");
              setDamageCost("0");
              setDamagePhotos([]);
            }}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              !hasNewDamage
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
            }`}
          >
            <ShieldCheck size={14} />
            No Damages / سليمة
          </button>
          <button
            type="button"
            onClick={() => setHasNewDamage(true)}
            className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              hasNewDamage
                ? "bg-red-600 text-white shadow-xs"
                : "text-text-secondary hover:text-text-primary hover:bg-gray-100"
            }`}
          >
            <AlertTriangle size={14} />
            Damages Found / توجد أضرار
          </button>
        </div>

        <p className={`text-[11px] px-1 ${hasNewDamage ? "text-red-600" : "text-emerald-600"}`}>
          {hasNewDamage 
            ? `${damagePhotos.length} photo(s) attached • ${newDamages ? "Description provided" : "Description needed"}`
            : "All body panels, glass, and interior have been inspected and cleared"
          }
        </p>
      </div>

      {/* Damage Details — only when damages found */}
      {hasNewDamage && (
        <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100 animate-fade-in">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <FileText size={16} className="text-red-600" /> Damage Report (تقرير الأضرار)
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Description */}
            <div className="lg:col-span-2">
              <label className="text-xs font-semibold text-text-secondary block mb-1 flex items-center gap-1">
                <span>Damage Description (وصف الأضرار بالتفصيل)</span>
                <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={newDamages}
                onChange={(e) => setNewDamages(e.target.value)}
                placeholder="Describe each damaged part clearly (e.g. Dent on front right fender, deep scratch on rear bumper, cracked side mirror...)"
                className="w-full p-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none resize-none font-medium text-text-primary placeholder:text-gray-400"
                required
              />
            </div>

            {/* Cost */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Estimated Repair Cost (تكلفة الإصلاح)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">AED</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={damageCost}
                  onChange={(e) => setDamageCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none font-bold text-text-primary"
                />
              </div>
              <span className="text-[11px] text-text-muted mt-0.5 block">Deducted from customer deposit</span>
            </div>
          </div>
        </div>
      )}

      {/* Damage Photos — only when damages found */}
      {hasNewDamage && (
        <div className="space-y-4 bg-gray-50/60 p-5 rounded-2xl border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Camera size={16} className="text-red-600" /> Damage Photos (صور توثيق الأضرار)
                {damagePhotos.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {damagePhotos.length}
                  </span>
                )}
              </h3>
              <span className="text-[11px] text-text-muted">Clear close-up photos of each damaged area</span>
            </div>

            {/* Mode Switcher: Camera vs Gallery */}
            <div className="flex items-center p-1 bg-white rounded-xl border border-gray-200 text-xs font-semibold shadow-2xs self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setDamageUploadMode("camera")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  damageUploadMode === "camera"
                    ? "bg-red-50 text-red-700 shadow-xs font-bold border border-red-200"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Camera Mode (التقاط بالكاميرا مباشرة)"
              >
                <Camera size={14} className={damageUploadMode === "camera" ? "text-red-600" : "text-text-muted"} />
                <span>Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setDamageUploadMode("gallery")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  damageUploadMode === "gallery"
                    ? "bg-red-50 text-red-700 shadow-xs font-bold border border-red-200"
                    : "text-text-muted hover:text-text-primary"
                }`}
                title="Gallery Mode (رفع من المعرض)"
              >
                <ImageIcon size={14} className={damageUploadMode === "gallery" ? "text-red-600" : "text-text-muted"} />
                <span>Gallery</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {damagePhotos.map((url, idx) => (
              <div 
                key={idx} 
                onClick={() => setPreviewPhotoUrl(url)}
                className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-xs bg-gray-100 cursor-pointer"
              >
                <img src={url} alt={`Damage ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveDamagePhoto(idx);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Photo"
                >
                  <Trash2 size={12} />
                </button>
                <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
              </div>
            ))}

            <label className={`aspect-square rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 cursor-pointer group text-center p-2 ${
              isUploadingDamagePhoto 
                ? "opacity-50 pointer-events-none border-gray-300 bg-gray-50" 
                : "border-red-300 hover:border-red-500 bg-white hover:bg-red-50/50"
            }`}>
              <input
                key={damageUploadMode}
                type="file"
                accept="image/*"
                capture={damageUploadMode === "camera" ? "environment" : undefined}
                multiple={damageUploadMode === "gallery"}
                className="hidden"
                onClick={(e) => { e.currentTarget.value = ""; }}
                onChange={handleDamagePhotoUpload}
                disabled={isUploadingDamagePhoto}
              />
              {isUploadingDamagePhoto ? (
                <Loader2 size={20} className="animate-spin text-red-600" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {damageUploadMode === "camera" ? <Camera size={16} /> : <Plus size={16} />}
                </div>
              )}
              <span className="text-[11px] font-bold text-red-700">
                {isUploadingDamagePhoto 
                  ? "Uploading..." 
                  : damageUploadMode === "camera" 
                    ? "Take Photo" 
                    : "From Gallery"}
              </span>
            </label>
          </div>

          {damagePhotos.length === 0 && (
            <p className="text-center text-xs text-text-muted py-1">
              No damage photos yet. {damageUploadMode === "camera" ? "Click 'Take Photo' to capture evidence." : "Click 'From Gallery' to upload evidence."}
            </p>
          )}
        </div>
      )}
    </div>
  );

  // ===================== STEP 4: SETTLEMENT & CHECK-IN =====================
  const renderSettlementStep = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h2 className="text-lg font-bold text-text-primary">Step 4: Settlement &amp; Complete Return</h2>
        <p className="text-xs text-text-muted mt-0.5">
          Review vehicle inspection summary, calculate additional fees, and settle the contract.
        </p>
      </div>

      {/* Executive Summary Profile Grid */}
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
              +AED {totalReturnCharges.toFixed(2)} Total Due
            </span>
          )}
        </div>

        {extraKm > 0 && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs text-red-950">
            <div>
              <span className="font-bold block">Extra Mileage Fee ({extraKm.toLocaleString()} km exceeded limit)</span>
              <span className="text-red-700 text-[11px]">AED {pricePerExtraKm.toFixed(2)} per extra km • {totalIncludedKm.toLocaleString()} km included</span>
            </div>
            <strong className="font-bold text-sm text-red-600">+AED {extraKmCharge.toFixed(2)}</strong>
          </div>
        )}

        {hasNewDamage && (
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 flex items-center justify-between text-xs text-red-950">
            <div>
              <span className="font-bold block">Reported Vehicle Damage ({damagePhotos.length} photos)</span>
              <span className="text-red-700 text-[11px] truncate max-w-sm block">{newDamages || "Damage reported"}</span>
            </div>
            <strong className="font-bold text-sm text-red-600">+AED {damageChargeNum.toFixed(2)}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* SALIK */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-text-primary block">
              SALIK (سالك)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">AED</span>
              <input
                type="number"
                min="0"
                step="any"
                value={salikCharge}
                onChange={(e) => setSalikCharge(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
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
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">AED</span>
              <input
                type="number"
                min="0"
                step="any"
                value={parkingCharge}
                onChange={(e) => setParkingCharge(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
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
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">AED</span>
              <input
                type="number"
                min="0"
                step="any"
                value={finesCharge}
                onChange={(e) => setFinesCharge(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-red-600 focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
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
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-[10px] text-text-muted">AED</span>
              <input
                type="number"
                min="0"
                step="any"
                value={fuelCharge}
                onChange={(e) => setFuelCharge(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-2 py-2 rounded-lg border border-border bg-surface text-xs font-bold text-text-primary focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none"
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
                <span className="font-black text-2xl">+AED {totalReturnCharges.toFixed(2)}</span>
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
                <span className="font-black text-2xl">AED 0.00 Due</span>
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

      {/* Mandatory Checkbox: Confirm Get All Money & Proof */}
      <div className="p-3.5 sm:p-4 bg-amber-50/80 rounded-xl border border-amber-200 shadow-2xs">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isAllMoneyConfirmed}
            onChange={(e) => setIsAllMoneyConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand cursor-pointer"
          />
          <div className="text-xs">
            <span className="font-bold text-amber-950 block">
              Confirm Get All Money (تأكيد استلام كامل المبلغ) *
            </span>
            <span className="text-[11px] text-amber-800 mt-0.5 block font-medium">
              I certify that all required money ({moneyBreakdownText}) has been received from the customer.
            </span>
          </div>
        </label>

        {/* Money Photo Proof Upload */}
        <div className="mt-3 pt-3 border-t border-amber-200/80">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <Banknote size={15} className="text-amber-800" />
              <span className="text-xs font-bold text-amber-950">
                Money / Payment Proof (صورة استلام المبلغ)
              </span>
              {moneyPhotos.length > 0 && (
                <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {moneyPhotos.length} {moneyPhotos.length === 1 ? "photo" : "photos"}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Direct Camera Button */}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300 shadow-2xs cursor-pointer transition-all active:scale-95">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onClick={(e) => { e.currentTarget.value = ""; }}
                  onChange={handleMoneyPhotoUpload}
                  disabled={isUploadingMoneyPhoto}
                />
                <Camera size={14} className="text-amber-800" />
                <span>Camera</span>
              </label>

              {/* Upload Gallery Button */}
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-semibold rounded-lg border border-amber-300 shadow-2xs cursor-pointer transition-all active:scale-95">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onClick={(e) => { e.currentTarget.value = ""; }}
                  onChange={handleMoneyPhotoUpload}
                  disabled={isUploadingMoneyPhoto}
                />
                <ImageIcon size={14} className="text-amber-800" />
                <span>Gallery</span>
              </label>
            </div>
          </div>

          {/* Uploading indicator */}
          {isUploadingMoneyPhoto && (
            <div className="flex items-center gap-2 p-2 bg-amber-100/60 rounded-lg text-amber-900 text-xs mb-2">
              <Loader2 size={14} className="animate-spin text-amber-800" />
              <span>Uploading payment proof photo...</span>
            </div>
          )}

          {/* Photo thumbnails grid */}
          {moneyPhotos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
              {moneyPhotos.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setPreviewPhotoUrl(url)}
                  className="relative group aspect-square rounded-lg overflow-hidden border border-amber-300 bg-white shadow-2xs cursor-pointer hover:border-amber-400 transition-all"
                >
                  <img
                    src={url}
                    alt={`Money proof ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMoneyPhoto(idx);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-md shadow-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete photo"
                  >
                    <Trash2 size={11} />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[8px] font-bold text-white bg-black/60 px-1 py-0.2 rounded backdrop-blur-xs">
                    #{idx + 1}
                  </span>
                </div>
              ))}

              {/* Add more button tile */}
              <label className="aspect-square rounded-lg border border-dashed border-amber-300 hover:border-amber-400 bg-white/70 hover:bg-amber-100/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onClick={(e) => { e.currentTarget.value = ""; }}
                  onChange={handleMoneyPhotoUpload}
                  disabled={isUploadingMoneyPhoto}
                />
                <Plus size={14} className="text-amber-800" />
                <span className="text-[9px] font-bold text-amber-800">+ Add</span>
              </label>
            </div>
          ) : (
            <p className="text-[11px] text-amber-800/80 italic pt-0.5">
              Optional: Take a photo of the cash/payment received or upload receipt here.
            </p>
          )}
        </div>
      </div>

      {/* Staff Return Remarks */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <FileText size={15} className="text-brand" />
          <span>Driver Return Remarks (ملاحظات السائق)</span>
        </label>
        <textarea
          rows={2}
          value={returnNotes}
          onChange={(e) => setReturnNotes(e.target.value)}
          placeholder="Any additional notes or settlement remarks regarding the vehicle return..."
          className="w-full p-3 rounded-xl border border-border bg-white text-xs outline-none focus:ring-2 focus:ring-brand/20 resize-none font-medium"
        />
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
    if (currentStep === 4) return renderSettlementStep();
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
      {/* Lightbox Preview Modal */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div 
            className="relative max-w-2xl max-h-[85vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 text-white">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <ImageIcon size={15} className="text-brand" />
                <span>Photo Preview</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Close preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-black/50 max-h-[75vh]">
              <img
                src={previewPhotoUrl}
                alt="Full Preview"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
