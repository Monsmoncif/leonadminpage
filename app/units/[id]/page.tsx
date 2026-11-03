"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, 
  Users, 
  Gauge, 
  Fuel, 
  Calendar,
  MapPin, 
  Activity, 
  Droplet, 
  Loader2, 
  AlertCircle, 
  Edit, 
  Settings, 
  ChevronRight, 
  Hash, 
  Palette, 
  Cog, 
  Copy, 
  Check, 
  ExternalLink, 
  TrendingUp, 
  BarChart3,
  History,
  FileText,
  DollarSign,
  Plus,
  Printer,
  Search,
  Phone,
  CheckCircle2,
  Clock,
  Eye,
  ArrowRight,
  User,
  X,
  ShieldCheck,
  Building2,
  Wrench,
  AlertTriangle,
  Sparkles,
  Trash2,
  RotateCcw
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";
import StatCard from "@/components/ui/StatCard";
import { useToast } from "@/components/providers/ToastProvider";

// Helper for generating client initials
const getInitials = (name?: string) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

// Avatar colors (10 non-blue colors hashed by name + salt)
const getAvatarColor = (name?: string, salt?: string | number) => {
  const colors = [
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-teal-100 text-teal-700",
    "bg-orange-100 text-orange-700",
    "bg-fuchsia-100 text-fuchsia-700",
    "bg-lime-100 text-lime-700",
    "bg-pink-100 text-pink-700",
    "bg-violet-100 text-violet-700",
  ];
  const key = `${name || "A"}-${salt ?? ""}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
};

// Status rules:
// - Active: ONLY when car is delivered to client (deliveryStatus === "Delivered" and not returned)
// - Completed: when car is back (status === "Completed", deliveryStatus === "Returned", or returnedAt)
// - Pending: otherwise (before delivery)
const getEffectiveStatus = (c: any): "Active" | "Pending" | "Completed" => {
  if (c.status === "Completed" || c.deliveryStatus === "Returned" || Boolean(c.returnedAt)) {
    return "Completed";
  }
  // Check if contract start date is in the future (another day)
  const nowEndOfDay = new Date();
  nowEndOfDay.setHours(23, 59, 59, 999);
  const contractStart = new Date(c.startDate);
  
  // If contract starts in the future, it is strictly Pending (cannot be active yet)
  if (contractStart > nowEndOfDay) {
    return "Pending";
  }

  // Active ONLY when car is delivered to client and contract has started
  if (c.deliveryStatus === "Delivered") {
    return "Active";
  }
  return "Pending";
};

const getContractStatusBadge = (effectiveStatus: string) => {
  switch (effectiveStatus) {
    case "Active":
      return {
        bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        dot: "bg-emerald-500",
        label: "Active"
      };
    case "Pending":
      return {
        bg: "bg-amber-50 text-amber-700 border-amber-200",
        dot: "bg-amber-500",
        label: "Pending"
      };
    case "Completed":
      return {
        bg: "bg-stone-100 text-stone-700 border-stone-200",
        dot: "bg-stone-500",
        label: "Completed"
      };
    default:
      return {
        bg: "bg-gray-50 text-gray-700 border-gray-200",
        dot: "bg-gray-500",
        label: effectiveStatus || "Unknown"
      };
  }
};

const getPaymentBadge = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "paid":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partial":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "pending":
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Vidange (Oil Change) Modal State
  const [isVidangeModalOpen, setIsVidangeModalOpen] = useState(false);
  const [vidangeMode, setVidangeMode] = useState<"record" | "adjust">("record");
  const [vidangeOdometer, setVidangeOdometer] = useState<number | string>("");
  const [vidangeCurrentMileage, setVidangeCurrentMileage] = useState<number | string>("");
  const [vidangeIntervalInput, setVidangeIntervalInput] = useState<number>(10000);
  const [vidangeDate, setVidangeDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [vidangeOilGrade, setVidangeOilGrade] = useState<string>("5W-30");
  const [vidangeFilterChanged, setVidangeFilterChanged] = useState<boolean>(true);
  const [vidangeCost, setVidangeCost] = useState<number | string>("");
  const [vidangeNotes, setVidangeNotes] = useState<string>("");
  const [savingVidange, setSavingVidange] = useState(false);
  const [deletingVidangeIdx, setDeletingVidangeIdx] = useState<number | null>(null);

  const openVidangeModal = (mode: "record" | "adjust" = "record") => {
    const currentOdo = Number(unit?.mileage) || 0;
    const intervalVal = Number(unit?.oilChangeInterval) > 0 ? Number(unit.oilChangeInterval) : 10000;
    const lastOdo =
      unit?.lastOilChangeMileage != null && unit.lastOilChangeMileage > 0
        ? Number(unit.lastOilChangeMileage)
        : currentOdo;

    setVidangeMode(mode);
    setVidangeOdometer(mode === "record" ? currentOdo : lastOdo);
    setVidangeCurrentMileage(currentOdo);
    setVidangeIntervalInput(intervalVal);
    setVidangeDate(
      mode === "adjust" && unit?.lastOilChangeDate
        ? new Date(unit.lastOilChangeDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setVidangeOilGrade("5W-30");
    setVidangeFilterChanged(unit?.oilFilterChanged !== undefined ? Boolean(unit.oilFilterChanged) : true);
    setVidangeCost(mode === "adjust" && unit?.lastOilChangeCost ? unit.lastOilChangeCost : "");
    setVidangeNotes(mode === "adjust" && unit?.lastOilChangeNotes ? unit.lastOilChangeNotes : "");
    setIsVidangeModalOpen(true);
  };

  const handleSaveVidange = async (e: React.FormEvent) => {
    e.preventDefault();
    const serviceKm = Number(vidangeOdometer);
    const carCurrentKm = Number(vidangeCurrentMileage);
    const intervalKm = Number(vidangeIntervalInput) > 0 ? Number(vidangeIntervalInput) : 10000;

    if (isNaN(serviceKm) || serviceKm < 0) {
      toast.error("يرجى إدخال قراءة عداد تغيير الزيت بشكل صحيح");
      return;
    }
    if (isNaN(carCurrentKm) || carCurrentKm < 0) {
      toast.error("يرجى إدخال العداد الحالي للسيارة بشكل صحيح");
      return;
    }

    try {
      setSavingVidange(true);
      const resolvedCurrentKm = Math.max(serviceKm, carCurrentKm);
      const serviceDateObj = vidangeDate ? new Date(vidangeDate) : new Date();
      const costVal = Number(vidangeCost) || 0;
      const combinedNotes = [vidangeOilGrade ? `Oil: ${vidangeOilGrade}` : "", vidangeNotes.trim()]
        .filter(Boolean)
        .join(" — ");

      const existingHistory = Array.isArray(unit?.vidangeHistory) ? [...unit.vidangeHistory] : [];

      const updatePayload: any = {
        lastOilChangeMileage: serviceKm,
        lastOilChangeDate: serviceDateObj,
        oilChangeInterval: intervalKm,
        lastOilChangeNotes: combinedNotes,
        lastOilChangeCost: costVal,
        oilFilterChanged: vidangeFilterChanged,
        mileage: resolvedCurrentKm,
      };

      if (vidangeMode === "record") {
        const newEntry = {
          mileage: serviceKm,
          nextDueMileage: serviceKm + intervalKm,
          interval: intervalKm,
          date: serviceDateObj,
          oilGrade: vidangeOilGrade || "5W-30",
          filterChanged: vidangeFilterChanged,
          cost: costVal,
          notes: vidangeNotes.trim(),
          recordedAt: new Date(),
        };
        updatePayload.vidangeHistory = [newEntry, ...existingHistory];
      }

      const res = await fetch(`/api/units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to save oil change");
      }

      toast.success(
        vidangeMode === "record"
          ? `تم تسجيل غيار الزيت وإعادة ضبط دورة الـ ${intervalKm.toLocaleString()} كم بنجاح! ✓`
          : "تم تحديث عداد ودورة تغيير الزيت بنجاح! ✓"
      );
      setIsVidangeModalOpen(false);
      await fetchUnit();
    } catch (err: any) {
      console.error("Vidange save error:", err);
      toast.error(err.message || "Failed to save oil change");
    } finally {
      setSavingVidange(false);
    }
  };

  const handleDeleteVidangeHistory = async (indexToRemove: number) => {
    if (!Array.isArray(unit?.vidangeHistory)) return;
    try {
      setDeletingVidangeIdx(indexToRemove);
      const updatedHistory = unit.vidangeHistory.filter((_: any, idx: number) => idx !== indexToRemove);
      const updatePayload: any = { vidangeHistory: updatedHistory };

      if (updatedHistory.length > 0) {
        const latest = updatedHistory[0];
        updatePayload.lastOilChangeMileage = Number(latest.mileage) || 0;
        if (latest.date) updatePayload.lastOilChangeDate = latest.date;
        if (latest.interval) updatePayload.oilChangeInterval = Number(latest.interval);
      }

      const res = await fetch(`/api/units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      if (!res.ok) throw new Error("Failed to remove history record");
      toast.success("تم حذف السجل من تاريخ غيار الزيت");
      await fetchUnit();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setDeletingVidangeIdx(null);
    }
  };

  // Rental History Modal & Filters State
  const toast = useToast();
  const [deliveringContractId, setDeliveringContractId] = useState<string | null>(null);
  const [selectedContractForModal, setSelectedContractForModal] = useState<any | null>(null);
  const [isContractDetailsOpen, setIsContractDetailsOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

  const handleConfirmDelivery = async (contract: any) => {
    const nowStartOfDay = new Date();
    nowStartOfDay.setHours(0, 0, 0, 0);
    const contractStartDate = new Date(contract.startDate);
    contractStartDate.setHours(0, 0, 0, 0);

    if (contractStartDate > nowStartOfDay) {
      const formattedDate = contractStartDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
      toast.error(`Handover can only be confirmed on the day of start (${formattedDate}).`);
      return;
    }

    try {
      setDeliveringContractId(contract._id);
      const res = await fetch(`/api/contracts/${contract._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStatus: "Delivered", status: "Active" }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to confirm delivery");
      }
      toast.success("Car confirmed as Delivered & Active");
      await fetchUnit();
    } catch (err: any) {
      console.error("Delivery confirmation error:", err);
      toast.error(err.message || "Failed to confirm delivery");
    } finally {
      setDeliveringContractId(null);
    }
  };

  const fetchUnit = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      const res = await fetch(`/api/units/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Vehicle not found");
      const data = await res.json();
      setUnit(data);
      setError(null);
    } catch (err: any) {
      console.error(`Unit fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchUnit(retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnit();
  }, [id]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto pb-10 space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
          <div>
            <div className="w-32 h-3 bg-gray-200 rounded-md mb-2"></div>
            <div className="w-48 h-6 bg-gray-200 rounded-md"></div>
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-6">
            <div className="bg-card rounded-2xl border border-border h-[420px]"></div>
            <div className="bg-card rounded-2xl border border-border h-[120px]"></div>
            <div className="bg-card rounded-2xl border border-border h-[200px]"></div>
          </div>
          <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col gap-6">
            <div className="bg-card rounded-2xl border border-border h-[350px]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl border border-red-200 p-10 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Vehicle Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">{error || "The vehicle you are looking for does not exist."}</p>
          <button onClick={() => router.push("/units")} className="px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-colors cursor-pointer shadow-sm">
            Back to Fleet
          </button>
        </div>
      </div>
    );
  }

  // Build chart data from real mileage history
  const hasRealHistory = unit.mileageHistory && unit.mileageHistory.length > 1;

  const chartData: { name: string; km: number; date?: string }[] = unit.mileageHistory && unit.mileageHistory.length > 0
    ? unit.mileageHistory
    : [{ name: 'Baseline', km: unit.mileage || 0 }, { name: 'Current', km: unit.mileage || 0 }];

  const totalTraveled = hasRealHistory
    ? Math.max(0, chartData[chartData.length - 1].km - chartData[0].km)
    : 0;

  const minKm = Math.min(...chartData.map(d => d.km));
  const maxKm = Math.max(...chartData.map(d => d.km));
  const kmRange = maxKm - minKm;
  const yPadding = kmRange > 0 ? kmRange * 0.15 : 2000;
  const yDomainMin = Math.max(0, Math.floor((minKm - yPadding) / 1000) * 1000);
  const yDomainMax = Math.ceil((maxKm + yPadding) / 1000) * 1000;

  const statusConfig: Record<string, { dot: string; bg: string; text: string; glow: string }> = {
    Available: { dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.6)]' },
    Maintenance: { dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.6)]' },
    Rented: { dot: 'bg-brand', bg: 'bg-brand/10', text: 'text-brand', glow: 'shadow-[0_0_8px_rgba(229,57,53,0.5)]' },
  };
  const status = statusConfig[unit.status] || { dot: 'bg-gray-400', bg: 'bg-gray-50', text: 'text-gray-600', glow: '' };

  const specs = [
    { icon: Cog, label: "Transmission", value: unit.transmission || "Automatic" },
    { icon: Users, label: "Capacity", value: `${unit.capacity || 5} seats` },
    { icon: Gauge, label: "Mileage", value: `${(unit.mileage || 0).toLocaleString()} km` },
    { icon: Fuel, label: "Fuel Type", value: unit.fuelType || "Petrol" },
    { icon: Calendar, label: "Year", value: unit.year || "N/A" },
    { icon: Palette, label: "Color", value: unit.color || "N/A" },
    { icon: ExecutiveCarIcon, label: "Plate Number", value: unit.plate || "N/A", copyable: true },
    { icon: Hash, label: "VIN Number", value: unit.vin || "N/A", copyable: true },
    { icon: Gauge, label: "KM Limit (حد الكيلومتر)", value: unit.dailyKmLimit > 0 ? `${unit.dailyKmLimit} km/day` : "Unlimited" },
    { icon: DollarSign, label: "Price / Extra KM (سعر كم إضافي)", value: unit.pricePerExtraKm > 0 ? `AED ${unit.pricePerExtraKm}/km` : "Free / Included" },
    { icon: DollarSign, label: "Daily Rate (السعر اليومي)", value: `AED ${unit.dailyRate ?? 0}/day` },
    ...(unit.owner ? [{ icon: Building2, label: "Owner", value: unit.owner }] : []),
    ...(unit.registrationExpiry ? [{ icon: Calendar, label: "Registration Expiry", value: new Date(unit.registrationExpiry).toLocaleDateString("en-GB") }] : []),
    ...(unit.insuranceExpiry ? [{ icon: ShieldCheck, label: "Insurance Expiry", value: new Date(unit.insuranceExpiry).toLocaleDateString("en-GB") }] : []),
  ];

  // ===== Vidange (Oil Change) Calculations =====
  const VIDANGE_INTERVAL = Number(unit.oilChangeInterval) > 0 ? Number(unit.oilChangeInterval) : 10000;
  const currentKm = Number(unit.mileage) || 0;

  // Creation baseline (from initial registration):
  const creationBaselineKm = unit.initialMileage != null && unit.initialMileage > 0
    ? Number(unit.initialMileage)
    : (hasRealHistory && chartData[0]?.km ? Number(chartData[0].km) : currentKm);

  // If a vidange was recorded, use that. Otherwise, start from creation mileage:
  const lastVidangeKm =
    unit.lastOilChangeMileage != null && unit.lastOilChangeMileage > 0
      ? Number(unit.lastOilChangeMileage)
      : creationBaselineKm;

  const nextVidangeKm = lastVidangeKm + VIDANGE_INTERVAL;
  const kmDrivenSinceVidange = Math.max(0, currentKm - lastVidangeKm);
  const remainingKm = nextVidangeKm - currentKm;
  const progressPct = Math.min(100, Math.max(0, (kmDrivenSinceVidange / VIDANGE_INTERVAL) * 100));
  const oilHealthPct = Math.max(0, Math.min(100, 100 - progressPct));

  const isVidangeOverdue = remainingKm <= 0;
  const isVidangeSoon = !isVidangeOverdue && remainingKm <= Math.min(1500, Math.round(VIDANGE_INTERVAL * 0.15));

  // Real Vidange History List (only actual recorded oil changes)
  const vidangeHistoryList: any[] = Array.isArray(unit.vidangeHistory) ? unit.vidangeHistory : [];

  // Contracts & Rental History calculations
  const contractsList: any[] = (unit.contracts || []).filter((c: any) => c.status !== "Cancelled");

  const isPersonalizedContract = (c: any) =>
    Boolean(
      c.contractType === "Personalized" ||
      c.personalizedPersonName ||
      c.deliveryDriver === "Personal Use"
    );

  // Exclude Personalized contracts from rental counts, days rented, and revenue
  const customerRentalContracts = contractsList.filter((c: any) => !isPersonalizedContract(c));

  const totalRentals = customerRentalContracts.length;
  const activeRental = contractsList.find((c: any) => getEffectiveStatus(c) === "Active");
  const pendingRental = contractsList.find((c: any) => getEffectiveStatus(c) === "Pending");

  const totalRevenue = customerRentalContracts.reduce(
    (sum: number, c: any) => sum + (Number(c.totalAmount) || 0),
    0
  );
  const totalDaysRented = customerRentalContracts.reduce(
    (sum: number, c: any) => sum + (Number(c.totalDays) || 0),
    0
  );
  const totalKmDriven = contractsList.reduce((sum: number, c: any) => {
    if (c.returnOdometer && c.checkoutMileage && c.returnOdometer > c.checkoutMileage) {
      return sum + (c.returnOdometer - c.checkoutMileage);
    }
    return sum;
  }, 0);

  const statusCounts = {
    all: contractsList.length,
    Active: contractsList.filter((c: any) => getEffectiveStatus(c) === "Active").length,
    Pending: contractsList.filter((c: any) => getEffectiveStatus(c) === "Pending").length,
    Completed: contractsList.filter((c: any) => getEffectiveStatus(c) === "Completed").length,
  };

  const filteredContracts = contractsList.filter((c: any) => {
    const effStatus = getEffectiveStatus(c);
    if (historyStatusFilter !== "all" && effStatus !== historyStatusFilter) {
      return false;
    }
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const clientName = (c.clientId?.name || "").toLowerCase();
      const clientPhone = (c.clientId?.phone || "").toLowerCase();
      const contractNum = String(c.contractNumber || "");
      const nationality = (c.clientId?.nationality || "").toLowerCase();
      return (
        clientName.includes(q) ||
        clientPhone.includes(q) ||
        contractNum.includes(q) ||
        nationality.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 border-b border-border pb-5 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => router.push("/units")}
            className="p-2 text-text-muted hover:bg-gray-100 hover:text-text-primary rounded-xl transition-all cursor-pointer shrink-0"
            aria-label="Back to fleet"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1 truncate">
              <span className="cursor-pointer hover:text-brand transition-colors" onClick={() => router.push("/units")}>Fleet</span>
              <ChevronRight size={12} className="shrink-0" />
              <span className="text-text-secondary truncate">{unit.make} {unit.model}</span>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight truncate">{unit.make} {unit.model}</h1>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ring-1 ring-black/5 ${status.bg} ${status.text} shrink-0`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.glow}`}></div>
                {unit.status}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button 
            onClick={() => openVidangeModal("record")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-xs whitespace-nowrap ${
              isVidangeOverdue 
                ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 animate-pulse'
                : isVidangeSoon
                ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                : 'bg-white border-border text-text-primary hover:bg-gray-50'
            }`}
            title="Record Oil Change (Vidange) / تسجيل تغيير الزيت"
          >
            <Droplet size={14} className={isVidangeOverdue ? "text-red-600" : isVidangeSoon ? "text-amber-600" : "text-brand"} />
            <span>Vidange</span>
          </button>
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-white border border-border text-text-primary rounded-xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Edit size={14} />
            <span>Edit</span>
          </button>
          <button 
            onClick={() => router.push(`/bookings/new?unitId=${unit._id}`)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 bg-brand text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-sm hover:shadow-md whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Booking</span>
          </button>
        </div>
      </div>

      {/* ===== Top 4 KPI StatCards (Inspired by Fleet Units Page) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="stagger-1">
          <StatCard
            icon={ExecutiveCarIcon}
            label="Vehicle Status"
            value={unit.status}
            subtitle={
              activeRental
                ? `With ${activeRental.clientId?.name || 'Client'}`
                : pendingRental
                ? `Pending handover (#${pendingRental.contractNumber})`
                : "Ready for rental in fleet"
            }
            accentColor={
              unit.status === "Available"
                ? "#10B981"
                : unit.status === "Rented"
                ? "#E53935"
                : "#F59E0B"
            }
            sparkData={unit.status === "Available" ? [5, 6, 7, 8, 9, 10] : [8, 8, 7, 7, 6, 6]}
          />
        </div>

        <div className="stagger-2">
          <StatCard
            icon={Gauge}
            label="Current Odometer"
            value={`${currentKm.toLocaleString()} km`}
            subtitle={
              totalKmDriven > 0
                ? `+${totalKmDriven.toLocaleString()} km on bookings`
                : totalTraveled > 0
                ? `+${totalTraveled.toLocaleString()} km tracked`
                : "Baseline reading"
            }
            accentColor="#8B5CF6"
            sparkData={chartData.map((d) => d.km)}
          />
        </div>

        <div className="stagger-3">
          <StatCard
            icon={Wrench}
            label={`Next Vidange (${(VIDANGE_INTERVAL / 1000).toFixed(0)}k km)`}
            value={isVidangeOverdue ? "Overdue!" : `${remainingKm.toLocaleString()} km`}
            subtitle={
              isVidangeOverdue
                ? `Exceeded by ${Math.abs(remainingKm).toLocaleString()} km`
                : `Next due at ${nextVidangeKm.toLocaleString()} km`
            }
            accentColor={isVidangeOverdue ? "#EF4444" : isVidangeSoon ? "#F59E0B" : "#10B981"}
            sparkData={[
              0,
              Math.min(VIDANGE_INTERVAL, kmDrivenSinceVidange * 0.25),
              Math.min(VIDANGE_INTERVAL, kmDrivenSinceVidange * 0.5),
              Math.min(VIDANGE_INTERVAL, kmDrivenSinceVidange * 0.75),
              Math.min(VIDANGE_INTERVAL, kmDrivenSinceVidange),
            ]}
          />
        </div>

        <div className="stagger-4">
          <StatCard
            icon={DollarSign}
            label="Daily Rate & Revenue"
            value={`AED ${unit.dailyRate ?? 0}/day`}
            subtitle={
              totalRevenue > 0
                ? `AED ${totalRevenue.toLocaleString()} (${totalRentals} rentals)`
                : "Standard rental pricing"
            }
            accentColor="#059669"
            sparkData={[100, 150, 120, 200, 250, 300]}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 animate-fade-in-up stagger-2">
        {/* Left Column */}
        <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-5 sm:gap-6">
          
          {/* ===== Hero: Gallery + Car Title ===== */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm card-hover">
            {/* Gallery: Alone in one line across full width */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] bg-gradient-to-b from-gray-50 to-gray-100/60 flex items-center justify-center overflow-hidden">
              {unit.images && unit.images.length > 0 ? (
                <img
                  src={unit.images[activeImageIndex] || unit.images[0]}
                  alt={unit.model}
                  className="w-full h-full object-contain p-4 sm:p-6 drop-shadow-xl transition-all duration-500"
                />
              ) : (
                <div className="flex flex-col items-center gap-2.5 sm:gap-3 text-gray-300">
                  <ExecutiveCarIcon size={52} className="sm:w-16 sm:h-16" />
                  <span className="text-xs sm:text-sm font-medium text-gray-400">No images available</span>
                </div>
              )}

              {unit.images && unit.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((activeImageIndex - 1 + unit.images.length) % unit.images.length)}
                    className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white border border-border shadow-sm flex items-center justify-center text-text-secondary hover:text-brand transition-all cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((activeImageIndex + 1) % unit.images.length)}
                    className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white border border-border shadow-sm flex items-center justify-center text-text-secondary hover:text-brand transition-all cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] sm:text-[11px] font-semibold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                    {activeImageIndex + 1} / {unit.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {unit.images && unit.images.length > 1 && (
              <div className="p-2.5 sm:p-3 border-t border-border bg-white">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {unit.images.map((img: string, i: number) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setActiveImageIndex(i)}
                      className={`w-[60px] sm:w-[68px] h-[42px] sm:h-[48px] shrink-0 rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
                        activeImageIndex === i
                          ? 'border-brand ring-2 ring-brand/20'
                          : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`${unit.model} ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Below images: Just name of car */}
            <div className="p-4 sm:p-5 border-t border-border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
                  {unit.make} {unit.model}
                </h2>
                <div className="flex items-center gap-2 mt-1 sm:mt-1.5 flex-wrap">
                  {unit.year && (
                    <span className="text-xs font-semibold text-text-muted">{unit.year}</span>
                  )}
                  {unit.plate && (
                    <>
                      <span className="text-text-muted text-xs">•</span>
                      <span className="text-xs font-bold text-text-secondary bg-gray-100 px-2 py-0.5 rounded-md">
                        {unit.plate}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {unit.description && (
                <p className="text-xs text-text-secondary max-w-sm line-clamp-2">
                  {unit.description}
                </p>
              )}
            </div>
          </div>

          {/* ===== Specifications ===== */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-border bg-gray-50/50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Settings size={16} />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-text-primary">Specifications</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border/60">
              {specs.map((spec, i) => (
                <div
                  key={i}
                  className={`group flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-3.5 hover:bg-gray-50/70 transition-colors ${
                    i >= 2 ? "sm:border-t sm:border-border/60" : ""
                  } ${i % 2 === 0 ? "sm:border-r sm:border-border/60" : ""}`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white border border-border/60 shadow-xs flex items-center justify-center text-text-muted group-hover:text-brand transition-colors shrink-0">
                      <spec.icon size={14} className="sm:w-[15px] sm:h-[15px]" />
                    </div>
                    <span className="text-xs text-text-muted font-semibold truncate">{spec.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0 shrink-0 max-w-[55%] sm:max-w-[60%] justify-end">
                    <span className="text-xs sm:text-sm font-bold text-text-primary truncate" title={String(spec.value)}>{spec.value}</span>
                    {spec.copyable && spec.value !== "N/A" && (
                      <button
                        onClick={() => copyToClipboard(String(spec.value), spec.label)}
                        className="p-1 hover:bg-gray-100 rounded-md transition-all cursor-pointer shrink-0"
                        title={`Copy ${spec.label}`}
                      >
                        {copiedField === spec.label ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-text-muted" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col gap-5 sm:gap-6">

          {/* Mileage Activity Chart */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} className="text-brand" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary">Mileage Activity</h3>
              </div>
              <span className="text-[10px] sm:text-[11px] border border-border rounded-lg px-2.5 py-1 text-text-secondary bg-gray-50/80 font-medium">
                Progression
              </span>
            </div>

            {/* Current reading */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent border border-border/50 mb-4 sm:mb-5 gap-3">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1 truncate">
                  {hasRealHistory ? 'Odometer Reading' : 'Current Odometer'}
                </p>
                <p className="text-xl sm:text-2xl font-black text-text-primary">
                  {(unit.mileage || 0).toLocaleString()} <span className="text-xs sm:text-sm font-semibold text-text-muted">km</span>
                </p>
              </div>
              {hasRealHistory && totalTraveled > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 sm:px-3 py-1.5 rounded-lg ring-1 ring-emerald-200/50 shrink-0">
                  <TrendingUp size={14} />
                  <span className="text-xs sm:text-sm font-bold">+{totalTraveled.toLocaleString()} km</span>
                </div>
              )}
            </div>

            <div className="h-44 sm:h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E53935" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#E53935" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(val) => {
                      if (!val) return "";
                      const d = new Date(val);
                      return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
                    }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    domain={[yDomainMin, yDomainMax]}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontSize: '12px', padding: '10px 14px' }}
                    itemStyle={{ color: '#E53935', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${Number(value).toLocaleString()} km`, 'Odometer']}
                    labelFormatter={(label) => {
                      if (!label) return "";
                      const d = new Date(label);
                      return isNaN(d.getTime()) ? label : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="km" 
                    stroke="#E53935" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#colorKm)"
                    dot={{ r: 3, fill: '#E53935', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#E53935', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {!hasRealHistory && (
              <p className="text-[11px] text-text-muted mt-3 text-center bg-gray-50 rounded-lg py-2">
                Chart will show real progression once contracts are completed
              </p>
            )}
          </div>
          
          {/* ===== Rental Summary (Clean Specifications Style) ===== */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
            <div className="px-4 sm:px-6 py-3.5 border-b border-border bg-gray-50/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <History size={16} />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary">Rental Summary</h3>
              </div>
              <span className="text-xs font-bold text-text-secondary bg-white border border-border px-2.5 py-1 rounded-lg shrink-0">
                {totalRentals} {totalRentals === 1 ? "Rental" : "Rentals"}
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {[
                {
                  icon: DollarSign,
                  label: "Total Revenue",
                  value: `AED ${totalRevenue.toLocaleString()}`,
                  valueColor: "text-emerald-700",
                },
                {
                  icon: Calendar,
                  label: "Days Rented",
                  value: `${totalDaysRented} ${totalDaysRented === 1 ? "day" : "days"}`,
                },
                {
                  icon: Gauge,
                  label: "Km On Trips",
                  value: `${totalKmDriven > 0 ? `+${totalKmDriven.toLocaleString()}` : "0"} km`,
                },
                {
                  icon: Activity,
                  label: "Current State",
                  value: activeRental
                    ? `Rented (#${activeRental.contractNumber})`
                    : pendingRental
                    ? `Pending (#${pendingRental.contractNumber})`
                    : "Available",
                  valueColor: activeRental
                    ? "text-emerald-600"
                    : pendingRental
                    ? "text-amber-600"
                    : "text-text-secondary",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-border/60 shadow-xs flex items-center justify-center text-text-muted shrink-0">
                      <item.icon size={14} />
                    </div>
                    <span className="text-xs text-text-muted font-semibold truncate">{item.label}</span>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${item.valueColor || "text-text-primary"} shrink-0`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ===== Oil Change (Vidange) — Clean Specifications Style ===== */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
            <div className="px-4 sm:px-6 py-3.5 border-b border-border bg-gray-50/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Droplet size={16} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary">Oil Change (Vidange)</h3>
                  <p className="text-[10px] text-text-muted">Every {VIDANGE_INTERVAL.toLocaleString()} km cycle</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {isVidangeOverdue ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 animate-pulse">
                    <AlertTriangle size={12} />
                    <span>Overdue</span>
                  </span>
                ) : isVidangeSoon ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} />
                    <span>Due Soon</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} />
                    <span>Healthy</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => openVidangeModal("adjust")}
                  title="Adjust Odometer / Cycle"
                  className="p-1.5 rounded-lg border border-border bg-white hover:bg-gray-100 text-text-secondary hover:text-brand transition-colors cursor-pointer"
                >
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {/* Clean Oil Life Progress Bar */}
            <div className="px-4 sm:px-6 py-3 bg-gray-50/30 border-b border-border/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-text-secondary">
                  Oil Life ({oilHealthPct.toFixed(0)}%)
                </span>
                <span className={`font-bold ${
                  isVidangeOverdue ? "text-red-600" : isVidangeSoon ? "text-amber-600" : "text-emerald-600"
                }`}>
                  {isVidangeOverdue
                    ? `Overdue by ${Math.abs(remainingKm).toLocaleString()} km`
                    : `${remainingKm.toLocaleString()} km remaining`}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, progressPct)}%`,
                    backgroundColor: isVidangeOverdue ? "#EF4444" : isVidangeSoon ? "#F59E0B" : "#10B981",
                  }}
                />
              </div>
            </div>

            {/* Clean Specifications-style Rows */}
            <div className="divide-y divide-border/60">
              {[
                {
                  icon: Gauge,
                  label: "Current Odometer",
                  value: `${currentKm.toLocaleString()} km`,
                },
                {
                  icon: History,
                  label: "Last Oil Change",
                  value: `${lastVidangeKm.toLocaleString()} km`,
                  sub: unit.lastOilChangeDate
                    ? new Date(unit.lastOilChangeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : undefined,
                },
                {
                  icon: Calendar,
                  label: "Next Oil Change Due",
                  value: `${nextVidangeKm.toLocaleString()} km`,
                },
                {
                  icon: TrendingUp,
                  label: "Driven Since Last Change",
                  value: `${kmDrivenSinceVidange.toLocaleString()} km`,
                },
                {
                  icon: Activity,
                  label: "Remaining Distance",
                  value: isVidangeOverdue ? `-${Math.abs(remainingKm).toLocaleString()} km` : `${remainingKm.toLocaleString()} km`,
                  valueColor: isVidangeOverdue ? "text-red-600" : isVidangeSoon ? "text-amber-600" : "text-emerald-600",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white border border-border/60 shadow-xs flex items-center justify-center text-text-muted shrink-0">
                      <item.icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs text-text-muted font-semibold block truncate">{item.label}</span>
                      {item.sub && <span className="text-[10px] text-text-muted block truncate">{item.sub}</span>}
                    </div>
                  </div>
                  <span className={`text-xs sm:text-sm font-bold ${item.valueColor || "text-text-primary"} shrink-0`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Recorded Oil Change History (only shown when real history records exist) */}
            {vidangeHistoryList.length > 0 && (
              <div className="px-4 sm:px-6 py-3 border-t border-border/60 bg-gray-50/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    Service History ({vidangeHistoryList.length})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {vidangeHistoryList.map((entry: any, idx: number) => {
                    const entryDate = entry.date
                      ? new Date(entry.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "N/A";
                    const entryKm = Number(entry.mileage) || 0;
                    return (
                      <div
                        key={entry._id || idx}
                        className="px-3 py-2 rounded-lg bg-white border border-border/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span className="font-bold text-text-primary">{entryKm.toLocaleString()} km</span>
                          <span className="text-text-muted text-[11px]">• {entryDate}</span>
                          {entry.oilGrade && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-text-secondary">
                              {entry.oilGrade}
                            </span>
                          )}
                          {Number(entry.cost) > 0 && (
                            <span className="text-[10px] font-bold text-emerald-700">
                              AED {Number(entry.cost).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVidangeHistory(idx)}
                          disabled={deletingVidangeIdx === idx}
                          title="Delete record"
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                        >
                          {deletingVidangeIdx === idx ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single Clean Action Button */}
            <div className="p-3.5 sm:p-4 bg-gray-50/50 border-t border-border">
              <button
                type="button"
                onClick={() => openVidangeModal("record")}
                className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                  isVidangeOverdue
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-brand hover:bg-brand-dark text-white"
                }`}
              >
                <Wrench size={14} />
                <span>Record Oil Change</span>
              </button>
            </div>
          </div>
          
        </div>
      </div>

      {/* ==================== FULL-WIDTH RENTAL HISTORY SECTION ==================== */}
      <div className="mt-8 sm:mt-10 bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in-up stagger-3">
        {/* Section Header */}
        <div className="p-4 sm:p-6 border-b border-border bg-gray-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <History size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary">Rental History (سجل التأجير)</h2>
              <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 line-clamp-1 sm:line-clamp-none">
                Complete record of all contracts, renters, mileage, and revenue for this vehicle
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/bookings/new")}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Create Booking for this Car</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:p-4 border-b border-border bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" style={{ scrollbarWidth: 'none' }}>
            <button
              onClick={() => setHistoryStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                historyStatusFilter === "all"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setHistoryStatusFilter("Active")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                historyStatusFilter === "Active"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              Active ({statusCounts.Active})
            </button>
            <button
              onClick={() => setHistoryStatusFilter("Pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                historyStatusFilter === "Pending"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              Pending ({statusCounts.Pending})
            </button>
            <button
              onClick={() => setHistoryStatusFilter("Completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                historyStatusFilter === "Completed"
                  ? "bg-stone-800 text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              Completed ({statusCounts.Completed})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by renter, contract #, phone..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 sm:py-1.5 bg-gray-50 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
            />
            {historySearchQuery && (
              <button
                onClick={() => setHistorySearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Rental History Content */}
        {filteredContracts.length > 0 ? (
          <div>
            {/* Desktop Table View (hidden on small screens) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-gray-50/60 text-text-muted font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-5">Contract #</th>
                    <th className="py-3 px-5">Renter / Client</th>
                    <th className="py-3 px-5">Rental Period</th>
                    <th className="py-3 px-5">Mileage (Out → In)</th>
                    <th className="py-3 px-5">Financials</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredContracts.map((contract: any) => {
                    const effectiveStatus = getEffectiveStatus(contract);
                    const statusBadge = getContractStatusBadge(effectiveStatus);
                    const paymentBadge = getPaymentBadge(contract.paymentStatus);
                    const isCarDelivered = effectiveStatus === "Active";

                    const startFormatted = new Date(contract.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                    const endFormatted = new Date(contract.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                    const checkoutKm = contract.checkoutMileage != null ? contract.checkoutMileage : 0;
                    const returnKm = contract.returnOdometer;
                    const kmTraveled = returnKm && returnKm > checkoutKm ? returnKm - checkoutKm : null;

                    const clientName = contract.clientId?.name || "Walk-in Customer";
                    const clientPhone = contract.clientId?.phone || "N/A";
                    const clientNationality = contract.clientId?.nationality;

                    return (
                      <tr 
                        key={contract._id} 
                        className="hover:bg-gray-50/60 transition-colors group"
                      >
                        {/* Contract # */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <button
                              onClick={() => {
                                setSelectedContractForModal(contract);
                                setIsContractDetailsOpen(true);
                              }}
                              className="font-bold text-text-primary hover:text-brand transition-colors text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>#{contract.contractNumber || contract._id.slice(-6)}</span>
                              <Eye size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand" />
                            </button>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] font-semibold text-text-muted bg-gray-100 px-1.5 py-0.5 rounded">
                                {contract.contractType || "Delivery"}
                              </span>
                              {contract.rentalType && (
                                <span className="text-[10px] font-medium text-text-muted">
                                  • {contract.rentalType}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Renter / Client */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(clientName, contract._id)}`}>
                              {getInitials(clientName)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-text-primary truncate max-w-[180px]">
                                {clientName}
                              </span>
                              <div className="flex items-center gap-1.5 text-text-muted text-[11px] mt-0.5">
                                {clientPhone !== "N/A" && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone size={10} />
                                    {clientPhone}
                                  </span>
                                )}
                                {clientNationality && (
                                  <span className="truncate max-w-[100px]">
                                    • {clientNationality}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Rental Period */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                              <span>{startFormatted}</span>
                              <span className="text-text-muted text-[10px]">→</span>
                              <span>{endFormatted}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] font-bold text-text-muted bg-gray-100 px-2 py-0.5 rounded">
                                {contract.totalDays || 1} {contract.totalDays === 1 ? "day" : "days"}
                              </span>
                              {isCarDelivered ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Delivered & Active
                                </span>
                              ) : effectiveStatus === "Pending" ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    Pending Handover
                                  </span>
                                  <button
                                    onClick={() => handleConfirmDelivery(contract)}
                                    disabled={deliveringContractId === contract._id}
                                    title="Confirm Car Delivered to Client"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 px-2 py-0.5 rounded-full border border-emerald-300 transition-colors cursor-pointer"
                                  >
                                    {deliveringContractId === contract._id ? (
                                      <Loader2 size={10} className="animate-spin" />
                                    ) : (
                                      <CheckCircle2 size={11} className="text-emerald-600" />
                                    )}
                                    <span>Confirm Delivered</span>
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Mileage (Out → In) */}
                        <td className="py-4 px-5">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5 font-medium text-text-primary">
                              <span className="text-[11px] text-text-muted">Out:</span>
                              <span className="text-xs font-bold text-text-primary">
                                {checkoutKm.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-text-muted font-normal">km</span>
                            </div>
                            <div className="flex items-baseline gap-1.5 mt-0.5 font-medium text-text-primary">
                              <span className="text-[11px] text-text-muted">In:</span>
                              {returnKm != null && returnKm > 0 ? (
                                <>
                                  <span className="text-xs font-bold text-text-primary">
                                    {returnKm.toLocaleString()}
                                  </span>
                                  <span className="text-[10px] text-text-muted font-normal">km</span>
                                </>
                              ) : (
                                <span className="text-[11px] text-text-muted italic font-normal">
                                  {isCarDelivered ? "In Use" : "N/A"}
                                </span>
                              )}
                            </div>
                            {kmTraveled != null && (
                              <div className="mt-1 flex items-baseline gap-1">
                                <span className="text-xs font-black text-emerald-700">
                                  +{kmTraveled.toLocaleString()}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600">km traveled</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Financials */}
                        <td className="py-4 px-5">
                          {effectiveStatus === "Pending" ? (
                            <span className="text-text-muted text-xs font-semibold">—</span>
                          ) : (
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-1 font-bold text-text-primary">
                                <span className="text-sm font-black text-emerald-700">
                                  AED {(contract.totalAmount || 0).toLocaleString()}
                                </span>
                                {contract.dailyRate && (
                                  <span className="text-[10px] text-text-muted font-normal">
                                    ({contract.dailyRate} AED/d)
                                  </span>
                                )}
                              </div>
                              <div className="mt-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${paymentBadge}`}>
                                  {contract.paymentStatus || "Pending"}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {effectiveStatus === "Pending" && (
                              <button
                                onClick={() => handleConfirmDelivery(contract)}
                                disabled={deliveringContractId === contract._id}
                                title="Confirm Car Delivered to Client (تأكيد تسليم السيارة)"
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                              >
                                {deliveringContractId === contract._id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <CheckCircle2 size={13} />
                                )}
                                <span className="hidden sm:inline">Confirm Delivered</span>
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedContractForModal(contract);
                                setIsContractDetailsOpen(true);
                              }}
                              title="View Contract Details"
                              className="p-1.5 bg-gray-100 hover:bg-brand/10 text-text-muted hover:text-brand rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            {Boolean(contract.deliveryStatus === "Delivered" || contract.status === "Completed") && (
                              <a
                                href={`/bookings/${contract._id}/print`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Print / View Contract PDF"
                                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-text-muted hover:text-text-primary rounded-lg transition-colors inline-block"
                              >
                                <Printer size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (visible only on small screens) */}
            <div className="block md:hidden divide-y divide-border">
              {filteredContracts.map((contract: any) => {
                const effectiveStatus = getEffectiveStatus(contract);
                const statusBadge = getContractStatusBadge(effectiveStatus);
                const paymentBadge = getPaymentBadge(contract.paymentStatus);
                const isCarDelivered = effectiveStatus === "Active";

                const startFormatted = new Date(contract.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
                const endFormatted = new Date(contract.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                const checkoutKm = contract.checkoutMileage != null ? contract.checkoutMileage : 0;
                const returnKm = contract.returnOdometer;
                const kmTraveled = returnKm && returnKm > checkoutKm ? returnKm - checkoutKm : null;

                const clientName = contract.clientId?.name || "Walk-in Customer";
                const clientPhone = contract.clientId?.phone || "N/A";
                const clientNationality = contract.clientId?.nationality;

                return (
                  <div key={contract._id} className="p-4 space-y-3 hover:bg-gray-50/40 transition-colors">
                    {/* Header Row: Contract # + Type + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          onClick={() => {
                            setSelectedContractForModal(contract);
                            setIsContractDetailsOpen(true);
                          }}
                          className="font-bold text-sm text-text-primary hover:text-brand transition-colors text-left truncate flex items-center gap-1 cursor-pointer"
                        >
                          <span>#{contract.contractNumber || contract._id.slice(-6)}</span>
                          <Eye size={12} className="text-brand shrink-0" />
                        </button>
                        <span className="text-[10px] font-semibold text-text-muted bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                          {contract.contractType || "Delivery"}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border shrink-0 ${statusBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Client Information */}
                    <div className="flex items-center gap-2.5 bg-gray-50/70 p-2.5 rounded-xl border border-border/50">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(clientName, contract._id)}`}>
                        {getInitials(clientName)}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-bold text-xs text-text-primary truncate">
                          {clientName}
                        </span>
                        <div className="flex items-center gap-2 text-text-muted text-[11px] mt-0.5 truncate">
                          {clientPhone !== "N/A" && (
                            <a 
                              href={`tel:${clientPhone}`} 
                              className="flex items-center gap-1 hover:text-brand transition-colors font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone size={10} />
                              <span>{clientPhone}</span>
                            </a>
                          )}
                          {clientNationality && (
                            <span className="truncate">
                              • {clientNationality}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2-Column Info Grid: Period & Mileage */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Period Box */}
                      <div className="bg-gray-50/70 rounded-xl p-2.5 border border-border/50 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                            <Calendar size={11} className="text-text-muted" />
                            <span>Period</span>
                          </div>
                          <div className="font-semibold text-text-primary text-[11px] leading-tight">
                            {startFormatted}
                            <span className="text-text-muted mx-1">→</span>
                            {endFormatted}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] font-bold text-text-muted bg-white border border-border px-1.5 py-0.5 rounded">
                            {contract.totalDays || 1}d
                          </span>
                          {isCarDelivered ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : effectiveStatus === "Pending" ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                              <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                              Pending
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Mileage Box */}
                      <div className="bg-gray-50/70 rounded-xl p-2.5 border border-border/50 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1">
                            <Gauge size={11} className="text-text-muted" />
                            <span>Mileage</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-medium text-text-primary">
                            <span className="text-text-muted text-[10px]">Out:</span>
                            <span className="font-bold">{checkoutKm.toLocaleString()} km</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-medium text-text-primary mt-0.5">
                            <span className="text-text-muted text-[10px]">In:</span>
                            {returnKm != null && returnKm > 0 ? (
                              <span className="font-bold">{returnKm.toLocaleString()} km</span>
                            ) : (
                              <span className="text-text-muted italic text-[10px]">
                                {isCarDelivered ? "In Use" : "N/A"}
                              </span>
                            )}
                          </div>
                        </div>
                        {kmTraveled != null ? (
                          <div className="mt-1 text-right">
                            <span className="text-[10px] font-black text-emerald-700">+{kmTraveled.toLocaleString()} km</span>
                          </div>
                        ) : (
                          <div className="h-3"></div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Financials & Action Buttons */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 flex-wrap">
                      {/* Financials */}
                      {effectiveStatus === "Pending" ? (
                        <div className="text-text-muted text-xs font-semibold">
                          <span>Rate: {contract.dailyRate || "—"} AED/d</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-emerald-700">
                            AED {(contract.totalAmount || 0).toLocaleString()}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${paymentBadge}`}>
                            {contract.paymentStatus || "Pending"}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {effectiveStatus === "Pending" && (
                          <button
                            onClick={() => handleConfirmDelivery(contract)}
                            disabled={deliveringContractId === contract._id}
                            title="Confirm Car Delivered to Client"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          >
                            {deliveringContractId === contract._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            <span>Deliver</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedContractForModal(contract);
                            setIsContractDetailsOpen(true);
                          }}
                          title="View Contract Details"
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-brand/10 text-text-secondary hover:text-brand rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} />
                          <span>Details</span>
                        </button>
                        {Boolean(contract.deliveryStatus === "Delivered" || contract.status === "Completed") && (
                          <a
                            href={`/bookings/${contract._id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Print / View Contract PDF"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-text-muted hover:text-text-primary rounded-lg transition-colors inline-flex items-center"
                          >
                            <Printer size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <History size={24} className="sm:w-7 sm:h-7" />
            </div>
            {contractsList.length === 0 ? (
              <>
                <h3 className="text-sm font-bold text-text-primary">No Rental History for this Vehicle</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  This car has not been assigned to any contracts yet. Once a rental is created, all history and mileage details will appear here.
                </p>
                <button
                  onClick={() => router.push("/bookings/new")}
                  className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  Create First Booking
                </button>
              </>
            ) : (
              <>
                <h3 className="text-sm font-bold text-text-primary">No Matching Contracts Found</h3>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  No rental records match your current filter or search query. Try clearing your filters.
                </p>
                <button
                  onClick={() => {
                    setHistorySearchQuery("");
                    setHistoryStatusFilter("all");
                  }}
                  className="mt-3 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Edit Vehicle Modal */}
      <CreateUnitModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          fetchUnit();
        }}
        unitToEdit={unit}
      />

      {/* Contract Details Modal */}
      <ContractDetailsModal
        isOpen={isContractDetailsOpen}
        onClose={() => {
          setIsContractDetailsOpen(false);
          setSelectedContractForModal(null);
        }}
        contract={selectedContractForModal}
        onEdit={() => {
          fetchUnit();
        }}
      />

      {/* ================= Record / Adjust Oil Change Modal (نافذة تسجيل وضبط تغيير الزيت) ================= */}
      {isVidangeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-border overflow-hidden animate-scale-up my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-gray-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Droplet size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-text-primary">
                    {vidangeMode === "record"
                      ? "تسجيل تغيير زيت جديد (Record Vidange)"
                      : "ضبط عداد ودورة الزيت (Adjust KM & Cycle)"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-text-muted">
                    {unit.make} {unit.model} • {unit.plate || "No Plate"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsVidangeModalOpen(false)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="px-4 sm:px-5 pt-3 bg-white shrink-0">
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-100 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setVidangeMode("record");
                    setVidangeOdometer(unit?.mileage || 0);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    vidangeMode === "record"
                      ? "bg-brand text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Wrench size={13} />
                  <span>تسجيل غيار جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVidangeMode("adjust");
                    setVidangeOdometer(lastVidangeKm);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    vidangeMode === "adjust"
                      ? "bg-stone-800 text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <Settings size={13} />
                  <span>ضبط العداد / الدورة</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVidange} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Maintenance Cycle Interval Selector (5,000 / 8,000 / 10,000 / 15,000 km) */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  دورة تغيير الزيت (Maintenance Cycle Interval)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[5000, 8000, 10000, 15000].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setVidangeIntervalInput(val)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        Number(vidangeIntervalInput) === val
                          ? "bg-brand/10 border-brand text-brand shadow-2xs"
                          : "bg-gray-50 border-border text-text-secondary hover:bg-gray-100"
                      }`}
                    >
                      {val.toLocaleString()} km
                    </button>
                  ))}
                </div>
              </div>

              {/* 2-Column Odometer Inputs: Service KM & Current Car KM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Service Odometer Input */}
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="text-xs font-semibold text-text-primary">
                      {vidangeMode === "record" ? "عداد الغيار الجديد (Service KM)" : "عداد آخر غيار (Last Vidange KM)"}{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setVidangeOdometer(unit.mileage || 0)}
                      className="text-[10px] font-bold text-brand hover:underline cursor-pointer shrink-0"
                    >
                      الحالي ({currentKm.toLocaleString()})
                    </button>
                  </div>
                  <div className="relative">
                    <Droplet size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={vidangeOdometer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVidangeOdometer(val);
                        if (vidangeMode === "record" && Number(val) > Number(vidangeCurrentMileage)) {
                          setVidangeCurrentMileage(val);
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-bold"
                      placeholder="e.g. 50000"
                    />
                  </div>
                </div>

                {/* Current Car Odometer Input */}
                <div>
                  <div className="flex items-center justify-between mb-1 gap-1">
                    <label className="text-xs font-semibold text-text-primary">
                      العداد الحالي للسيارة (Current KM) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setVidangeCurrentMileage(vidangeOdometer || currentKm)}
                      className="text-[10px] font-bold text-text-muted hover:text-brand cursor-pointer shrink-0"
                    >
                      نفس الغيار
                    </button>
                  </div>
                  <div className="relative">
                    <Gauge size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="number"
                      required
                      min="0"
                      value={vidangeCurrentMileage}
                      onChange={(e) => setVidangeCurrentMileage(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-bold"
                      placeholder="e.g. 52000"
                    />
                  </div>
                </div>
              </div>

              {/* Oil Grade & Filter Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    لزوجة الزيت (Oil Grade)
                  </label>
                  <div className="flex items-center gap-1">
                    {["5W-30", "5W-40", "0W-20", "10W-40"].map((grade) => (
                      <button
                        type="button"
                        key={grade}
                        onClick={() => setVidangeOilGrade(grade)}
                        className={`flex-1 py-2 px-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                          vidangeOilGrade === grade
                            ? "bg-brand text-white border-brand"
                            : "bg-gray-50 border-border text-text-secondary hover:bg-gray-100"
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    فلتر الزيت (Oil Filter)
                  </label>
                  <button
                    type="button"
                    onClick={() => setVidangeFilterChanged((prev) => !prev)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-between ${
                      vidangeFilterChanged
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                        : "bg-gray-50 border-border text-text-secondary"
                    }`}
                  >
                    <span>{vidangeFilterChanged ? "مع تغيير الفلتر (Oil + Filter)" : "زيت فقط (Oil Only)"}</span>
                    <CheckCircle2 size={14} className={vidangeFilterChanged ? "text-emerald-600" : "text-gray-400"} />
                  </button>
                </div>
              </div>

              {/* Date & Cost Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    تاريخ الصيانة (Date of Service)
                  </label>
                  <div className="relative">
                    <Calendar size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="date"
                      value={vidangeDate}
                      onChange={(e) => setVidangeDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    تكلفة الصيانة (Cost AED - اختياري)
                  </label>
                  <div className="relative">
                    <DollarSign size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="number"
                      min="0"
                      value={vidangeCost}
                      onChange={(e) => setVidangeCost(e.target.value)}
                      placeholder="e.g. 250"
                      className="w-full pl-9 pr-3 py-2 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Service Notes */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  ملاحظات إضافية / اسم الورشة (Notes / Workshop)
                </label>
                <input
                  type="text"
                  value={vidangeNotes}
                  onChange={(e) => setVidangeNotes(e.target.value)}
                  placeholder="مثال: كاسترول تخليقي بالكامل + فحص الفلاتر"
                  className="w-full px-3.5 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              {/* Live Preview Box */}
              {(() => {
                const previewLastKm = Number(vidangeOdometer) || 0;
                const previewCurrentKm = Math.max(previewLastKm, Number(vidangeCurrentMileage) || 0);
                const previewInterval = Number(vidangeIntervalInput) || 10000;
                const previewNextKm = previewLastKm + previewInterval;
                const previewRemaining = previewNextKm - previewCurrentKm;
                return (
                  <div className="bg-gray-50 border border-border rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">الموعد القادم لتغيير الزيت:</span>
                      <span className="font-black text-text-primary">{previewNextKm.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-muted font-medium">المسافة المتبقية من العداد الحالي:</span>
                      <span className={`font-black ${previewRemaining <= 0 ? "text-red-600" : "text-emerald-700"}`}>
                        {previewRemaining <= 0
                          ? `متأخر بـ ${Math.abs(previewRemaining).toLocaleString()} كم`
                          : `متبقي ${previewRemaining.toLocaleString()} كم`}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setIsVidangeModalOpen(false)}
                  className="px-3.5 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  إلغاء (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savingVidange}
                  className="px-4 sm:px-5 py-2 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {savingVidange ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>{vidangeMode === "record" ? "تأكيد وتسجيل الغيار" : "حفظ التعديلات"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
