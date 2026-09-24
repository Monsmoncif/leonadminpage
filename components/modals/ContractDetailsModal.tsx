"use client";

import { useState, useEffect } from "react";
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
  CalendarPlus,
  Banknote,
  CreditCard,
  Coins,
  Download
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
  const [activeTab, setActiveTab] = useState<"handoff" | "return">("handoff");
  const [contractData, setContractData] = useState<any>(contract);
  const [damages, setDamages] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isExtendOpen, setIsExtendOpen] = useState(false);

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
  const showReturnTab = Boolean(isReturned);

  useEffect(() => {
    if (!showReturnTab && activeTab === "return") {
      setActiveTab("handoff");
    }
  }, [showReturnTab, activeTab]);

  if (!isOpen || !contractData) return null;

  const contractNum = contractData.contractNumber ? String(contractData.contractNumber) : (contractData.id || contractData._id?.substring(0, 8)?.toUpperCase() || "N/A");
  const vehicleName = contractData.vehicle?.replace(/\s*\([^)]*\)/, "").trim() || "Vehicle";
  const plateNumber = contractData.vehiclePlate || "";
  const customerName = contractData.customer || "Customer";
  const pickupLoc = contractData.pickupLocation || "Main Office";
  const dropoffLoc = contractData.dropoffLocation || contractData.pickupLocation || "Main Office";
  const isDelivered = contractData.deliveryStatus === "Delivered";

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
  const inspectionPhotos: string[] = contractData.inspectionPhotos || [];
  const returnPhotos: string[] = contractData.returnPhotos || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] my-auto border border-border/60">
        
        {/* ================= HEADER ================= */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-gray-50/80">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-text-primary truncate">
              Booking &amp; Handover Details
            </h2>
            <span className="text-xs font-mono font-bold bg-brand/10 text-brand px-2.5 py-0.5 rounded-md border border-brand/20">
              #{contractNum}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.open(`/bookings/${contractData._id || contractData.id}/print`, "_blank")}
              className="px-2.5 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand bg-white hover:bg-brand/5 border border-brand/20 active:scale-95 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Download / Print Contract PDF"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-gray-200 active:scale-95 rounded-xl transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ================= FIXED TAB SWITCHER (ONLY SHOWN IF RETURN EXISTS) ================= */}
        {showReturnTab && (
          <div className="px-4 py-2.5 sm:px-6 border-b border-border/80 bg-white shrink-0">
            <div className="bg-gray-100/80 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold border border-border/40 shadow-2xs w-full max-w-md">
              <button
                type="button"
                onClick={() => setActiveTab("handoff")}
                className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "handoff"
                    ? "bg-white text-brand shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <CheckCircle2 size={14} className={activeTab === "handoff" ? "text-emerald-600" : "text-text-muted"} />
                <span className="truncate">Hand-off (Delivery)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("return")}
                className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "return"
                    ? "bg-white text-red-600 shadow-xs font-bold ring-1 ring-red-100"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                <ArrowLeftRight size={14} className={activeTab === "return" ? "text-red-600" : "text-text-muted"} />
                <span className="truncate">Return Pickup</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= CONTENT AREA ================= */}
        <div className="p-3.5 sm:p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar overscroll-contain space-y-4 sm:space-y-5">

          {/* ================= TAB 1: HAND-OFF (DELIVERY TO CLIENT) ================= */}
          {activeTab === "handoff" && (
            <div className="space-y-4 sm:space-y-5 animate-fade-in-up">

              {/* Title Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border/60">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    Hand-off &amp; Vehicle Delivery
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Dispatched handover details, driver delivery report, and proof of receipt.
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border self-start sm:self-auto flex items-center gap-1.5 ${
                  isDelivered 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {isDelivered ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Delivered</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} className="text-amber-600" />
                      <span>Pending Handover</span>
                    </>
                  )}
                </span>
              </div>

              {/* ================= SECTION 1: WHAT WAS GIVEN TO THE DRIVER ================= */}
              <div className="bg-gray-50/80 rounded-2xl border border-border p-3.5 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-text-primary">
                        Dispatched to Driver
                      </h4>
                      <p className="text-[11px] sm:text-xs text-text-muted">
                        Instructions and logistics assigned to the driver for vehicle handover
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-text-secondary bg-white px-2.5 py-1 rounded-lg border border-border/80 shadow-2xs">
                    Dispatch Stage
                  </span>
                </div>

                {/* Driver Assignment & Client Snapshot */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Driver & Logistics */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-border/70 space-y-2.5 shadow-2xs">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <UserCheck size={14} className="text-brand" />
                      Assigned Driver
                    </span>
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Driver Name:</span>
                        <strong className="text-text-primary font-semibold">
                          {contractData.deliveryDriver && contractData.deliveryDriver !== "None" 
                            ? contractData.deliveryDriver 
                            : "Self-drive (Client Pick Up)"}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Scheduled Date:</span>
                        <strong className="text-text-primary">
                          {formatDisplayDate(contractData.startDate)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Handover Time:</span>
                        <strong className="text-text-primary flex items-center gap-1 font-semibold">
                          <Clock size={12} className="text-brand" />
                          {contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "08:00 AM"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Client Details */}
                  <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-border/70 space-y-2.5 shadow-2xs">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <User size={14} className="text-brand" />
                      Client Profile
                    </span>
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Client Name:</span>
                        <strong className="text-text-primary font-semibold truncate max-w-[180px]">{customerName}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">Phone Number:</span>
                        {contractData.customerPhone ? (
                          <a 
                            href={`tel:${contractData.customerPhone.replace(/[^0-9+]/g, '')}`}
                            className="inline-flex items-center gap-1 text-xs text-text-primary hover:underline font-semibold bg-gray-100 hover:bg-gray-200 px-2 py-0.5 rounded border border-border/80 transition-all"
                            title="Call Client"
                          >
                            <Phone size={11} className="text-emerald-600" />
                            {contractData.customerPhone}
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-text-muted">ID / License No:</span>
                        <strong className="font-semibold text-text-secondary">
                          {contractData.customerLicense || "—"}
                        </strong>
                      </div>

                      {contractData.additionalDriverName && (
                        <div className="pt-2 mt-2 border-t border-border/60">
                          <span className="text-[10px] font-bold text-brand uppercase tracking-wider block mb-1">
                            Additional Driver (سائق إضافي)
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-text-muted">2nd Driver Name:</span>
                            <strong className="text-text-primary font-semibold truncate max-w-[180px]">{contractData.additionalDriverName}</strong>
                          </div>
                          {contractData.additionalDriverPhone && (
                            <div className="flex items-center justify-between">
                              <span className="text-text-muted">Phone:</span>
                              <span className="font-medium text-text-secondary">{contractData.additionalDriverPhone}</span>
                            </div>
                          )}
                          {contractData.additionalDriverLicense && (
                            <div className="flex items-center justify-between">
                              <span className="text-text-muted">License No:</span>
                              <span className="font-medium text-text-secondary">{contractData.additionalDriverLicense}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dispatched Vehicle Details */}
                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-border/70 space-y-2 shadow-2xs">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                    <ExecutiveCarIcon size={14} className="text-brand" />
                    Dispatched Vehicle Details
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
                    <div className="p-2 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[11px] text-text-muted block">Vehicle &amp; Model</span>
                      <strong className="text-text-primary font-bold truncate block">
                        {vehicleName} {contractData.vehicleYear && `(${contractData.vehicleYear})`}
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[11px] text-text-muted block">License Plate</span>
                      <strong className="text-text-primary font-bold block">
                        {plateNumber || "—"}
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[11px] text-text-muted block">Color &amp; Fuel</span>
                      <strong className="text-text-primary font-medium block truncate">
                        {contractData.vehicleColor || "—"} {contractData.vehicleFuel && `• ${contractData.vehicleFuel}`}
                      </strong>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg border border-border/50">
                      <span className="text-[11px] text-text-muted block">Checkout Mileage</span>
                      <strong className="text-text-primary font-bold flex items-center gap-1">
                        <Gauge size={12} className="text-brand shrink-0" />
                        {contractData.unitMileage || contractData.checkoutMileage || 0} km
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Location & Deposit Given to Driver */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Location with Google Maps */}
                  <div className="bg-white p-3 rounded-xl border border-border/70 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[11px] mb-0.5">Handover Location:</span>
                      <strong className="text-text-primary flex items-center gap-1 font-semibold truncate max-w-[210px]" title={pickupLoc}>
                        <MapPin size={13} className="text-emerald-600 shrink-0" />
                        {pickupLoc}
                      </strong>
                    </div>
                    {pickupLoc && (
                      <button
                        type="button"
                        onClick={() => openGoogleMaps(pickupLoc)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 transition-all cursor-pointer shadow-2xs"
                        title={`Open ${pickupLoc} in Google Maps`}
                      >
                        <Navigation size={10} className="rotate-45" />
                        <span>Google Maps</span>
                      </button>
                    )}
                  </div>

                  {/* Required Deposit */}
                  <div className="bg-white p-3 rounded-xl border border-border/70 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[11px] mb-0.5">Required Deposit:</span>
                      <strong className="text-amber-700 font-bold text-sm flex items-center gap-1">
                        <DollarSign size={14} className="text-amber-600" />
                        ${contractData.depositAmount || 0}
                      </strong>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-md">
                      Required
                    </span>
                  </div>
                </div>

                {/* Payment Method & Mileage Terms Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Payment Method & Status */}
                  <div className="bg-white p-3 rounded-xl border border-border/70 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[11px] mb-0.5">Payment Method:</span>
                      <strong className="text-text-primary font-bold text-xs flex items-center gap-1.5 flex-wrap">
                        {contractData.paymentMethod?.includes("Crypto") && <Coins size={14} className="text-amber-600 shrink-0" />}
                        {contractData.paymentMethod?.includes("Card") && <CreditCard size={14} className="text-blue-600 shrink-0" />}
                        {contractData.paymentMethod?.includes("Cash") && <Banknote size={14} className="text-emerald-600 shrink-0" />}
                        <span>{contractData.paymentMethod || "Cash"}</span>
                      </strong>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
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
                  <div className="bg-white p-3 rounded-xl border border-border/70 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[11px] mb-0.5">Mileage Policy:</span>
                      <strong className="text-text-primary font-bold text-xs flex items-center gap-1">
                        <Gauge size={12} className="text-brand shrink-0" />
                        {contractData.dailyKmLimit ? `${contractData.dailyKmLimit} km/day` : "Unlimited KM"}
                      </strong>
                    </div>
                    <span className="text-[10px] font-semibold text-text-secondary bg-gray-50 border border-border px-2 py-1 rounded-md">
                      {contractData.pricePerExtraKm ? `$${contractData.pricePerExtraKm}/extra km` : "No extra fee"}
                    </span>
                  </div>

                  {/* Initial Checkout Fuel Level */}
                  <div className="bg-white p-3 rounded-xl border border-border/70 flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-text-muted block text-[11px] mb-0.5">Initial Fuel Level:</span>
                      <strong className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                        <Fuel size={12} className="text-emerald-600 shrink-0" />
                        {contractData.checkoutFuelLevel !== undefined ? `${contractData.checkoutFuelLevel}%` : "100%"}
                      </strong>
                    </div>
                    <span className="text-[10px] font-semibold text-text-secondary bg-gray-50 border border-border px-2 py-1 rounded-md">
                      Checkout Odo: {contractData.checkoutMileage !== undefined ? `${contractData.checkoutMileage} km` : "Recorded"}
                    </span>
                  </div>
                </div>

                {/* Admin Handover Instructions / Notes */}
                <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-border/70 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <FileText size={14} className="text-brand" />
                    <span>Admin Instructions for Delivery:</span>
                  </div>
                  {adminNotes ? (
                    <div className="text-xs text-text-secondary font-medium leading-relaxed whitespace-pre-wrap bg-gray-50/90 p-2.5 rounded-lg border border-border/50">
                      {adminNotes}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic bg-gray-50/50 p-2 rounded-lg">
                      No specific handover instructions recorded by admin.
                    </p>
                  )}
                </div>
              </div>

              {/* ================= SECTION 2: WHAT DRIVER RETURNED UPON DELIVERY ================= */}
              <div className="bg-white rounded-2xl border border-border p-3.5 sm:p-5 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between pb-3 border-b border-border/70">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-text-primary">
                        Handover Proof &amp; Driver Report
                      </h4>
                      <p className="text-[11px] sm:text-xs text-text-muted">
                        Driver field remarks, collected deposit confirmation, inspection photos, and client e-signature
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border ${
                    isDelivered 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-gray-100 text-text-muted border-border'
                  }`}>
                    {isDelivered ? 'Completed Report' : 'Awaiting Delivery'}
                  </span>
                </div>

                {/* Handover Verification Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
                  {/* Handover Confirmation Status */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[11px] mb-1">Delivery Status:</span>
                    <strong className={`font-bold flex items-center gap-1.5 ${isDelivered ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isDelivered ? (
                        <>
                          <CheckCircle size={14} className="text-emerald-600" />
                          Delivered to Client
                        </>
                      ) : (
                        <>
                          <Clock size={14} className="text-amber-600" />
                          Pending Handover
                        </>
                      )}
                    </strong>
                  </div>

                  {/* Confirmed Handover Time */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[11px] mb-1">Recorded Handover Time:</span>
                    <strong className="text-text-primary font-bold flex items-center gap-1.5">
                      <Clock size={13} className="text-brand shrink-0" />
                      {contractData.checkoutTime ? formatTimeDisplay(contractData.checkoutTime) : "Pending"}
                    </strong>
                  </div>

                  {/* Actual Deposit Collected */}
                  <div className="p-3 bg-gray-50/80 rounded-xl border border-border/60">
                    <span className="text-text-muted block text-[11px] mb-1">Actual Deposit Collected:</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-emerald-700 font-black text-sm">
                        ${contractData.depositAmount || 0}
                      </strong>
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        {isDelivered ? "Collected" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Driver Delivery Notes / Remarks */}
                <div className="bg-gray-50/70 p-3 sm:p-3.5 rounded-xl border border-border/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
                    <FileText size={14} className="text-emerald-700" />
                    <span>Driver Delivery Remarks:</span>
                  </div>
                  {driverNotes ? (
                    <div className="text-xs text-text-secondary font-medium leading-relaxed whitespace-pre-wrap bg-white p-2.5 rounded-lg border border-border/70">
                      {driverNotes}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic bg-white/60 p-2 rounded-lg border border-border/40">
                      {isDelivered 
                        ? "No additional remarks recorded by driver." 
                        : "Driver remarks will be recorded upon vehicle handover confirmation."}
                    </p>
                  )}
                </div>

                {/* Pre-Delivery Inspection Photos Grid (8 Angles) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                      <Camera size={14} className="text-brand" />
                      Pre-Delivery Inspection Photos ({inspectionPhotos.length} / 8 photos)
                    </span>
                    <span className="text-[11px] text-text-muted font-medium">
                      Pre-Delivery Inspection Photos
                    </span>
                  </div>

                  {inspectionPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3">
                      {inspectionPhotos.map((photoUrl, index) => {
                        const angleLabel = VEHICLE_ANGLES[index] || `Angle #${index + 1}`;
                        return (
                          <div 
                            key={index}
                            onClick={() => setPreviewImage(photoUrl)}
                            className="relative h-[125px] sm:h-[145px] md:h-[165px] w-full rounded-xl border border-border overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer"
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
                            <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                              <span className="bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium px-1.5 py-0.5 rounded truncate max-w-[80%]">
                                {angleLabel}
                              </span>
                              <span className="text-[9px] font-bold text-white/80 bg-black/60 px-1 py-0.5 rounded shrink-0">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-gray-50/80 p-4 rounded-xl border border-border/70 flex items-center gap-2 text-xs text-text-muted">
                      <Camera size={15} className="text-text-muted" />
                      <span>{isDelivered ? "No inspection photos attached for this contract." : "Awaiting driver to capture 8 inspection photos upon vehicle handover."}</span>
                    </div>
                  )}
                </div>

                {/* Customer Digital Signature Card */}
                <div className="pt-1">
                  {contractData.customerSignature ? (
                    <div className="bg-gray-50/70 p-3 sm:p-3.5 rounded-xl border border-border/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                          <PenTool size={14} className="text-emerald-600" />
                          Customer Digital Signature
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          Verified Signature
                        </span>
                      </div>
                      <div 
                        onClick={() => setPreviewImage(contractData.customerSignature)}
                        className="h-24 sm:h-28 bg-white rounded-xl border border-dashed border-border flex items-center justify-center p-2 cursor-pointer hover:border-brand/60 transition-colors shadow-2xs"
                        title="Click to enlarge signature"
                      >
                        <img 
                          src={contractData.customerSignature} 
                          alt="Customer Signature" 
                          className="max-h-full max-w-full object-contain" 
                        />
                      </div>
                      {contractData.signatureMetadata?.signedAt && (
                        <div className="text-[11px] text-text-muted flex items-center gap-1.5 pt-0.5">
                          <Clock size={11} />
                          <span>Signed At: {new Date(contractData.signatureMetadata.signedAt).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 bg-gray-50/80 rounded-xl border border-border/70 flex items-center gap-2 text-xs text-text-muted">
                      <PenTool size={14} className="text-text-muted" />
                      <span>{isDelivered ? "No digital signature recorded for this contract." : "Awaiting customer signature on driver device upon vehicle receipt."}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 2: RETURN PICKUP (FROM CLIENT) ================= */}
          {activeTab === "return" && (
            <div className="space-y-4 sm:space-y-5 animate-fade-in-up">

              {/* Title Section */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-red-950 flex items-center gap-2">
                    <ArrowLeftRight size={18} className="text-red-600 shrink-0" />
                    <span>Return Pickup Details</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                    Return location, driver, odometer reading, fuel level, damages &amp; return inspection.
                  </p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isReturned ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-50/70 text-red-600 border-red-200'}`}>
                  {isReturned ? "Returned Completed" : "Pending Return"}
                </span>
              </div>

              {/* Return Logistics Snapshot Card */}
              <div className="bg-red-50/25 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-red-100/90 space-y-3 sm:space-y-4 shadow-2xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs">
                  {/* Return Location */}
                  <div>
                    <span className="text-text-muted block mb-0.5">Return Location:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-text-primary flex items-center gap-1 truncate max-w-[200px]" title={dropoffLoc}>
                        <MapPin size={13} className="text-red-600 shrink-0" />
                        {dropoffLoc}
                      </span>
                      {dropoffLoc && (
                        <button
                          type="button"
                          onClick={() => openGoogleMaps(dropoffLoc)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-all cursor-pointer"
                          title={`Open ${dropoffLoc} in Google Maps`}
                        >
                          <Navigation size={9} className="rotate-45" />
                          <span>Maps</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scheduled Return Time */}
                  <div>
                    <span className="text-text-muted block mb-0.5">Scheduled Return Time:</span>
                    <span className="font-semibold text-text-primary flex items-center gap-1">
                      <Clock size={13} className="text-red-600 shrink-0" />
                      {contractData.checkinTime ? formatTimeDisplay(contractData.checkinTime) : "10:00 AM"}
                    </span>
                  </div>

                  {/* Return Driver */}
                  <div>
                    <span className="text-text-muted block mb-0.5">Return Driver:</span>
                    <span className="font-semibold text-text-primary flex items-center gap-1">
                      <UserCheck size={13} className="text-red-600 shrink-0" />
                      {contractData.returnDriver && contractData.returnDriver !== "None" ? contractData.returnDriver : "Self-drive (Client Drop Off)"}
                    </span>
                  </div>
                </div>

                {/* Return Mileage & Fuel Split Row */}
                <div className="pt-3 border-t border-red-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-red-100 flex items-center justify-between shadow-2xs">
                    <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                      <Gauge size={14} className="text-red-600" />
                      Return Odometer:
                    </span>
                    <strong className="text-sm font-bold text-text-primary">
                      {contractData.returnOdometer ? `${contractData.returnOdometer} km` : "Pending Return"}
                    </strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-red-100 flex items-center justify-between shadow-2xs">
                    <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                      <Fuel size={14} className="text-red-600" />
                      Fuel Level:
                    </span>
                    <strong className="text-sm font-bold text-text-primary">
                      {contractData.returnFuelLevel !== undefined ? `${contractData.returnFuelLevel}%` : "Not checked"}
                    </strong>
                  </div>
                </div>

                {/* Rest of Money Collected by Driver */}
                {contractData.returnAmountCollected !== undefined && contractData.returnAmountCollected > 0 && (
                  <div className="pt-3 border-t border-red-100">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between shadow-2xs text-xs">
                      <span className="text-emerald-900 flex items-center gap-1.5 font-bold">
                        <DollarSign size={15} className="text-emerald-600 shrink-0" />
                        Rest of Money Collected by Driver (تم استلام باقي المبلغ):
                      </span>
                      <strong className="text-sm font-black text-emerald-700">
                        ${contractData.returnAmountCollected.toFixed(2)} ({contractData.returnPaymentMethod || "Cash"})
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Return Notes */}
              {returnNotes ? (
                <div className="bg-red-50/80 border border-red-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                    <FileText size={15} className="text-red-600 shrink-0" />
                    <span>Return Pickup Notes:</span>
                  </div>
                  <div className="text-xs text-red-950 font-medium leading-relaxed whitespace-pre-wrap bg-white/90 p-2.5 sm:p-3 rounded-xl border border-red-100">
                    {returnNotes}
                  </div>
                </div>
              ) : null}

              {/* Return Inspection Photos Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                    <Camera size={14} className="text-red-600" />
                    Return Inspection Photos ({returnPhotos.length} photos)
                  </span>
                  <span className="text-[11px] text-text-muted font-medium">Return Inspection</span>
                </div>

                {returnPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                    {returnPhotos.map((photoUrl, index) => (
                      <div 
                        key={index}
                        onClick={() => setPreviewImage(photoUrl)}
                        className="relative h-[125px] sm:h-[145px] md:h-[165px] w-full rounded-xl sm:rounded-2xl border border-red-100 overflow-hidden group shadow-2xs bg-gray-900 cursor-pointer"
                        title="Click to enlarge"
                      >
                        <img src={photoUrl} alt={`Return Photo ${index + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 size={16} />
                        </div>
                        <div className="absolute bottom-1.5 left-2 bg-red-950/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded border border-red-900/50">
                          Return #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-red-50/40 p-4 rounded-xl border border-red-100 flex items-center gap-2 text-xs text-red-900/70">
                    <Camera size={15} className="text-red-500" />
                    <span>No return inspection photos recorded yet.</span>
                  </div>
                )}
              </div>

              {/* Recorded Damages / Charges */}
              {(damages.length > 0 || (contractData.newDamages && contractData.newDamages !== "None")) && (
                <div className="bg-red-50/80 border border-red-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-red-900">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="text-red-600 shrink-0" />
                      <span>Recorded Damages &amp; Charges:</span>
                    </div>
                    {contractData.damageCharge > 0 && (
                      <span className="text-sm font-black text-red-700">
                        Total Charge: ${contractData.damageCharge}
                      </span>
                    )}
                  </div>

                  {damages.length > 0 ? (
                    damages.map((d: any) => (
                      <div key={d._id} className="bg-white/90 p-2.5 sm:p-3 rounded-xl border border-red-100 text-xs text-red-950 flex items-center justify-between">
                        <span className="font-medium text-red-950">{d.description}</span>
                        <strong className="text-red-700 font-bold">${d.cost}</strong>
                      </div>
                    ))
                  ) : contractData.newDamages && contractData.newDamages !== "None" ? (
                    <div className="bg-white/90 p-2.5 sm:p-3 rounded-xl border border-red-100 text-xs text-red-950 flex items-center justify-between">
                      <span className="font-medium text-red-950">{contractData.newDamages}</span>
                      <strong className="text-red-700 font-bold">${contractData.damageCharge || 0}</strong>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Additional Return Charges (SALIK, PARKING, FINES, FUEL) */}
              {((Number(contractData.salikCharge || contractData.salikFees) || 0) +
                (Number(contractData.parkingCharge || contractData.parkingFees) || 0) +
                (Number(contractData.finesCharge || contractData.finesFees) || 0) +
                (Number(contractData.fuelCharge || contractData.fuelFees) || 0)) > 0 && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <div className="flex items-center gap-2">
                      <Coins size={15} className="text-amber-600 shrink-0" />
                      <span>Additional Return Charges (SALIK, PARKING, FINES, FUEL):</span>
                    </div>
                    <span className="text-sm font-black text-amber-700">
                      Total: ${(
                        (Number(contractData.salikCharge || contractData.salikFees) || 0) +
                        (Number(contractData.parkingCharge || contractData.parkingFees) || 0) +
                        (Number(contractData.finesCharge || contractData.finesFees) || 0) +
                        (Number(contractData.fuelCharge || contractData.fuelFees) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {(Number(contractData.salikCharge || contractData.salikFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold">SALIK (سالك)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          ${(Number(contractData.salikCharge || contractData.salikFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.parkingCharge || contractData.parkingFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold">PARKING (مواقف)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          ${(Number(contractData.parkingCharge || contractData.parkingFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.finesCharge || contractData.finesFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold">FINES (مخالفات)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          ${(Number(contractData.finesCharge || contractData.finesFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(Number(contractData.fuelCharge || contractData.fuelFees) || 0) > 0 && (
                      <div className="bg-white/90 p-2.5 rounded-xl border border-amber-100 flex flex-col">
                        <span className="text-[10px] text-text-muted font-bold">FUEL (وقود)</span>
                        <span className="text-xs font-black text-text-primary mt-0.5">
                          ${(Number(contractData.fuelCharge || contractData.fuelFees) || 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Return Digital Signature */}
              {contractData.returnCustomerSignature && (
                <div className="bg-red-50/70 p-3 sm:p-3.5 rounded-xl border border-red-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-950 flex items-center gap-1.5">
                      <PenTool size={14} className="text-red-600" />
                      Customer Return Digital Signature (توقيع العميل عند الاسترجاع)
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Verified Return
                    </span>
                  </div>
                  <div 
                    onClick={() => setPreviewImage(contractData.returnCustomerSignature)}
                    className="h-24 sm:h-28 bg-white rounded-xl border border-dashed border-red-200 flex items-center justify-center p-2 cursor-pointer hover:border-red-400 transition-colors shadow-2xs"
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
        {contractData.status === "Active" && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-gray-50/80 flex flex-wrap justify-end items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => window.open(`/bookings/${contractData._id || contractData.id}/print`, "_blank")}
              className="px-3.5 py-2.5 min-h-[42px] sm:min-h-[40px] bg-white hover:bg-gray-100 active:scale-[0.98] text-text-primary border border-border text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download size={15} className="text-brand" />
              <span>Print PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setIsExtendOpen(true)}
              className="px-4 py-2.5 min-h-[42px] sm:min-h-[40px] bg-white hover:bg-gray-100 active:scale-[0.98] text-brand border border-brand/30 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarPlus size={16} />
              <span>Extend Rental (+Days)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                window.location.href = `/bookings/return?contractId=${contractData._id || contractData.id}`;
              }}
              className="px-5 py-2.5 min-h-[42px] sm:min-h-[40px] bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeftRight size={16} />
              <span>Process Return</span>
            </button>
          </div>
        )}

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
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-2 cursor-pointer"
            >
              <X size={24} />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
