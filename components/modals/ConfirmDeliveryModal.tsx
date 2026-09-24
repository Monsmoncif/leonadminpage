"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Clock, 
  DollarSign, 
  User, 
  MapPin, 
  Phone,
  CheckCircle, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  FileText, 
  Camera, 
  Image as ImageIcon,
  PenTool, 
  RotateCcw,
  Navigation,
  CreditCard,
  Banknote,
  Coins,
  Layers,
  Sparkles,
  UserCheck,
  UserPlus,
  Edit,
  Search,
  Trash2,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import FuelLevelSelector from "@/components/ui/FuelLevelSelector";
import PaymentMethodSelector from "@/components/ui/PaymentMethodSelector";
import CreateClientModal from "@/components/modals/CreateClientModal";
import SelectSecondDriverModal from "@/components/modals/SelectSecondDriverModal";
import { useToast } from "@/components/providers/ToastProvider";

export const VEHICLE_ANGLES = [
  "Front View",
  "Rear View",
  "Left Side",
  "Right Side",
  "Dashboard / Mileage",
  "Front Interior",
  "Rear Interior",
  "Trunk / Boot"
];

const STEPS = [
  { id: 1, title: "Vehicle", sub: "السيارة", icon: ExecutiveCarIcon },
  { id: 2, title: "Client & 2nd Driver", sub: "العميل والسائق", icon: User },
  { id: 3, title: "Payment & Terms", sub: "الدفع والتأمين", icon: DollarSign },
  { id: 4, title: "Inspection", sub: "فحص السيارة", icon: Camera },
  { id: 5, title: "Review & Sign", sub: "المراجعة والتوقيع", icon: CheckCircle },
];

export const formatTimeDisplay = (rawTime?: string): string => {
  if (!rawTime || typeof rawTime !== "string") return "8:00 AM";
  const trimmed = rawTime.trim();
  if (!trimmed || trimmed.toLowerCase() === "pending handover") return "Pending Handover";

  const colonMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (colonMatch) {
    let h = parseInt(colonMatch[1], 10);
    const m = colonMatch[2];
    const ampm = colonMatch[3]?.toUpperCase();

    if (ampm) {
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    }
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
  }

  const noColonMatch = trimmed.match(/^(\d{1,2})(\d{2})\s*(AM|PM)?$/i);
  if (noColonMatch) {
    let h = parseInt(noColonMatch[1], 10);
    const m = noColonMatch[2];
    const ampm = noColonMatch[3]?.toUpperCase();

    if (ampm) {
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
    }
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${period}`;
  }

  const hourOnlyMatch = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (hourOnlyMatch) {
    let h = parseInt(hourOnlyMatch[1], 10);
    const period = hourOnlyMatch[2].toUpperCase();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:00 ${period}`;
  }

  return trimmed;
};

interface ConfirmDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { 
    checkoutTime: string; 
    checkoutFuelLevel?: number;
    depositAmount: number; 
    rentalAmountCollected?: number;
    paymentMethod: string;
    paymentStatus: "Paid" | "Partial" | "Pending";
    notes?: string;
    inspectionPhotos?: string[];
    customerSignature?: string | null;
    clientId?: string;
    additionalDriverName?: string;
    additionalDriverLicense?: string;
    additionalDriverNationality?: string;
    additionalDriverPhone?: string;
    additionalDriverExpiry?: string;
    additionalDriverIssuedAt?: string;
  }) => Promise<void>;
  contract: any | null;
  isLoading?: boolean;
}

export default function ConfirmDeliveryModal({
  isOpen,
  onClose,
  onConfirm,
  contract,
  isLoading = false,
}: ConfirmDeliveryModalProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Vehicle & Schedule
  const [checkoutTime, setCheckoutTime] = useState("");
  const [checkoutFuelLevel, setCheckoutFuelLevel] = useState<number>(100);

  // Step 2: Client & Second Driver
  const [allClients, setAllClients] = useState<any[]>([]);
  const [currentClient, setCurrentClient] = useState<any>(null);
  const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
  const [isChangeClientOpen, setIsChangeClientOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  const [secondDriver, setSecondDriver] = useState<{
    name: string;
    licenseNumber?: string;
    nationality?: string;
    phone?: string;
    licenseExpiry?: string;
    address?: string;
  } | null>(null);
  const [isSelectSecondDriverOpen, setIsSelectSecondDriverOpen] = useState(false);
  const [isCreatingSecondDriverClient, setIsCreatingSecondDriverClient] = useState(false);

  // Step 3: Payment & Terms
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [collectedRentalAmount, setCollectedRentalAmount] = useState<number>(0);
  const [isDepositConfirmed, setIsDepositConfirmed] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Step 4: Inspection Photos
  const [inspectionPhotos, setInspectionPhotos] = useState<Record<string, string>>({});
  const [previewPhotos, setPreviewPhotos] = useState<Record<string, string>>({});
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");

  // Step 5: Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const hasDrawnRef = useRef(false);
  const modalScrollRef = useRef<HTMLDivElement>(null);

  const getCurrentFormattedTime = () => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  };

  // Fetch all clients for search / second driver selection
  const fetchClientsList = async () => {
    try {
      const res = await fetch("/api/clients", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const list = data.clients || (Array.isArray(data) ? data : []);
        setAllClients(list);
      }
    } catch (err) {
      console.error("Failed to load clients:", err);
    }
  };

  useEffect(() => {
    if (isOpen && contract) {
      setStep(1);
      setError(null);
      fetchClientsList();

      // Schedule & Fuel
      const rawTime = contract.checkoutTime?.trim();
      setCheckoutTime(
        rawTime && rawTime.toLowerCase() !== "pending handover"
          ? formatTimeDisplay(rawTime)
          : getCurrentFormattedTime()
      );
      setCheckoutFuelLevel(contract.checkoutFuelLevel !== undefined ? Number(contract.checkoutFuelLevel) : 100);

      // Client Data
      const clientObj = contract.clientId && typeof contract.clientId === "object"
        ? contract.clientId
        : null;
      
      if (clientObj) {
        setCurrentClient(clientObj);
      } else if (contract.clientId) {
        // Fetch full client details by ID
        fetch(`/api/clients/${contract.clientId}`, { cache: "no-store" })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) setCurrentClient(data);
            else setCurrentClient({ _id: contract.clientId, name: contract.customer || "Client", phone: contract.customerPhone || "" });
          })
          .catch(() => {
            setCurrentClient({ _id: contract.clientId, name: contract.customer || "Client", phone: contract.customerPhone || "" });
          });
      } else {
        setCurrentClient(null);
      }

      // Second Driver
      if (contract.additionalDriverName) {
        setSecondDriver({
          name: contract.additionalDriverName,
          licenseNumber: contract.additionalDriverLicense || "",
          nationality: contract.additionalDriverNationality || "",
          phone: contract.additionalDriverPhone || "",
          licenseExpiry: contract.additionalDriverExpiry || "",
          address: contract.additionalDriverIssuedAt || "Dubai",
        });
      } else {
        setSecondDriver(null);
      }

      // Payment & Financials
      const totalDue = Number(contract.totalAmount) || 0;
      setCollectedRentalAmount(totalDue);
      setDepositAmount(Number(contract.depositAmount) || 0);
      setIsDepositConfirmed(false);
      setPaymentMethod(contract.paymentMethod || "Cash");
      setDeliveryNotes(contract.notes || "");

      // Photos & Signature
      setInspectionPhotos({});
      setPreviewPhotos({});
      setSignatureData(null);
      hasDrawnRef.current = false;
      setUploadMode("camera");
    }
  }, [isOpen, contract]);

  // Scroll to top on step change
  useEffect(() => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  // Canvas initialization with Retina DPI scaling for iPads and Phones
  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const prevSig = signatureData;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.scale(dpr, dpr);
          ctx.lineWidth = 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = "#0f172a";
          if (prevSig) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, rect.width, rect.height);
            };
            img.src = prevSig;
          }
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (!isOpen || !contract) return null;

  // Photo Upload Handler
  const handlePhotoUpload = async (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewPhotos(prev => ({ ...prev, [angle]: objectUrl }));
    setUploadingAngle(angle);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Image = reader.result;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });

        if (res.ok) {
          const data = await res.json();
          setInspectionPhotos(prev => ({ ...prev, [angle]: data.url }));
        } else {
          setPreviewPhotos(prev => {
            const next = { ...prev };
            delete next[angle];
            return next;
          });
          setError("Failed to upload image. Please try again.");
        }
        setUploadingAngle(null);
      };
    } catch (err) {
      console.error("Error uploading image:", err);
      setPreviewPhotos(prev => {
        const next = { ...prev };
        delete next[angle];
        return next;
      });
      setUploadingAngle(null);
    }
  };

  const handleRemovePhoto = (angle: string) => {
    setPreviewPhotos(prev => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
    setInspectionPhotos(prev => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
  };

  // Touch & Mouse Signature Handlers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasDrawnRef.current) {
      setSignatureData(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasDrawnRef.current = false;
    setSignatureData(null);
  };

  // Second Driver Selection Handlers
  const handleSelectSecondDriver = (client: any) => {
    if (!client) return;
    setSecondDriver({
      name: client.name || "",
      licenseNumber: client.licenseNumber || "",
      nationality: client.nationality || "",
      phone: client.phone || "",
      licenseExpiry: client.licenseExpiry ? new Date(client.licenseExpiry).toISOString().split("T")[0] : "",
      address: client.address || "Dubai",
    });
    setIsSelectSecondDriverOpen(false);
    toast.success(`Selected "${client.name}" as Authorized Second Driver!`);
  };

  const handleRemoveSecondDriver = () => {
    setSecondDriver(null);
    toast.info("Second driver removed.");
  };

  // Step Validation & Navigation
  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!checkoutTime.trim()) {
        setError("Please specify handover checkout time.");
        return;
      }
    } else if (step === 2) {
      if (!currentClient || (!currentClient.name && !currentClient.phone)) {
        setError("Please ensure a valid customer is selected or registered.");
        return;
      }
    } else if (step === 3) {
      if (!isDepositConfirmed) {
        setError("Please check and confirm 'Confirm Get All Money (تأكيد استلام كامل المبلغ)' before proceeding.");
        return;
      }
    }
    setStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (depositAmount < 0) {
      setError("Deposit amount cannot be negative.");
      return;
    }
    if (!isDepositConfirmed) {
      setError("Please check and confirm 'Confirm Get All Money (تأكيد استلام كامل المبلغ)' before completing vehicle handover.");
      return;
    }

    const totalDue = Number(contract.totalAmount) || 0;
    const totalCollected = Number(collectedRentalAmount) || 0;

    const computedPaymentStatus: "Paid" | "Partial" | "Pending" =
      totalCollected >= totalDue
        ? "Paid"
        : totalCollected > 0
        ? "Partial"
        : "Pending";

    setError(null);
    await onConfirm({
      checkoutTime: formatTimeDisplay(checkoutTime || getCurrentFormattedTime()),
      checkoutFuelLevel: Number(checkoutFuelLevel) || 100,
      depositAmount: Number(depositAmount) || 0,
      rentalAmountCollected: totalCollected,
      paymentMethod: paymentMethod || "Cash",
      paymentStatus: computedPaymentStatus,
      notes: deliveryNotes,
      inspectionPhotos: VEHICLE_ANGLES.map(angle => inspectionPhotos[angle] || ""),
      customerSignature: signatureData,
      clientId: currentClient?._id || currentClient?.id,
      additionalDriverName: secondDriver?.name || "",
      additionalDriverLicense: secondDriver?.licenseNumber || "",
      additionalDriverNationality: secondDriver?.nationality || "",
      additionalDriverPhone: secondDriver?.phone || "",
      additionalDriverExpiry: secondDriver?.licenseExpiry || "",
      additionalDriverIssuedAt: secondDriver?.address || "Dubai",
    });
  };

  // Vehicle Details
  const contractNum = contract.id || (typeof contract.contractNumber === "number" ? String(contract.contractNumber) : contract._id?.substring(0, 8)?.toUpperCase()) || "N/A";
  const vehicleName = contract.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || (contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Vehicle");
  const plateMatch = (contract.vehicle || "").match(/\(([^)]+)\)/);
  const plateNumber = contract.vehiclePlate || contract.unitId?.plate || contract.plate || (plateMatch ? plateMatch[1] : "");
  const vehicleColor = contract.vehicleColor || contract.unitId?.color || "";
  const vehicleFuel = contract.vehicleFuel || contract.unitId?.fuelType || "";
  const vehicleYear = contract.vehicleYear || contract.unitId?.year || "";
  const vehicleImage = contract.unitId?.images?.[0] || contract.vehicleImage || null;
  const pickupLoc = contract.pickupLocation || "Main Office";

  const photoCount = Object.keys(inspectionPhotos).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-xl md:max-w-3xl lg:max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] my-auto border border-border/60">
        
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-gray-50/80">
          <div className="pr-2 min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
              Confirm Vehicle Handover (تسليم السيارة للعميل)
            </h2>
            <p className="text-[11px] sm:text-xs text-text-secondary truncate">
              Contract #{contractNum} • {vehicleName} {plateNumber ? `(${plateNumber})` : ""}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-200 active:scale-95 rounded-xl transition-all cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 5-Step Stepper Header (Like Admin) */}
        <div className="border-b border-border bg-gray-50/60 px-3 py-2 sm:px-6 sm:py-3 shrink-0">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              return (
                <div key={s.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) setStep(s.id);
                    }}
                    disabled={!isCompleted && !isCurrent}
                    className={`flex items-center gap-1.5 sm:gap-2 transition-all text-left ${
                      isCurrent
                        ? "text-brand font-bold"
                        : isCompleted
                        ? "text-emerald-700 font-semibold cursor-pointer hover:underline"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                      isCurrent
                        ? "bg-brand text-white ring-2 ring-brand/30 shadow-xs"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}>
                      {isCompleted ? <CheckCircle2 size={15} /> : <Icon size={14} />}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs leading-none">{s.title}</p>
                      <p className="text-[10px] text-gray-400 font-normal mt-0.5">{s.sub}</p>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1.5 sm:mx-2 transition-colors ${
                      step > s.id ? "bg-emerald-500" : "bg-gray-200"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div ref={modalScrollRef} className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 sm:p-4 rounded-xl text-xs sm:text-sm font-medium flex items-start gap-2.5 border border-red-100 animate-shake">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* ================= STEP 1: VEHICLE & SCHEDULE ================= */}
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Step 1: Vehicle &amp; Handover Schedule (السيارة وموعد التسليم)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">Verify vehicle condition and set exact handover delivery time.</p>
                </div>
                <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
                  Step 1 of 5
                </span>
              </div>

              {/* Vehicle Card */}
              <div className="bg-gray-50/90 p-4 sm:p-5 rounded-2xl border border-border flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-28 h-24 rounded-xl bg-white border border-border/80 flex items-center justify-center shrink-0 p-2 overflow-hidden shadow-2xs">
                  {vehicleImage ? (
                    <img src={vehicleImage} alt={vehicleName} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ExecutiveCarIcon size={40} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-mono font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-md">
                      #{contractNum}
                    </span>
                    {plateNumber && (
                      <span className="text-xs font-mono font-bold text-gray-800 bg-white border border-gray-300 px-2 py-0.5 rounded-md">
                        Plate: {plateNumber}
                      </span>
                    )}
                    {vehicleColor && (
                      <span className="text-xs text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded-md font-medium">
                        Color: {vehicleColor}
                      </span>
                    )}
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-text-primary truncate">
                    {vehicleName} {vehicleYear && <span className="text-sm font-normal text-text-muted">({vehicleYear})</span>}
                  </h4>
                  <div className="flex items-center justify-center sm:justify-start gap-3 text-xs text-text-muted">
                    {vehicleFuel && <span>Fuel Type: <strong className="text-gray-800">{vehicleFuel}</strong></span>}
                    {contract.unitMileage !== undefined && <span>Mileage: <strong className="text-gray-800">{contract.unitMileage} km</strong></span>}
                  </div>
                </div>
              </div>

              {/* Handover Location & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Handover Location */}
                <div className="bg-gray-50/70 p-4 rounded-xl border border-border flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">
                      Handover Location (مكان التسليم)
                    </span>
                    <div className="flex items-center gap-1.5 text-sm font-bold text-text-primary">
                      <MapPin size={16} className="text-emerald-600 shrink-0" />
                      <span className="truncate">{pickupLoc}</span>
                    </div>
                  </div>
                  {pickupLoc && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickupLoc)}`, '_blank')}
                      className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-colors shadow-2xs cursor-pointer self-start"
                    >
                      <Navigation size={12} className="rotate-45" />
                      <span>Open in Google Maps</span>
                    </button>
                  )}
                </div>

                {/* Handover Time */}
                <div className="bg-gray-50/70 p-4 rounded-xl border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                      Handover Time (وقت التسليم) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setCheckoutTime(getCurrentFormattedTime())}
                      className="text-[11px] font-bold text-brand hover:underline cursor-pointer"
                    >
                      Set Current Time
                    </button>
                  </div>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={checkoutTime}
                      onChange={(e) => setCheckoutTime(e.target.value)}
                      placeholder="e.g. 10:30 AM"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </div>
                  <p className="text-[10px] text-text-muted">Recorded on official contract for insurance coverage time.</p>
                </div>
              </div>

              {/* Fuel Level Selector */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-border">
                <FuelLevelSelector
                  value={checkoutFuelLevel}
                  onChange={(val) => setCheckoutFuelLevel(val)}
                  label="Handover Fuel Level (مستوى الوقود عند التسليم)"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 2: CLIENT & SECOND DRIVER ================= */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Step 2: Customer &amp; Authorized Second Driver (العميل والسائق الثاني)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">Review client details, edit if mistake made, or add a second driver.</p>
                </div>
                <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
                  Step 2 of 5
                </span>
              </div>

              {/* Primary Customer Profile Card */}
              <div className="bg-brand/5 border border-brand/20 p-4 sm:p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-brand/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-brand text-white font-black text-base flex items-center justify-center shadow-sm">
                      {currentClient?.name ? currentClient.name.substring(0, 2).toUpperCase() : "CL"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          Primary Hirer (المستأجر الرئيسي)
                        </span>
                        {currentClient?.clientType && (
                          <span className="text-[10px] font-semibold text-gray-600 bg-white px-2 py-0.5 rounded border border-gray-200">
                            {currentClient.clientType}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-text-primary mt-0.5">
                        {currentClient?.name || contract.customer || "No client registered"}
                      </h4>
                    </div>
                  </div>

                  {/* Actions: Edit Client & Change Client */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setIsEditClientModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-text-primary border border-border text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      title="Edit customer details (fix name, phone, license, passport...)"
                    >
                      <Edit size={13} className="text-brand" />
                      <span>Edit Client (تعديل)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsChangeClientOpen(!isChangeClientOpen)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-text-secondary border border-border text-xs font-medium inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <UserCheck size={13} />
                      <span>{isChangeClientOpen ? "Close Switch" : "Switch Client"}</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Client Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-brand/10">
                    <span className="text-[10px] font-bold text-text-muted block uppercase">Phone / الهاتف</span>
                    <strong className="text-gray-900 truncate block mt-0.5">{currentClient?.phone || "—"}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-brand/10">
                    <span className="text-[10px] font-bold text-text-muted block uppercase">Nationality / الجنسية</span>
                    <strong className="text-gray-900 truncate block mt-0.5">{currentClient?.nationality || "—"}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-brand/10">
                    <span className="text-[10px] font-bold text-text-muted block uppercase">Driver License / الرخصة</span>
                    <strong className="text-gray-900 truncate block mt-0.5">{currentClient?.licenseNumber || currentClient?.driverLicense || "—"}</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-brand/10">
                    <span className="text-[10px] font-bold text-text-muted block uppercase">Passport / ID Number</span>
                    <strong className="text-gray-900 truncate block mt-0.5">{currentClient?.passportNumber || currentClient?.idNumber || "—"}</strong>
                  </div>
                </div>
              </div>

              {/* Switch / Change Client Dropdown Panel */}
              {isChangeClientOpen && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-border space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Select Another Customer from Database:</span>
                    <span className="text-[10px] text-gray-500">{allClients.length} clients registered</span>
                  </div>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearchTerm}
                      onChange={(e) => setClientSearchTerm(e.target.value)}
                      placeholder="Search by client name, phone, license..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar">
                    {allClients
                      .filter(c => {
                        if (!clientSearchTerm.trim()) return true;
                        const q = clientSearchTerm.toLowerCase();
                        return (c.name || "").toLowerCase().includes(q) || (c.phone || "").toLowerCase().includes(q);
                      })
                      .slice(0, 10)
                      .map(c => (
                        <div
                          key={c._id}
                          onClick={() => {
                            setCurrentClient(c);
                            setIsChangeClientOpen(false);
                            toast.success(`Switched to client "${c.name}"`);
                          }}
                          className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                            currentClient?._id === c._id ? "bg-brand text-white font-bold" : "bg-white hover:bg-gray-100 text-gray-800"
                          }`}
                        >
                          <span className="truncate">{c.name} ({c.phone || "No phone"})</span>
                          <span className="text-[10px] opacity-75">{c.nationality || ""}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ================= SECOND DRIVER SECTION ================= */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                      Authorized Second Driver (السائق الثاني المصرح له)
                    </h4>
                    <p className="text-[11px] text-text-muted mt-0.5">Allow additional authorized person to drive under contract insurance</p>
                  </div>
                  {!secondDriver && (
                    <button
                      type="button"
                      onClick={() => setIsSelectSecondDriverOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <UserPlus size={14} />
                      <span>+ Add Second Driver</span>
                    </button>
                  )}
                </div>

                {secondDriver ? (
                  <div className="bg-red-50/60 border border-red-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center text-sm">
                          {secondDriver.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                            Authorized 2nd Driver • مصرح له
                          </span>
                          <strong className="text-sm font-bold text-gray-900 block">{secondDriver.name}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsSelectSecondDriverOpen(true)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSecondDriver}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100/80 rounded-lg transition-colors cursor-pointer"
                          title="Remove second driver"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-red-100">
                        <span className="text-[10px] font-medium text-gray-500 block">Phone</span>
                        <strong className="text-gray-900 truncate block">{secondDriver.phone || "—"}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-red-100">
                        <span className="text-[10px] font-medium text-gray-500 block">License No</span>
                        <strong className="text-gray-900 truncate block font-mono">{secondDriver.licenseNumber || "—"}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-red-100">
                        <span className="text-[10px] font-medium text-gray-500 block">Nationality</span>
                        <strong className="text-gray-900 truncate block">{secondDriver.nationality || "—"}</strong>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-red-100">
                        <span className="text-[10px] font-medium text-gray-500 block">License Expiry</span>
                        <strong className="text-gray-900 truncate block">{secondDriver.licenseExpiry || "—"}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => setIsSelectSecondDriverOpen(true)}
                    className="p-4 border-2 border-dashed border-gray-200 hover:border-red-300 rounded-2xl text-center bg-gray-50/50 hover:bg-red-50/30 cursor-pointer transition-all"
                  >
                    <User size={24} className="text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-gray-700">No Second Driver Added</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Click to search client list or scan new second driver ID</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 3: PAYMENT & TERMS ================= */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Step 3: Financial Settlement &amp; Payment (الدفع والتأمين)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Select payment methods (Cash, Card, Crypto, or 2/3 Split), and confirm security deposit collection.
                  </p>
                </div>
                <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
                  Step 3 of 5
                </span>
              </div>

              {/* Total Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-500 block uppercase">Rental Amount Due</span>
                  <strong className="text-lg font-black text-gray-900">${contract.totalAmount || 0}</strong>
                  <span className="text-[10px] text-gray-400 block mt-0.5">For {contract.totalDays || 1} rental days</span>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 block uppercase">Security Deposit</span>
                  <strong className="text-lg font-black text-amber-950">${depositAmount}</strong>
                  <span className="text-[10px] text-amber-700/80 block mt-0.5">Refundable guarantee</span>
                </div>
                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 block uppercase">Total to Collect</span>
                  <strong className="text-lg font-black text-emerald-950">
                    ${(Number(collectedRentalAmount) || 0) + (Number(depositAmount) || 0)}
                  </strong>
                  <span className="text-[10px] text-emerald-700/80 block mt-0.5">Rental + Security Deposit</span>
                </div>
              </div>

              {/* Payment Method Selector (Direct Admin Component with Single + Split 2/3 modes) */}
              <div className="bg-gray-50/70 p-4 rounded-2xl border border-border">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val)}
                  totalAmount={Number(contract.totalAmount) || 0}
                  totalLabel="Rental Amount Due"
                  label="Rental Payment Method (طريقة دفع الإيجار)"
                />
              </div>

              {/* Collected Rental Amount Input */}
              <div className="bg-gray-50/70 p-4 rounded-xl border border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Rental Collection (AED)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={collectedRentalAmount === 0 ? "" : collectedRentalAmount}
                      readOnly
                      disabled
                      placeholder="0"
                      className="w-full p-2.5 rounded-xl border border-border bg-gray-100/90 text-text-primary text-sm font-bold cursor-not-allowed outline-none select-none"
                    />
                  </div>
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    Fixed by Admin (non-editable)
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-text-primary block mb-1">
                    Security Deposit (AED)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={depositAmount === 0 ? "" : depositAmount}
                      readOnly
                      disabled
                      placeholder="0"
                      className="w-full p-2.5 rounded-xl border border-border bg-gray-100/90 text-text-primary text-sm font-bold cursor-not-allowed outline-none select-none"
                    />
                  </div>
                  <span className="text-[10px] text-text-muted mt-0.5 block">
                    Fixed by Admin (non-editable)
                  </span>
                </div>
              </div>

              {/* Deposit Confirmation Checkbox */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                isDepositConfirmed
                  ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                  : "bg-amber-50 border-amber-300 text-amber-950"
              }`}>
                <input
                  type="checkbox"
                  checked={isDepositConfirmed}
                  onChange={(e) => setIsDepositConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-brand focus:ring-brand cursor-pointer"
                />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold block">
                    Confirm Get All Money (تأكيد استلام كامل المبلغ)
                  </span>
                  <span className="text-[11px] opacity-90">
                    I confirm receiving all required money (Total: <strong>AED {(Number(collectedRentalAmount || 0) + Number(depositAmount || 0)).toLocaleString()}</strong>) from the client upon vehicle handover.
                  </span>
                </div>
              </label>

              {/* Delivery Notes */}
              <div>
                <label className="text-xs font-bold text-text-primary block mb-1">
                  Handover Notes / Remarks (ملاحظات التسليم)
                </label>
                <textarea
                  rows={2}
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any notes regarding vehicle condition, special agreements, payment details..."
                  className="w-full p-3 rounded-xl border border-border bg-white text-xs outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 4: INSPECTION PHOTOS ================= */}
          {step === 4 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Step 4: Vehicle Inspection Photos (فحص وتصوير السيارة)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Capture or upload photos for the 8 standard angles to protect both company and client.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                    {photoCount}/8 Angles Captured
                  </span>
                  <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full">
                    Step 4 of 5
                  </span>
                </div>
              </div>

              {/* Upload Mode Selector */}
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded-xl">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setUploadMode("camera")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      uploadMode === "camera" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Camera size={14} />
                    <span>Direct Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("gallery")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      uploadMode === "gallery" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <ImageIcon size={14} />
                    <span>Photo Gallery</span>
                  </button>
                </div>
                <span className="text-[10px] text-gray-500 px-2">Click angle card to take photo</span>
              </div>

              {/* 8 Angles Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {VEHICLE_ANGLES.map((angle) => {
                  const hasPhoto = Boolean(previewPhotos[angle] || inspectionPhotos[angle]);
                  const isUploading = uploadingAngle === angle;

                  return (
                    <div
                      key={angle}
                      className={`relative rounded-xl border p-2.5 flex flex-col justify-between min-h-[140px] transition-all ${
                        hasPhoto
                          ? "border-emerald-500 bg-emerald-50/20"
                          : "border-dashed border-gray-300 bg-gray-50/80 hover:border-gray-400 hover:bg-gray-100/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[11px] font-bold text-gray-800 truncate">{angle}</span>
                        {hasPhoto && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                      </div>

                      <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-lg bg-gray-100/80 my-1">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-1">
                            <Loader2 size={20} className="text-brand animate-spin" />
                            <span className="text-[10px] text-gray-500">Uploading...</span>
                          </div>
                        ) : hasPhoto ? (
                          <img
                            src={previewPhotos[angle] || inspectionPhotos[angle]}
                            alt={angle}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <Camera size={24} className="text-gray-300" />
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-gray-200/80 flex items-center justify-between gap-1">
                        <label className="flex-1 text-center py-1 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-2xs">
                          {hasPhoto ? "Retake" : "+ Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            capture={uploadMode === "camera" ? "environment" : undefined}
                            onChange={(e) => handlePhotoUpload(angle, e)}
                            className="hidden"
                          />
                        </label>
                        {hasPhoto && (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(angle)}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                            title="Remove photo"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 5: REVIEW & SIGN ================= */}
          {step === 5 && (
            <div className="space-y-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Step 5: Review &amp; Customer Signature (المراجعة والتوقيع)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">Review terms, capture customer signature, and finalize handover.</p>
                </div>
                <span className="text-xs font-semibold bg-brand/10 text-brand px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
                  Step 5 of 5
                </span>
              </div>

              {/* Review Summary Grid */}
              <div className="bg-gray-50/80 p-4 sm:p-5 rounded-2xl border border-border space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Vehicle */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vehicle</span>
                    <strong className="text-sm font-bold text-gray-900 block truncate">{vehicleName}</strong>
                    <p className="text-[11px] text-gray-500 font-mono">Plate: {plateNumber || "—"} • Fuel: {checkoutFuelLevel}%</p>
                  </div>

                  {/* Customer */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer</span>
                    <strong className="text-sm font-bold text-gray-900 block truncate">
                      {currentClient?.name || contract.customer}
                    </strong>
                    <p className="text-[11px] text-gray-500">{currentClient?.phone || "No phone"}</p>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Terms</span>
                    <strong className="text-sm font-bold text-emerald-700 block truncate">{paymentMethod}</strong>
                    <p className="text-[11px] text-gray-600">
                      Rental: ${collectedRentalAmount} • Deposit: ${depositAmount}
                    </p>
                  </div>
                </div>

                {/* Second Driver (if added) */}
                {secondDriver && (
                  <div className="bg-red-50/80 p-3 rounded-xl border border-red-200 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
                      <div>
                        <span className="text-[10px] font-bold text-red-800 uppercase block">Second Driver</span>
                        <strong className="text-gray-900 font-bold">{secondDriver.name}</strong>
                        <span className="text-gray-500 ml-2 font-mono">{secondDriver.licenseNumber}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                      Authorized
                    </span>
                  </div>
                )}

                {/* Inspection Thumbnail Strip */}
                {photoCount > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 block mb-1.5">
                      Inspection Photos Preview ({photoCount}/8 angles):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                      {VEHICLE_ANGLES.map(angle => {
                        const url = previewPhotos[angle] || inspectionPhotos[angle];
                        if (!url) return null;
                        return (
                          <div key={angle} className="relative shrink-0 text-center">
                            <img src={url} alt={angle} className="w-16 h-12 object-cover rounded-lg border border-gray-200 shadow-2xs" />
                            <span className="text-[8px] text-gray-500 truncate max-w-[64px] block mt-0.5">{angle.split(" ")[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Signature Canvas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <PenTool size={14} className="text-brand" />
                    <span>Customer Signature (توقيع العميل المستأجر)</span>
                  </label>
                  {signatureData && (
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={12} /> Clear Signature
                    </button>
                  )}
                </div>

                <div className="relative border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50/50 overflow-hidden shadow-inner touch-none">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 sm:h-44 cursor-crosshair bg-white block"
                  />
                  {!signatureData && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-gray-400 space-y-1">
                      <PenTool size={24} className="opacity-40" />
                      <span className="text-xs font-medium">Please draw customer signature here (finger or stylus)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border flex items-center justify-between gap-3 shrink-0 bg-gray-50/90">
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-gray-100 text-xs font-bold text-gray-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <ChevronLeft size={16} />
            <span>{step === 1 ? "Cancel" : "Back"}</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Confirming Handover...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm Handover &amp; Complete Delivery</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Client Modal (allows driver to fix any typos or mistakes in client data) */}
      <CreateClientModal
        isOpen={isEditClientModalOpen}
        onClose={() => setIsEditClientModalOpen(false)}
        clientToEdit={currentClient}
        onSuccess={(updatedClient) => {
          setIsEditClientModalOpen(false);
          if (updatedClient) {
            setCurrentClient(updatedClient);
            toast.success(`Client "${updatedClient.name}" updated successfully! ✓`);
          }
          fetchClientsList();
        }}
      />

      {/* Select Second Driver Modal */}
      <SelectSecondDriverModal
        isOpen={isSelectSecondDriverOpen}
        onClose={() => setIsSelectSecondDriverOpen(false)}
        clients={allClients}
        primaryClientId={currentClient?._id || currentClient?.id}
        onSelectSecondDriver={handleSelectSecondDriver}
        onOpenCreateClientModal={() => {
          setIsSelectSecondDriverOpen(false);
          setIsCreatingSecondDriverClient(true);
        }}
      />

      {/* Create New Client for Second Driver */}
      <CreateClientModal
        isOpen={isCreatingSecondDriverClient}
        onClose={() => setIsCreatingSecondDriverClient(false)}
        onSuccess={(newClient) => {
          setIsCreatingSecondDriverClient(false);
          fetchClientsList();
          if (newClient) {
            handleSelectSecondDriver(newClient);
          }
        }}
      />
    </div>
  );
}
