"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  X,
  Clock,
  DollarSign,
  User,
  UserPlus,
  MapPin,
  Phone,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Camera,
  FileText,
  PenTool,
  Navigation,
  Edit,
  ArrowLeftRight,
  Maximize2,
  Gauge,
  UserCheck,
  Fuel,
  Calendar,
  CalendarPlus,
  Banknote,
  CreditCard,
  Coins,
  Download,
  Building2,
  XCircle,
  ShieldCheck
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import ExtendRentalModal from "@/components/modals/ExtendRentalModal";

const VEHICLE_ANGLES = [
  "Front View",
  "Rear View",
  "Left Side",
  "Right Side",
  "Dashboard / Mileage",
  "Front Interior",
  "Rear Interior",
  "Trunk / Boot"
];

const matchDriverId = (field: any, targetId?: string): boolean => {
  if (!field || !targetId) return false;
  if (typeof field === "object") {
    const id = field._id?.toString() || field.id?.toString() || "";
    return id === targetId;
  }
  return String(field) === String(targetId);
};

const formatTimeDisplay = (rawTime?: string): string => {
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

interface ContractDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any;
  onEdit?: (contract: any) => void;
}

export default function ContractDetailsModal({
  isOpen,
  onClose,
  contract,
  onEdit,
}: ContractDetailsModalProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const isDriver = (session?.user as any)?.role === "driver";

  const [activeTab, setActiveTab] = useState<"handoff" | "return">("handoff");
  const [contractData, setContractData] = useState<any>(contract);
  const [damages, setDamages] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the top of the modal when activeTab changes or modal opens
  useEffect(() => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
    if (overlayContainerRef.current) {
      overlayContainerRef.current.scrollTop = 0;
    }
  }, [activeTab, isOpen]);

  const refreshContractData = () => {
    const contractId = contractData._id || contractData.id || contract?._id || contract?.id;
    if (contractId) {
      fetch(`/api/contracts/${contractId}`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((fresh) => {
          if (fresh) {
            setContractData((prev: any) => ({
              ...prev,
              ...fresh,
              customer: fresh.clientId?.name || prev.customer,
              customerPhone: fresh.clientId?.phone || prev.customerPhone,
              customerEmail: fresh.clientId?.email || prev.customerEmail,
              customerLicense: fresh.clientId?.driverLicense || fresh.clientId?.idNumber || prev.customerLicense,
              deliveryDriver: fresh.deliveryDriverId?.name || (fresh.driverId && !fresh.returnDriverId ? fresh.driverId.name : prev.deliveryDriver),
              returnDriver: fresh.returnDriverId?.name || prev.returnDriver,
              vehicle: fresh.unitId ? `${fresh.unitId.make} ${fresh.unitId.model} (${fresh.unitId.plate})` : prev.vehicle,
              vehiclePlate: fresh.unitId?.plate || prev.vehiclePlate,
              vehicleColor: fresh.unitId?.color || prev.vehicleColor,
              vehicleYear: fresh.unitId?.year || prev.vehicleYear,
              vehicleFuel: fresh.unitId?.fuelType || prev.vehicleFuel,
            }));
            onEdit?.(fresh);
          }
        })
        .catch((err) => console.error("Error refreshing contract details:", err));
    }
  };

  useEffect(() => {
    if (contract) {
      setContractData(contract);
      const contractId = contract._id || contract.id;
      if (contractId) {
        fetch(`/api/contracts/${contractId}`, { cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((fresh) => {
            if (fresh) {
              setContractData((prev: any) => ({
                ...prev,
                ...fresh,
                customer: fresh.clientId?.name || prev.customer,
                customerPhone: fresh.clientId?.phone || prev.customerPhone,
                customerEmail: fresh.clientId?.email || prev.customerEmail,
                customerLicense: fresh.clientId?.driverLicense || fresh.clientId?.idNumber || prev.customerLicense,
                deliveryDriver: fresh.deliveryDriverId?.name || (fresh.driverId && !fresh.returnDriverId ? fresh.driverId.name : prev.deliveryDriver),
                returnDriver: fresh.returnDriverId?.name || prev.returnDriver,
                vehicle: fresh.unitId ? `${fresh.unitId.make} ${fresh.unitId.model} (${fresh.unitId.plate})` : prev.vehicle,
                vehiclePlate: fresh.unitId?.plate || prev.vehiclePlate,
                vehicleColor: fresh.unitId?.color || prev.vehicleColor,
                vehicleYear: fresh.unitId?.year || prev.vehicleYear,
                vehicleFuel: fresh.unitId?.fuelType || prev.vehicleFuel,
              }));
            }
          })
          .catch((err) => console.error("Error fetching full contract details:", err));

        fetch("/api/damages", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setDamages(
                data.filter((d) => {
                  const cId = d.contractId && typeof d.contractId === "object" ? d.contractId._id : d.contractId;
                  return cId && String(cId) === String(contractId);
                })
              );
            }
          })
          .catch((err) => console.error("Error fetching damages:", err));
      }
    }
  }, [contract, isOpen]);

  const isReturned = contractData ? (contractData.status === "Completed" || contractData.deliveryStatus === "Returned") : false;
  const hasReturnData = Boolean(
    isReturned || 
    contractData?.returnedAt || 
    (contractData?.returnPhotos && contractData.returnPhotos.length > 0) ||
    (contractData?.returnMoneyPhotos && contractData.returnMoneyPhotos.length > 0) ||
    (contractData?.damagePhotos && contractData.damagePhotos.length > 0) ||
    contractData?.returnOdometer ||
    contractData?.newDamages ||
    damages.length > 0
  );
  const showReturnTab = hasReturnData;

  useEffect(() => {
    if (!showReturnTab && activeTab === "return") {
      setActiveTab("handoff");
    }
  }, [showReturnTab, activeTab]);

  if (!isOpen || !contractData) return null;

  const contractNum = contractData.contractNumber ? String(contractData.contractNumber) : "Pending";
  const vehicleName = contractData.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
  const plateNumber = contractData.vehiclePlate || "";
  const customerName = contractData.customer || "Customer";
  const pickupLoc = contractData.pickupLocation || "Main Office";
  const dropoffLoc = contractData.dropoffLocation || contractData.pickupLocation || "Main Office";

  // Pre-handover rental terms & financial calculations
  const totalDays = contractData.totalDays || (contractData.startDate && contractData.endDate 
    ? Math.max(1, Math.ceil((new Date(contractData.endDate).getTime() - new Date(contractData.startDate).getTime()) / (1000 * 3600 * 24)))
    : 1);
  const dailyRate = Number(contractData.dailyRate) || 0;
  const totalAmount = Number(contractData.totalAmount || contractData.collectionAmount || (dailyRate * totalDays)) || 0;
  const advancePaid = Number(contractData.advancePayment) || 0;
  const balanceDue = Math.max(0, totalAmount - advancePaid);
  const depositAmount = Number(contractData.depositAmount) || 0;

  // Real status resolution
  const isCancelled = contractData.status === "Cancelled";
  const isCompletedOrReturned = Boolean(
    contractData.status === "Completed" || 
    contractData.deliveryStatus === "Returned" || 
    Boolean(contractData.returnedAt)
  );

  // A contract is strictly handed over ONLY when:
  // 1. It is already marked as Returned or Completed
  // 2. OR deliveryStatus is explicitly "Delivered"
  // 3. OR it has a confirmed delivery/handover timestamp (deliveredAt or handoverCompletedAt)
  // 4. OR status is "Active" and deliveryStatus is neither "Pending" nor "Draft"
  // If deliveryStatus is "Pending" or status is "Draft", the vehicle is strictly awaiting handover.
  const isHandedOver = Boolean(
    !isCancelled &&
    contractData.deliveryStatus !== "Pending" &&
    (
      isCompletedOrReturned ||
      contractData.deliveryStatus === "Delivered" ||
      Boolean(contractData.deliveredAt || contractData.handoverCompletedAt) ||
      (contractData.status === "Active" && contractData.deliveryStatus !== "Draft")
    )
  );

  const isDelivered = isHandedOver;

  const isDriverDelivery = Boolean(
    contractData.contractType === "Delivery" || 
    (contractData.deliveryDriver && 
     contractData.deliveryDriver !== "None" && 
     !contractData.deliveryDriver.toLowerCase().includes("self-drive")) ||
    (contractData.deliveryDriverId && contractData.deliveryDriverId !== "None")
  );

  const isDriverReturn = Boolean(
    (contractData.returnDriver && 
     contractData.returnDriver !== "None" && 
     !contractData.returnDriver.toLowerCase().includes("self-drive")) ||
    (contractData.returnDriverId && contractData.returnDriverId !== "None")
  );

  const openGoogleMaps = (location: string) => {
    if (!location) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    window.open(url, "_blank");
  };

  const formatDisplayDate = (d: any) => {
    if (!d) return "—";
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return String(d);
      return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return String(d);
    }
  };

  // Handover (Admin instructions vs Driver delivery note) & Return notes separator
  const parseHandoverNotes = (rawNotes?: string) => {
    if (!rawNotes) return { adminNotes: "", driverNotes: "" };
    let handoverPart = rawNotes;
    const splitIndex = handoverPart.indexOf("[Return Pickup Notes:");
    if (splitIndex !== -1) {
      handoverPart = handoverPart.substring(0, splitIndex).trim();
    }
    
    const markerWithPipe = "| Delivery note:";
    const idxPipe = handoverPart.indexOf(markerWithPipe);
    if (idxPipe !== -1) {
      return {
        adminNotes: handoverPart.substring(0, idxPipe).trim(),
        driverNotes: handoverPart.substring(idxPipe + markerWithPipe.length).trim()
      };
    }

    const markerPlain = "Delivery note:";
    const idxPlain = handoverPart.indexOf(markerPlain);
    if (idxPlain !== -1) {
      return {
        adminNotes: handoverPart.substring(0, idxPlain).trim(),
        driverNotes: handoverPart.substring(idxPlain + markerPlain.length).trim()
      };
    }

    return {
      adminNotes: handoverPart.trim(),
      driverNotes: ""
    };
  };

  const getReturnNotes = (rawNotes?: string, dedicatedReturnNotes?: string) => {
    if (dedicatedReturnNotes) return dedicatedReturnNotes.trim();
    if (!rawNotes) return "";
    const marker = "[Return Pickup Notes:";
    const splitIndex = rawNotes.indexOf(marker);
    if (splitIndex !== -1) {
      const remaining = rawNotes.substring(splitIndex + marker.length);
      const closeIdx = remaining.indexOf("]");
      return closeIdx !== -1 ? remaining.substring(0, closeIdx).trim() : remaining.trim();
    }
    return "";
  };

  const { adminNotes, driverNotes } = parseHandoverNotes(contractData.notes);
  const returnNotes = getReturnNotes(contractData.notes, contractData.returnNotes);
  const inspectionPhotos: string[] = Array.isArray(contractData.inspectionPhotos) ? contractData.inspectionPhotos : [];
  const returnPhotos: string[] = Array.isArray(contractData.returnPhotos) ? contractData.returnPhotos : [];
  const moneyPhotos: string[] = Array.isArray(contractData.moneyPhotos) ? contractData.moneyPhotos : [];
  const returnMoneyPhotos: string[] = Array.isArray(contractData.returnMoneyPhotos) ? contractData.returnMoneyPhotos : [];
  const damagePhotos: string[] = Array.from(new Set([
    ...(Array.isArray(contractData.damagePhotos) ? contractData.damagePhotos : []),
    ...damages.flatMap((d: any) => Array.isArray(d.photos) ? d.photos : [])
  ])).filter(Boolean);

  return (
    <div 
      ref={overlayContainerRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-1 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
    >
      <div className="bg-card w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[96dvh] sm:max-h-[90vh] my-auto border border-border/60">
        
        {/* ================= HEADER ================= */}
        <div className="px-3 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-gray-50/80 gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-text-primary truncate">
              Booking &amp; Handover Details
            </h2>
            <span className="text-[11px] sm:text-xs md:text-sm font-sans font-extrabold tracking-tight tabular-nums bg-brand/10 text-brand px-2 py-0.5 sm:px-2.5 rounded-md border border-brand/20 shadow-2xs shrink-0">
              {contractNum === "Pending" ? "Pending" : (contractNum.startsWith("#") ? contractNum : `#${contractNum}`)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 min-w-[34px] min-h-[34px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-200 active:scale-95 rounded-xl transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= FIXED TAB SWITCHER (ONLY SHOWN IF RETURN EXISTS) ================= */}
        {showReturnTab && (
          <div className="px-3 py-2 sm:px-6 sm:py-2.5 border-b border-border/80 bg-white shrink-0">
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center gap-1 text-[11px] sm:text-xs font-semibold border border-border/40 shadow-2xs w-full max-w-md">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("handoff");
                  if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                  if (overlayContainerRef.current) overlayContainerRef.current.scrollTop = 0;
                }}
                className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "handoff"
                    ? "bg-white text-brand shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <CheckCircle2 size={13} className={activeTab === "handoff" ? "text-emerald-600 shrink-0" : "text-text-muted shrink-0"} />
                <span className="truncate">Hand-off (Delivery)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("return");
                  if (contentContainerRef.current) contentContainerRef.current.scrollTop = 0;
                  if (overlayContainerRef.current) overlayContainerRef.current.scrollTop = 0;
                }}
                className={`flex-1 py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "return"
                    ? "bg-white text-red-600 shadow-xs font-bold ring-1 ring-red-100"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <ArrowLeftRight size={13} className={activeTab === "return" ? "text-red-600 shrink-0" : "text-text-muted shrink-0"} />
                <span className="truncate">Return Pickup</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= CONTENT AREA ================= */}
        <div 
          ref={contentContainerRef}
          className="p-2.5 sm:p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain space-y-3 sm:space-y-4 md:space-y-5"
        >

          {/* ================= TAB 1: HAND-OFF (DELIVERY TO CLIENT) ================= */}
          {activeTab === "handoff" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in-up">

              {/* Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-text-primary">
                    {isHandedOver 
                      ? (isDriverDelivery ? "Vehicle Delivery & Handover Report" : "Showroom Vehicle Handover Report")
                      : (isDriverDelivery ? "Booking & Delivery Handover Details" : "Booking & Showroom Handover Details")}
                  </h3>
                  <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary mt-0.5">
                    {isHandedOver
                      ? "Completed vehicle inspection report, odometer, fuel, and proof of receipt."
                      : "Confirmed rental agreement details, schedule, pricing terms, and pending handover."}
                  </p>
                </div>
                <span className={`text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto shrink-0 flex items-center gap-1.5 shadow-2xs ${
                  isCancelled
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : isCompletedOrReturned
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isHandedOver 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isCancelled ? (
                    <>
                      <XCircle size={13} className="text-rose-600 shrink-0" />
                      <span>Cancelled</span>
                    </>
                  ) : isCompletedOrReturned ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>{isDriverDelivery ? "Delivered • Returned" : "Handed Over • Returned"}</span>
                    </>
                  ) : isHandedOver ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>{isDriverDelivery ? "Delivered" : "Handed Over"}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} className="text-amber-600 animate-pulse shrink-0" />
                      <span>Pending Handover (معلق)</span>
                    </>
                  )}
                </span>
              </div>

              {/* ================= AWAITING HANDOVER BANNER (SHOWN WHEN NOT HANDED OVER) ================= */}
              {!isHandedOver && !isCancelled && (
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                      <Clock size={18} className="animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex flex-wrap items-center gap-1.5">
                        <span>Awaiting Vehicle Handover</span>
                        <span className="text-[10px] sm:text-[11px] font-normal text-amber-800" dir="rtl">(بانتظار تسليم وفحص السيارة)</span>
                      </h4>
                      <p className="text-[10px] sm:text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                        {isDriverDelivery 
                          ? `Assigned to driver (${contractData.deliveryDriver || "Driver"}). Handover photos, odometer, fuel, and client signature will be documented upon delivery.`
                          : `Scheduled for in-shop handover on ${formatDisplayDate(contractData.startDate)} at ${contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "08:00 AM"}. Inspection and signature will be completed when handing the keys to the client.`}
                      </p>
                    </div>
                  </div>
                  {!isDriver && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.location.href = `/bookings/handover?contractId=${contractData._id || contractData.id}`;
                      }}
                      className="w-full sm:w-auto px-3.5 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                    >
                      <CheckCircle2 size={14} className="shrink-0" />
                      <span>Confirm Handover (تسليم السيارة)</span>
                    </button>
                  )}
                </div>
              )}

              {/* ================= CORE RENTAL & PRICING TERMS (CREATED BEFORE HANDOVER) ================= */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-3 sm:p-5 space-y-3 sm:space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-border/70 gap-2">
                  <span className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5 min-w-0">
                    <Calendar size={14} className="text-brand shrink-0" />
                    <span className="truncate">Rental Terms &amp; Pricing</span>
                    <span className="text-[10px] text-text-muted font-normal hidden xs:inline" dir="rtl">(مدة وقيمة الاستئجار)</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20 shrink-0">
                    {totalDays} {totalDays === 1 ? "Day" : "Days"} ({contractData.rentalType || (totalDays >= 30 ? "Monthly" : "Daily")})
                  </span>
                </div>

                {/* 4-Column Grid for Dates & Duration */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 text-xs">
                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-border/60">
                    <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Start Date (تاريخ البدء)</span>
                    <strong className="text-text-primary font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      {formatDisplayDate(contractData.startDate)}
                    </strong>
                    <span className="text-[10px] text-brand font-semibold block mt-0.5 truncate">
                      {contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "08:00 AM"}
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-border/60">
                    <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Expected End Date</span>
                    <strong className="text-text-primary font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      {formatDisplayDate(contractData.endDate)}
                    </strong>
                    <span className="text-[10px] text-text-muted font-medium block mt-0.5">
                      Scheduled End
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-border/60">
                    <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Daily Rate (اليومي)</span>
                    <strong className="text-text-primary font-bold block mt-0.5 text-xs sm:text-sm truncate">
                      AED {dailyRate} / day
                    </strong>
                    <span className="text-[10px] text-text-muted font-medium block mt-0.5">
                      Base Rate
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-border/60">
                    <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Total Amount (الإجمالي)</span>
                    <strong className="text-text-primary font-black text-xs sm:text-sm block mt-0.5 truncate">
                      AED {totalAmount}
                    </strong>
                    <span className="text-[10px] text-text-muted font-medium block mt-0.5 truncate">
                      AED {dailyRate} × {totalDays}d
                    </span>
                  </div>
                </div>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 text-xs pt-1">
                  <div className="p-2 sm:p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 block truncate">Advance Paid (العربون):</span>
                      <strong className="text-emerald-700 font-bold text-xs sm:text-sm block">
                        AED {advancePaid}
                      </strong>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      {advancePaid > 0 ? "Prepaid" : "None"}
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-brand/5 border border-brand/20 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-brand block truncate">Balance Due (المستحق):</span>
                      <strong className="text-brand font-black text-xs sm:text-sm block">
                        AED {balanceDue}
                      </strong>
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      contractData.paymentStatus === "Paid" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : "bg-amber-100 text-amber-800"
                    }`}>
                      {contractData.paymentStatus || "Pending"}
                    </span>
                  </div>

                  <div className="p-2 sm:p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-amber-900 block truncate">Security Deposit (التأمين):</span>
                      <strong className="text-amber-800 font-bold text-xs sm:text-sm block">
                        AED {depositAmount}
                      </strong>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 shrink-0">
                      {isHandedOver ? "Collected" : "Required"}
                    </span>
                  </div>
                </div>

                {/* Additional services / extras if present */}
                {(Number(contractData.babySeatFees || 0) > 0 || Number(contractData.deliveryCharges || 0) > 0 || Number(contractData.tintingFees || 0) > 0) && (
                  <div className="p-2 sm:p-2.5 bg-gray-50 rounded-xl border border-border/60 flex items-center gap-2 sm:gap-4 text-[11px] sm:text-xs text-text-secondary flex-wrap">
                    <span className="font-bold text-text-primary text-[10px] sm:text-[11px]">Included Extras:</span>
                    {Number(contractData.babySeatFees || 0) > 0 && (
                      <span className="flex items-center gap-1 font-medium">Baby Seat: <strong>AED {contractData.babySeatFees}</strong></span>
                    )}
                    {Number(contractData.deliveryCharges || 0) > 0 && (
                      <span className="flex items-center gap-1 font-medium">Delivery: <strong>AED {contractData.deliveryCharges}</strong></span>
                    )}
                    {Number(contractData.tintingFees || 0) > 0 && (
                      <span className="flex items-center gap-1 font-medium">Tinting: <strong>AED {contractData.tintingFees}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* ================= SECTION 1: WHAT WAS GIVEN TO THE DRIVER / SHOWROOM ================= */}
              <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl border border-border p-3 sm:p-5 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-brand/10 text-brand text-[11px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm md:text-base font-bold text-text-primary truncate">
                        {isDriverDelivery ? "Dispatched to Driver" : "In-Shop Handover (تسليم في المعرض)"}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-text-muted truncate">
                        {isDriverDelivery 
                          ? "Instructions and logistics assigned to the driver"
                          : "Showroom vehicle handover schedule for client pick up"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border shadow-2xs flex items-center gap-1 shrink-0 ${
                    isDriverDelivery
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}>
                    {isDriverDelivery ? (
                      <>
                        <Navigation size={11} className="text-blue-600 rotate-45 shrink-0" />
                        <span>Delivery</span>
                      </>
                    ) : (
                      <>
                        <Building2 size={11} className="text-emerald-600 shrink-0" />
                        <span>In-Shop</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Driver Assignment & Client Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
                  {/* Driver / In-Shop Logistics */}
                  <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-2 shadow-2xs">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      {isDriverDelivery ? (
                        <>
                          <UserCheck size={14} className="text-brand shrink-0" />
                          <span>Assigned Driver</span>
                        </>
                      ) : (
                        <>
                          <Building2 size={14} className="text-brand shrink-0" />
                          <span>Handover Method</span>
                        </>
                      )}
                    </span>
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted text-[11px]">
                          {isDriverDelivery ? "Driver Name:" : "Handover Type:"}
                        </span>
                        <strong className="text-text-primary font-semibold truncate text-right">
                          {isDriverDelivery 
                            ? (contractData.deliveryDriver || "Assigned Driver")
                            : "In-Shop (Client Pick Up)"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted text-[11px]">Scheduled Date:</span>
                        <strong className="text-text-primary text-right">
                          {formatDisplayDate(contractData.startDate)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-text-muted text-[11px]">Handover Time:</span>
                        <strong className="text-text-primary flex items-center gap-1 font-semibold text-right">
                          <Clock size={12} className="text-brand shrink-0" />
                          {contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "08:00 AM"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-2 shadow-2xs">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <User size={14} className="text-brand shrink-0" />
                      <span>Client Profile</span>
                    </span>
                    <div className="text-xs space-y-1.5 pt-1">
                      {(!contractData.clientId && (!contractData.customer || contractData.customer === "Customer" || contractData.customer === "Unknown")) ? (
                        <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-lg text-xs space-y-1 text-amber-900 mb-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <UserPlus size={13} className="text-amber-600 shrink-0" />
                            <span>Client Registration Upon Handover</span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-amber-700 leading-tight">
                            Client details and driving license will be verified by the driver upon vehicle delivery.
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-muted text-[11px]">Client Name:</span>
                            <strong className="text-text-primary font-semibold truncate max-w-[150px] sm:max-w-[180px] text-right">{customerName}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-muted text-[11px]">Phone:</span>
                            {contractData.customerPhone ? (
                              <a 
                                href={`tel:${contractData.customerPhone.replace(/[^0-9+]/g, '')}`}
                                className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-text-primary hover:underline font-semibold bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded border border-border/80 transition-all"
                                title="Call Client"
                              >
                                <Phone size={11} className="text-emerald-600 shrink-0" />
                                <span className="truncate">{contractData.customerPhone}</span>
                              </a>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-muted text-[11px]">ID / License:</span>
                            <strong className="font-semibold text-text-secondary truncate text-right">
                              {contractData.customerLicense || "—"}
                            </strong>
                          </div>
                        </>
                      )}

                      {contractData.additionalDriverName && (
                        <div className="pt-2 mt-1.5 border-t border-border/60">
                          <span className="text-[9px] sm:text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">
                            Additional Driver (سائق إضافي)
                          </span>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-text-muted text-[11px]">2nd Driver:</span>
                            <strong className="text-text-primary font-semibold truncate max-w-[140px] text-right">{contractData.additionalDriverName}</strong>
                          </div>
                          {contractData.additionalDriverPhone && (
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <span className="text-text-muted text-[11px]">Phone:</span>
                              <span className="font-medium text-text-secondary text-right">{contractData.additionalDriverPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dispatched Vehicle Details */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-2 shadow-2xs">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <ExecutiveCarIcon size={14} className="text-brand shrink-0" />
                    <span>{isDriverDelivery ? "Dispatched Vehicle Details" : "Handover Vehicle Details"}</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 pt-1 text-xs">
                    <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Vehicle &amp; Model</span>
                      <strong className="text-text-primary font-bold truncate block mt-0.5 text-xs sm:text-sm">
                        {vehicleName} {contractData.vehicleYear && `(${contractData.vehicleYear})`}
                      </strong>
                    </div>
                    <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">License Plate</span>
                      <strong className="text-text-primary font-bold block mt-0.5 text-xs sm:text-sm truncate">
                        {plateNumber || "—"}
                      </strong>
                    </div>
                    <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Color &amp; Fuel</span>
                      <strong className="text-text-primary font-medium block truncate mt-0.5 text-xs sm:text-sm">
                        {contractData.vehicleColor || "—"} {contractData.vehicleFuel && `• ${contractData.vehicleFuel}`}
                      </strong>
                    </div>
                    <div className="p-2 sm:p-2.5 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[10px] sm:text-[11px] text-text-muted block truncate">Checkout Mileage</span>
                      <strong className="text-text-primary font-bold flex items-center gap-1 mt-0.5 text-xs sm:text-sm truncate">
                        <Gauge size={12} className="text-brand shrink-0" />
                        <span>{contractData.unitMileage || contractData.checkoutMileage || 0} km</span>
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Location & Deposit Given to Driver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 text-xs">
                  {/* Location with Google Maps */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Handover Location:</span>
                      <strong className="text-text-primary flex items-center gap-1 font-semibold text-xs truncate" title={pickupLoc}>
                        <MapPin size={13} className="text-emerald-600 shrink-0" />
                        <span className="truncate">{pickupLoc}</span>
                      </strong>
                    </div>
                    {pickupLoc && (
                      <button
                        type="button"
                        onClick={() => openGoogleMaps(pickupLoc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-bold border border-emerald-200 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                        title={`Open ${pickupLoc} in Google Maps`}
                      >
                        <Navigation size={10} className="rotate-45 shrink-0" />
                        <span>Maps</span>
                      </button>
                    )}
                  </div>

                  {/* Required Deposit */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Required Deposit:</span>
                      <strong className="text-amber-700 font-bold text-xs sm:text-sm flex items-center gap-1">
                        <DollarSign size={13} className="text-amber-600 shrink-0" />
                        AED {contractData.depositAmount || 0}
                      </strong>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md shrink-0">
                      Required
                    </span>
                  </div>
                </div>

                {/* Advance Prepayment Notice Banner if prepaid */}
                {Number(contractData.advancePayment || 0) > 0 && (
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 text-xs shadow-2xs">
                    <div className="min-w-0">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                        Prepaid Advance / العربون
                      </span>
                      <p className="text-[10px] sm:text-[11px] text-emerald-700 mt-0.5 truncate">
                        Paid upon booking. Balance due: AED {Math.max(0, (Number(contractData.totalAmount) || 0) - Number(contractData.advancePayment))}
                      </p>
                    </div>
                    <span className="text-sm sm:text-base font-black text-emerald-700 shrink-0">
                      AED {contractData.advancePayment}
                    </span>
                  </div>
                )}

                {/* Payment Method & Mileage Terms Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                  {/* Payment Method & Status */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Payment Method:</span>
                      <strong className="text-text-primary font-bold text-xs flex items-center gap-1 truncate">
                        {contractData.paymentMethod?.includes("Crypto") && <Coins size={13} className="text-amber-600 shrink-0" />}
                        {contractData.paymentMethod?.includes("Card") && <CreditCard size={13} className="text-blue-600 shrink-0" />}
                        {contractData.paymentMethod?.includes("Cash") && <Banknote size={13} className="text-emerald-600 shrink-0" />}
                        <span className="truncate">{contractData.paymentMethod || "Cash"}</span>
                      </strong>
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${
                      contractData.paymentStatus === "Paid" 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : contractData.paymentStatus === "Partial"
                        ? "bg-blue-50 text-blue-800 border-blue-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}>
                      {contractData.paymentStatus || "Pending"}
                    </span>
                  </div>

                  {/* Mileage Pricing Terms */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Mileage Policy:</span>
                      <strong className="text-text-primary font-bold text-xs flex items-center gap-1 truncate">
                        <Gauge size={12} className="text-brand shrink-0" />
                        <span className="truncate">{contractData.dailyKmLimit ? `${contractData.dailyKmLimit} km/day` : "Unlimited KM"}</span>
                      </strong>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-text-secondary bg-gray-50 border border-border px-1.5 py-0.5 rounded shrink-0">
                      {contractData.pricePerExtraKm ? `+AED ${contractData.pricePerExtraKm}/km` : "Free"}
                    </span>
                  </div>

                  {/* Initial Checkout Fuel Level */}
                  <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-border/70 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Checkout Fuel:</span>
                      <strong className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                        <Fuel size={12} className="text-emerald-600 shrink-0" />
                        {contractData.checkoutFuelLevel !== undefined ? `${contractData.checkoutFuelLevel}%` : "100%"}
                      </strong>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-text-secondary bg-gray-50 border border-border px-1.5 py-0.5 rounded shrink-0">
                      Odo: {contractData.checkoutMileage !== undefined ? `${contractData.checkoutMileage}` : "0"} km
                    </span>
                  </div>
                </div>

                {/* Admin Handover Instructions / Notes */}
                <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <FileText size={14} className="text-brand shrink-0" />
                    <span>{isDriverDelivery ? "Admin Instructions for Delivery:" : "Admin Handover Remarks & Notes:"}</span>
                  </div>
                  {adminNotes ? (
                    <div className="text-xs text-text-secondary font-medium leading-relaxed whitespace-pre-wrap bg-gray-50/90 p-2 sm:p-2.5 rounded-lg border border-border/50">
                      {adminNotes}
                    </div>
                  ) : (
                    <p className="text-[11px] sm:text-xs text-text-muted italic bg-gray-50/50 p-2 rounded-lg">
                      No specific handover instructions recorded by admin.
                    </p>
                  )}
                </div>

                {/* Admin Signature Card */}
                {(contractData.adminSignature || true) && (
                  <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 min-w-0">
                        <ShieldCheck size={14} className="text-blue-600 shrink-0" />
                        <span className="truncate">Admin Stamp &amp; Signature (ختم الإدارة)</span>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                        <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        <span>Official Seal</span>
                      </span>
                    </div>
                    <div 
                      onClick={() => setPreviewImage(contractData.adminSignature || "/images/admin-signature.png")}
                      className="h-16 sm:h-20 md:h-24 bg-gray-50/60 rounded-xl border border-dashed border-border flex items-center justify-center p-2 cursor-pointer hover:border-brand/60 active:scale-[0.99] transition-all"
                      title="Click to view full stamp & signature"
                    >
                      <img 
                        src={contractData.adminSignature || "/images/admin-signature.png"} 
                        alt="Admin Signature" 
                        className="max-h-full max-w-full object-contain filter drop-shadow-xs" 
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ================= SECTION 2: WHAT DRIVER/SHOWROOM RETURNED UPON DELIVERY (SHOWN ONLY ONCE HANDED OVER) ================= */}
              {isHandedOver && (
              <div className="bg-white rounded-xl sm:rounded-2xl border border-border p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-border/70 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-100 text-emerald-700 text-[11px] sm:text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm md:text-base font-bold text-text-primary truncate">
                        {isDriverDelivery ? "Handover Proof & Driver Report" : "Showroom Handover Proof & Report"}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-text-muted truncate">
                        {isDriverDelivery
                          ? "Driver field remarks, deposit, inspection photos, and client signature"
                          : "Showroom handover remarks, deposit, inspection photos, and client signature"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border shrink-0 ${
                    isCancelled
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : isHandedOver 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-100 text-text-muted border-border'
                  }`}>
                    {isCancelled
                      ? 'Cancelled'
                      : isHandedOver 
                      ? (isDriverDelivery ? 'Completed' : 'Handover Done')
                      : 'Pending'}
                  </span>
                </div>

                {/* Handover Verification Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
                  {/* Handover Confirmation Status */}
                  <div className="p-2.5 sm:p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">
                      {isDriverDelivery ? "Delivery Status:" : "Handover Status:"}
                    </span>
                    <strong className={`font-bold flex items-center gap-1.5 text-xs sm:text-sm truncate ${
                      isCancelled 
                        ? 'text-rose-700' 
                        : isHandedOver 
                        ? 'text-emerald-700' 
                        : 'text-amber-700'
                    }`}>
                      {isCancelled ? (
                        <>
                          <XCircle size={13} className="text-rose-600 shrink-0" />
                          <span>Cancelled</span>
                        </>
                      ) : isHandedOver ? (
                        <>
                          <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                          <span className="truncate">
                            {isCompletedOrReturned
                              ? "Delivered & Returned"
                              : (isDriverDelivery ? "Delivered to Client" : "Handed Over in Showroom")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock size={13} className="text-amber-600 shrink-0" />
                          <span>{isDriverDelivery ? "Awaiting Delivery" : "Pending Handover"}</span>
                        </>
                      )}
                    </strong>
                  </div>

                  {/* Confirmed Handover Time */}
                  <div className="p-2.5 sm:p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Handover Time:</span>
                    <strong className="text-text-primary font-bold flex items-center gap-1.5 text-xs sm:text-sm truncate">
                      <Clock size={13} className="text-brand shrink-0" />
                      {contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "Pending"}
                    </strong>
                  </div>

                  {/* Actual Deposit Collected */}
                  <div className="p-2.5 sm:p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Deposit Collected:</span>
                    <div className="flex items-center justify-between gap-1">
                      <strong className="text-emerald-700 font-black text-xs sm:text-sm">
                        AED {contractData.depositAmount || 0}
                      </strong>
                      <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shrink-0">
                        {isDelivered ? "Collected" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver Delivery Notes / Remarks */}
                <div className="bg-gray-50/70 p-2.5 sm:p-3.5 rounded-xl border border-border/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <FileText size={14} className="text-emerald-700 shrink-0" />
                    <span>Driver Delivery Remarks:</span>
                  </div>
                  {driverNotes ? (
                    <div className="text-xs text-text-secondary font-medium leading-relaxed whitespace-pre-wrap bg-white p-2 sm:p-2.5 rounded-lg border border-border/70">
                      {driverNotes}
                    </div>
                  ) : (
                    <p className="text-[11px] sm:text-xs text-text-muted italic bg-white/60 p-2 rounded-lg border border-border/40">
                      {isDelivered 
                        ? "No additional remarks recorded by driver." 
                        : "Driver remarks will be recorded upon vehicle handover confirmation."}
                    </p>
                  )}
                </div>

                {/* Pre-Delivery Inspection Photos Grid (8 Angles) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 min-w-0">
                      <Camera size={14} className="text-brand shrink-0" />
                      <span className="truncate">Pre-Delivery Inspection Photos</span>
                      <span className="text-[10px] text-text-muted shrink-0">({inspectionPhotos.length}/8)</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-text-muted font-medium shrink-0 hidden xs:inline">
                      Inspection Photos
                    </span>
                  </div>

                  {inspectionPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {inspectionPhotos.map((photoUrl, index) => {
                        const angleLabel = VEHICLE_ANGLES[index] || `Angle #${index + 1}`;
                        return (
                          <div 
                            key={index}
                            onClick={() => setPreviewImage(photoUrl)}
                            className="relative h-[110px] sm:h-[135px] md:h-[155px] w-full rounded-xl border border-border overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer active:scale-95 transition-transform"
                            title={`${angleLabel} - Click to enlarge`}
                          >
                            <img 
                              src={photoUrl} 
                              alt={angleLabel} 
                              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Maximize2 size={16} />
                            </div>
                            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between pointer-events-none">
                              <span className="bg-black/75 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[78%]">
                                {angleLabel}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-bold text-white/80 bg-black/60 px-1 py-0.5 rounded shrink-0">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50/80 p-3 sm:p-4 rounded-xl border border-border/70 flex items-center gap-2 text-xs text-text-muted">
                      <Camera size={14} className="text-text-muted shrink-0" />
                      <span>{isHandedOver ? "No inspection photos attached for this contract." : (isDriverDelivery ? "Awaiting driver inspection photos upon vehicle delivery." : "Awaiting showroom inspection photos upon vehicle handover.")}</span>
                    </div>
                  )}
                </div>

                {/* Customer Digital Signature Card */}
                <div className="pt-1">
                  {contractData.customerSignature ? (
                    <div className="bg-gray-50/70 p-2.5 sm:p-3.5 rounded-xl border border-border/70 space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 min-w-0">
                          <PenTool size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">Customer Digital Signature</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                          <span>Verified Signature</span>
                        </span>
                      </div>
                      <div 
                        onClick={() => setPreviewImage(contractData.customerSignature)}
                        className="h-20 sm:h-24 md:h-28 bg-white rounded-xl border border-dashed border-border flex items-center justify-center p-2 cursor-pointer hover:border-brand/60 active:scale-[0.99] transition-all shadow-2xs"
                        title="Click to enlarge signature"
                      >
                        <img 
                          src={contractData.customerSignature} 
                          alt="Customer Signature" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>
                      {contractData.signatureMetadata?.signedAt && (
                        <div className="text-[10px] sm:text-[11px] text-text-muted flex items-center gap-1.5 pt-0.5">
                          <Clock size={11} className="shrink-0" />
                          <span>Signed: {new Date(contractData.signatureMetadata.signedAt).toLocaleDateString()} {new Date(contractData.signatureMetadata.signedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 sm:p-3.5 bg-gray-50/80 rounded-xl border border-border/70 flex items-center gap-2 text-xs text-text-muted">
                      <PenTool size={14} className="text-text-muted shrink-0" />
                      <span>{isDelivered ? "No digital signature recorded for this contract." : "Awaiting customer signature on handover."}</span>
                    </div>
                  )}
                </div>

                {/* Handover Cash & Payment Proof Photos */}
                {moneyPhotos.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 min-w-0">
                        <DollarSign size={14} className="text-emerald-600 shrink-0" />
                        <span className="truncate">Handover Cash &amp; Payment Proof</span>
                        <span className="text-[10px] text-emerald-800 shrink-0">({moneyPhotos.length})</span>
                      </span>
                      <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium shrink-0 hidden xs:inline">Rental Collection</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                      {moneyPhotos.map((photoUrl, index) => (
                        <div 
                          key={index}
                          onClick={() => setPreviewImage(photoUrl)}
                          className="relative h-[110px] sm:h-[135px] md:h-[155px] w-full rounded-xl sm:rounded-2xl border border-emerald-100 overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer active:scale-95 transition-transform"
                          title="Click to enlarge"
                        >
                          <img src={photoUrl} alt={`Handover Cash Photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 size={16} />
                          </div>
                          <div className="absolute bottom-1.5 left-1.5 bg-emerald-950/80 text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-900/50">
                            Cash Proof #{index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
              )}

            </div>
          )}

          {/* ================= TAB 2: RETURN PICKUP (FROM CLIENT) ================= */}
          {activeTab === "return" && (
            <div className="space-y-3 sm:space-y-4 md:space-y-5 animate-fade-in-up">

              {/* Title Section */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base md:text-lg font-bold text-red-950 flex items-center gap-1.5 truncate">
                    <ArrowLeftRight size={16} className="text-red-600 shrink-0" />
                    <span>Return Pickup Details</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary mt-0.5 truncate">
                    Return location, driver, odometer reading, fuel level, and damages inspection.
                  </p>
                </div>
                <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border shrink-0 ${isReturned ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-50/70 text-red-600 border-red-200'}`}>
                  {isReturned ? "Returned" : "Pending Return"}
                </span>
              </div>

              {/* Return Logistics Snapshot Card */}
              <div className="bg-red-50/25 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-red-100/90 space-y-3 sm:space-y-4 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 text-xs">
                  {/* Return Location */}
                  <div>
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Return Location:</span>
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-semibold text-text-primary flex items-center gap-1 truncate text-xs" title={dropoffLoc}>
                        <MapPin size={13} className="text-red-600 shrink-0" />
                        <span className="truncate">{dropoffLoc}</span>
                      </span>
                      {dropoffLoc && (
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(dropoffLoc)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-all cursor-pointer shrink-0 active:scale-95"
                          title={`Open ${dropoffLoc} in Google Maps`}
                        >
                          <Navigation size={9} className="rotate-45 shrink-0" />
                          <span>Maps</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Return Time */}
                  <div>
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">Scheduled Return Time:</span>
                    <span className="font-semibold text-text-primary flex items-center gap-1 text-xs">
                      <Clock size={13} className="text-red-600 shrink-0" />
                      <span>{contractData.checkinTime ? formatTimeDisplay(contractData.checkinTime) : "10:00 AM"}</span>
                    </span>
                  </div>

                  {/* Return Driver */}
                  <div>
                    <span className="text-text-muted block text-[10px] sm:text-[11px] mb-0.5">
                      {isDriverReturn ? "Return Driver:" : "Return Method:"}
                    </span>
                    <span className="font-semibold text-text-primary flex items-center gap-1 text-xs truncate">
                      {isDriverReturn ? (
                        <>
                          <UserCheck size={13} className="text-red-600 shrink-0" />
                          <span className="truncate">{contractData.returnDriver}</span>
                        </>
                      ) : (
                        <>
                          <Building2 size={13} className="text-red-600 shrink-0" />
                          <span className="truncate">In-Shop Return</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Return Mileage & Fuel Split Row */}
                <div className="pt-2 sm:pt-3 border-t border-red-100 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs">
                  <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-red-100 flex items-center justify-between shadow-2xs">
                    <span className="text-text-secondary flex items-center gap-1.5 font-medium text-xs">
                      <Gauge size={13} className="text-red-600 shrink-0" />
                      <span>Return Odometer:</span>
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-text-primary">
                      {contractData.returnOdometer ? `${contractData.returnOdometer} km` : "Pending Return"}
                    </strong>
                  </div>

                  <div className="p-2.5 sm:p-3 bg-white rounded-xl border border-red-100 flex items-center justify-between shadow-2xs">
                    <span className="text-text-secondary flex items-center gap-1.5 font-medium text-xs">
                      <Fuel size={13} className="text-red-600 shrink-0" />
                      <span>Fuel Level:</span>
                    </span>
                    <strong className="text-xs sm:text-sm font-bold text-text-primary">
                      {contractData.returnFuelLevel !== undefined ? `${contractData.returnFuelLevel}%` : "Not checked"}
                    </strong>
                  </div>
                </div>

                {/* Rest of Money Collected by Driver */}
                {contractData.returnAmountCollected !== undefined && contractData.returnAmountCollected > 0 && (
                  <div className="pt-2 sm:pt-3 border-t border-red-100">
                    <div className="p-2.5 sm:p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs text-xs">
                      <span className="text-emerald-900 flex items-center gap-1.5 font-bold truncate">
                        <DollarSign size={14} className="text-emerald-600 shrink-0" />
                        <span className="truncate">Rest Collected by Driver:</span>
                      </span>
                      <strong className="text-xs sm:text-sm font-black text-emerald-700 shrink-0">
                        AED {contractData.returnAmountCollected.toFixed(2)} ({contractData.returnPaymentMethod || "Cash"})
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Return Notes */}
              {returnNotes ? (
                <div className="bg-red-50/80 border border-red-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                    <FileText size={14} className="text-red-600 shrink-0" />
                    <span>Return Pickup Notes:</span>
                  </div>
                  <div className="text-xs text-red-950 font-medium leading-relaxed whitespace-pre-wrap bg-white/90 p-2.5 sm:p-3 rounded-xl border border-red-100">
                    {returnNotes}
                  </div>
                </div>
              ) : null}

              {/* Return Inspection Photos Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-red-950 flex items-center gap-1.5 min-w-0">
                    <Camera size={14} className="text-red-600 shrink-0" />
                    <span className="truncate">Return Inspection Photos</span>
                    <span className="text-[10px] text-red-700 shrink-0">({returnPhotos.length})</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-text-muted font-medium shrink-0 hidden xs:inline">Return Inspection</span>
                </div>

                {returnPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {returnPhotos.map((photoUrl, index) => (
                      <div 
                        key={index}
                        onClick={() => setPreviewImage(photoUrl)}
                        className="relative h-[110px] sm:h-[135px] md:h-[155px] w-full rounded-xl sm:rounded-2xl border border-red-100 overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer active:scale-95 transition-transform"
                        title="Click to enlarge"
                      >
                        <img src={photoUrl} alt={`Return Photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 size={16} />
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 bg-red-950/80 text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-900/50">
                          Return #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-red-50/40 p-3 sm:p-4 rounded-xl border border-red-100 flex items-center gap-2 text-xs text-red-900/70">
                    <Camera size={14} className="text-red-500 shrink-0" />
                    <span>No return inspection photos recorded yet.</span>
                  </div>
                )}
              </div>

              {/* Return Settlement & Additional Charges Payment Photos */}
              {returnMoneyPhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 min-w-0">
                      <DollarSign size={14} className="text-emerald-600 shrink-0" />
                      <span className="truncate">Return Charges Proof</span>
                      <span className="text-[10px] text-emerald-800 shrink-0">({returnMoneyPhotos.length})</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-700 font-medium shrink-0 hidden xs:inline">Settlement Records</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {returnMoneyPhotos.map((photoUrl, index) => (
                      <div 
                        key={index}
                        onClick={() => setPreviewImage(photoUrl)}
                        className="relative h-[110px] sm:h-[135px] md:h-[155px] w-full rounded-xl sm:rounded-2xl border border-emerald-100 overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer active:scale-95 transition-transform"
                        title="Click to enlarge"
                      >
                        <img src={photoUrl} alt={`Return Proof Photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 size={16} />
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 bg-emerald-950/80 text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-900/50">
                          Return Proof #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Damage Documentation Photos */}
              {damagePhotos.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-red-950 flex items-center gap-1.5 min-w-0">
                      <Camera size={14} className="text-red-600 shrink-0" />
                      <span className="truncate">Damage Photos (صور توثيق الأضرار)</span>
                      <span className="text-[10px] text-red-700 shrink-0">({damagePhotos.length})</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-red-700 font-medium shrink-0 hidden xs:inline">Evidence</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {damagePhotos.map((photoUrl, index) => (
                      <div 
                        key={index}
                        onClick={() => setPreviewImage(photoUrl)}
                        className="relative h-[110px] sm:h-[135px] md:h-[155px] w-full rounded-xl sm:rounded-2xl border border-red-200 overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer active:scale-95 transition-transform"
                        title="Click to enlarge"
                      >
                        <img src={photoUrl} alt={`Damage Photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 size={16} />
                        </div>
                        <div className="absolute bottom-1.5 left-1.5 bg-red-950/80 text-white text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-900/50">
                          Damage Proof #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorded Damages / Charges */}
              {(damages.length > 0 || (contractData.newDamages && contractData.newDamages !== "None")) && (
                <div className="bg-red-50/80 border border-red-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-red-900 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <AlertCircle size={14} className="text-red-600 shrink-0" />
                      <span className="truncate">Recorded Damages &amp; Charges:</span>
                    </div>
                    {contractData.damageCharge > 0 && (
                      <span className="text-xs sm:text-sm font-black text-red-700 shrink-0">
                        Total: AED {contractData.damageCharge}
                      </span>
                    )}
                  </div>

                  {damages.length > 0 ? (
                    damages.map((d: any) => (
                      <div key={d._id} className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-red-100 text-xs text-red-950 flex items-center justify-between gap-2">
                        <span className="font-medium text-red-950 truncate">{d.description}</span>
                        <strong className="text-red-700 font-bold shrink-0">AED {d.cost}</strong>
                      </div>
                    ))
                  ) : contractData.newDamages && contractData.newDamages !== "None" ? (
                    <div className="bg-white/90 p-2 sm:p-2.5 rounded-xl border border-red-100 text-xs text-red-950 flex items-center justify-between gap-2">
                      <span className="font-medium text-red-950 truncate">{contractData.newDamages}</span>
                      <strong className="text-red-700 font-bold shrink-0">AED {contractData.damageCharge || 0}</strong>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Additional Return Charges (SALIK, PARKING, FINES, FUEL) */}
              {((Number(contractData.salikCharge || contractData.salikFees) || 0) +
                (Number(contractData.parkingCharge || contractData.parkingFees) || 0) +
                (Number(contractData.finesCharge || contractData.finesFees) || 0) +
                (Number(contractData.fuelCharge || contractData.fuelFees) || 0)) > 0 && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Coins size={14} className="text-amber-600 shrink-0" />
                      <span className="truncate">Additional Return Charges:</span>
                    </div>
                    <span className="text-xs sm:text-sm font-black text-amber-700 shrink-0">
                      Total: AED {(
                        (Number(contractData.salikCharge || contractData.salikFees) || 0) +
                        (Number(contractData.parkingCharge || contractData.parkingFees) || 0) +
                        (Number(contractData.finesCharge || contractData.finesFees) || 0) +
                        (Number(contractData.fuelCharge || contractData.fuelFees) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(Number(contractData.salikCharge || contractData.salikFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-bold">SALIK (سالك)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          AED {(Number(contractData.salikCharge || contractData.salikFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.parkingCharge || contractData.parkingFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-bold">PARKING (مواقف)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          AED {(Number(contractData.parkingCharge || contractData.parkingFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.finesCharge || contractData.finesFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-bold">FINES (مخالفات)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          AED {(Number(contractData.finesCharge || contractData.finesFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.fuelCharge || contractData.fuelFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[9px] sm:text-[10px] text-text-muted font-bold">FUEL (وقود)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          AED {(Number(contractData.fuelCharge || contractData.fuelFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Return Digital Signature */}
              {contractData.returnCustomerSignature && (
                <div className="bg-red-50/70 p-2.5 sm:p-3.5 rounded-xl border border-red-100 space-y-1.5 sm:space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-red-950 flex items-center gap-1.5 min-w-0">
                      <PenTool size={14} className="text-red-600 shrink-0" />
                      <span className="truncate">Customer Return Signature</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                      <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                      <span>Verified Return</span>
                    </span>
                  </div>
                  <div 
                    onClick={() => setPreviewImage(contractData.returnCustomerSignature)}
                    className="h-20 sm:h-24 md:h-28 bg-white rounded-xl border border-dashed border-red-200 flex items-center justify-center p-2 cursor-pointer hover:border-red-400 active:scale-[0.99] transition-all shadow-2xs"
                    title="Click to enlarge signature"
                  >
                    <img 
                      src={contractData.returnCustomerSignature} 
                      alt="Customer Return Signature" 
                      className="max-h-full max-w-full object-contain" 
                    />
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* ================= FOOTER ================= */}
        {(() => {
          const isDelivered = isHandedOver;
          const isPendingDelivery = !isDelivered;

          return (
            <div className="px-3 py-2.5 sm:px-6 sm:py-4 border-t border-border bg-gray-50/90 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 shrink-0">
              {/* Secondary / Close and Print actions */}
              <div className="flex items-center gap-2 order-2 sm:order-1 w-full sm:w-auto">
                {isHandedOver && (
                  <button
                    type="button"
                    onClick={() => window.open(`/bookings/${contractData._id || contractData.id}/print`, "_blank")}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] sm:min-h-[38px] bg-white hover:bg-gray-100 active:scale-[0.98] text-text-primary border border-border text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download size={15} className="text-brand shrink-0" />
                    <span>Print PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className={`${isHandedOver ? 'flex-1 sm:flex-none' : 'w-full sm:w-auto'} px-4 py-2.5 min-h-[40px] sm:min-h-[38px] bg-white hover:bg-gray-100 active:scale-[0.98] text-text-primary border border-border text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center cursor-pointer`}
                >
                  Close
                </button>
              </div>

              {/* Primary Operational Action Buttons (Extend, Process Return, Confirm Handover) */}
              <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                {/* Extend Rental: Admin only when delivered and not yet completed */}
                {!isDriver && isDelivered && !isCompletedOrReturned && (
                  <button
                    type="button"
                    onClick={() => setIsExtendOpen(true)}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 min-h-[40px] sm:min-h-[38px] bg-white hover:bg-gray-100 active:scale-[0.98] text-brand border border-brand/30 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CalendarPlus size={15} className="shrink-0" />
                    <span className="truncate">Extend Rental</span>
                  </button>
                )}

                {/* Process Return: Admin only when vehicle is delivered and not yet returned */}
                {!isDriver && isDelivered && !isCompletedOrReturned && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.href = `/bookings/return?contractId=${contractData._id || contractData.id}`;
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 min-h-[40px] sm:min-h-[38px] bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight size={15} className="shrink-0" />
                    <span className="truncate">Process Return</span>
                  </button>
                )}

                {/* Confirm Handover: Admin only in details modal when booking is pending handover */}
                {!isDriver && isPendingDelivery && !isCancelled && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.location.href = `/bookings/handover?contractId=${contractData._id || contractData.id}`;
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 min-h-[40px] sm:min-h-[38px] bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>Confirm Handover (تسليم السيارة)</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Extend Rental Modal */}
      {isExtendOpen && (
        <ExtendRentalModal
          isOpen={isExtendOpen}
          onClose={() => setIsExtendOpen(false)}
          onSuccess={() => {
            refreshContractData();
          }}
          contract={contractData}
        />
      )}

      {/* Full-size Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-11 right-0 sm:-top-10 sm:right-0 bg-black/60 hover:bg-black/90 text-white p-2 rounded-full cursor-pointer transition-all active:scale-95 shadow-md"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-[85vh] max-w-full rounded-xl sm:rounded-2xl object-contain shadow-2xl border border-white/20" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
