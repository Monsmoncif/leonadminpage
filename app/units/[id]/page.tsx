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
  X
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";

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

// Avatar colors matching clients page
const getAvatarColor = (name?: string) => {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = (name || "A").charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

// Effective contract status: Active ONLY when car is delivered; otherwise Pending
const getEffectiveStatus = (c: any): "Active" | "Pending" | "Completed" | "Cancelled" => {
  if (c.status === "Completed" || c.deliveryStatus === "Returned") return "Completed";
  if (c.status === "Cancelled") return "Cancelled";
  if (c.deliveryStatus === "Delivered") return "Active";
  // If car is not delivered yet, show Pending
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
        bg: "bg-blue-50 text-blue-700 border-blue-200",
        dot: "bg-blue-500",
        label: "Completed"
      };
    case "Cancelled":
      return {
        bg: "bg-red-50 text-red-700 border-red-200",
        dot: "bg-red-500",
        label: "Cancelled"
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

  // Rental History Modal & Filters State
  const [selectedContractForModal, setSelectedContractForModal] = useState<any | null>(null);
  const [isContractDetailsOpen, setIsContractDetailsOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState("all");

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
    Rented: { dot: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', glow: 'shadow-[0_0_8px_rgba(59,130,246,0.6)]' },
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
  ];

  // Contracts & Rental History calculations
  const contractsList: any[] = unit.contracts || [];

  const totalRentals = contractsList.length;
  const activeRental = contractsList.find((c: any) => getEffectiveStatus(c) === "Active");
  const pendingRental = contractsList.find((c: any) => getEffectiveStatus(c) === "Pending");

  const totalRevenue = contractsList
    .filter((c: any) => c.status !== "Cancelled")
    .reduce((sum: number, c: any) => sum + (Number(c.totalAmount) || 0), 0);
  const totalDaysRented = contractsList
    .filter((c: any) => c.status !== "Cancelled")
    .reduce((sum: number, c: any) => sum + (Number(c.totalDays) || 0), 0);
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
    Cancelled: contractsList.filter((c: any) => getEffectiveStatus(c) === "Cancelled").length,
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
      <div className="flex items-center justify-between mb-8 border-b border-border pb-5 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/units")}
            className="p-2 text-text-muted hover:bg-gray-100 hover:text-text-primary rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted mb-1">
              <span className="cursor-pointer hover:text-brand transition-colors" onClick={() => router.push("/units")}>Fleet</span>
              <ChevronRight size={12} />
              <span className="text-text-secondary">{unit.make} {unit.model}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary leading-tight">{unit.make} {unit.model}</h1>
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ring-1 ring-black/5 ${status.bg} ${status.text}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot} ${status.glow}`}></div>
                {unit.status}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border text-text-primary rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
          >
            <Edit size={15} />
            Edit Vehicle
          </button>
          <button 
            onClick={() => router.push("/bookings/new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <Plus size={15} />
            New Booking
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 animate-fade-in-up stagger-2">
        {/* Left Column */}
        <div className="w-full lg:w-[55%] xl:w-[60%] flex flex-col gap-6">
          
          {/* Hero Image Gallery */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Main Image */}
            <div className="relative w-full aspect-[16/9] bg-gradient-to-b from-gray-50 to-gray-100/50 flex items-center justify-center overflow-hidden">
              {unit.images && unit.images.length > 0 ? (
                <img 
                  src={unit.images[activeImageIndex] || unit.images[0]} 
                  alt={unit.model} 
                  className="w-full h-full object-contain p-6 drop-shadow-xl transition-all duration-500" 
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-300">
                  <ExecutiveCarIcon size={64} />
                  <span className="text-sm font-medium text-gray-400">No images available</span>
                </div>
              )}
              
              {/* Image counter overlay */}
              {unit.images && unit.images.length > 1 && (
                <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  {activeImageIndex + 1} / {unit.images.length}
                </div>
              )}
            </div>
            
            {/* Thumbnails */}
            {unit.images && unit.images.length > 1 && (
              <div className="p-4 border-t border-border bg-white">
                <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                  {unit.images.map((img: string, i: number) => (
                    <div 
                      key={i} 
                      onClick={() => setActiveImageIndex(i)}
                      className={`w-[72px] h-[50px] shrink-0 rounded-lg border-2 overflow-hidden cursor-pointer transition-all duration-200 ${
                        activeImageIndex === i 
                          ? 'border-brand ring-2 ring-brand/20 scale-[1.03]' 
                          : 'border-transparent hover:border-gray-300 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`${unit.model} ${i + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Price & Quick Info Bar */}
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                {/* Price */}
                <div>
                  <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">Daily Rate</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-emerald-600">${unit.dailyRate ?? 'N/A'}</span>
                    <span className="text-sm font-semibold text-text-muted">/day</span>
                  </div>
                </div>
                
                {/* Divider */}
                <div className="w-px h-12 bg-border hidden sm:block"></div>

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-5">
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Gauge size={16} className="text-text-muted" />
                    <span className="text-sm font-semibold">{(unit.mileage || 0).toLocaleString()} km</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Fuel size={16} className="text-text-muted" />
                    <span className="text-sm font-semibold">{unit.fuelType || "Petrol"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    <Cog size={16} className="text-text-muted" />
                    <span className="text-sm font-semibold">{unit.transmission || "Automatic"}</span>
                  </div>
                </div>
              </div>

              {(unit.plate || unit.year) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-bold text-text-secondary bg-gray-100 px-3 py-1.5 rounded-lg ring-1 ring-black/5">
                    {unit.year} • {unit.plate || 'No Plate'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {unit.description && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3">About This Vehicle</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {unit.description}
              </p>
            </div>
          )}

          {/* Specifications Grid */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-5">Specifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {specs.map((spec, i) => (
                <div 
                  key={i} 
                  className="group relative bg-gray-50/80 hover:bg-white rounded-xl p-4 border border-transparent hover:border-border hover:shadow-sm transition-all duration-200 cursor-default"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white group-hover:bg-brand/5 flex items-center justify-center text-text-muted group-hover:text-brand transition-colors shadow-sm border border-border/50">
                      <spec.icon size={15} />
                    </div>
                    <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider">{spec.label}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-text-primary truncate flex-1" title={spec.value}>{spec.value}</p>
                    {spec.copyable && spec.value !== "N/A" && (
                      <button 
                        onClick={() => copyToClipboard(spec.value, spec.label)}
                        className=" p-1 hover:bg-gray-100 rounded-md transition-all cursor-pointer"
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
        <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col gap-6">
          
          {/* Mileage Activity Chart */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                  <BarChart3 size={16} className="text-brand" />
                </div>
                <h3 className="text-base font-bold text-text-primary">Mileage Activity</h3>
              </div>
              <span className="text-[11px] border border-border rounded-lg px-2.5 py-1 text-text-secondary bg-gray-50/80 font-medium">
                Progression
              </span>
            </div>

            {/* Current reading */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-gray-50 to-transparent border border-border/50 mb-5">
              <div>
                <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-1">
                  {hasRealHistory ? 'Odometer Reading' : 'Current Odometer'}
                </p>
                <p className="text-2xl font-black text-text-primary">
                  {(unit.mileage || 0).toLocaleString()} <span className="text-sm font-semibold text-text-muted">km</span>
                </p>
              </div>
              {hasRealHistory && totalTraveled > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg ring-1 ring-emerald-200/50">
                  <TrendingUp size={14} />
                  <span className="text-sm font-bold">+{totalTraveled.toLocaleString()} km</span>
                </div>
              )}
            </div>

            <div className="h-48 w-full">
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
                      return isNaN(d.getTime()) ? val : d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
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
                      return isNaN(d.getTime()) ? label : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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

          {/* Quick Vehicle Rental Summary KPI Card */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Rental Summary</h3>
                  <p className="text-[11px] text-text-muted">Vehicle performance at a glance</p>
                </div>
              </div>
              <span className="text-xs font-bold text-text-primary bg-gray-100 px-3 py-1 rounded-lg">
                {totalRentals} {totalRentals === 1 ? "Booking" : "Bookings"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <DollarSign size={13} className="text-emerald-600" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Revenue</span>
                </div>
                <p className="text-lg font-black text-text-primary">
                  ${totalRevenue.toLocaleString()}
                </p>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <Calendar size={13} className="text-blue-600" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Days Rented</span>
                </div>
                <p className="text-lg font-black text-text-primary">
                  {totalDaysRented} <span className="text-xs font-semibold text-text-muted">days</span>
                </p>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <Gauge size={13} className="text-purple-600" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Km On Trips</span>
                </div>
                <p className="text-lg font-black text-text-primary">
                  {totalKmDriven > 0 ? `+${totalKmDriven.toLocaleString()}` : "0"} <span className="text-xs font-semibold text-text-muted">km</span>
                </p>
              </div>

              <div className="bg-gray-50/80 rounded-xl p-3.5 border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <Activity size={13} className="text-amber-600" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Current State</span>
                </div>
                <p className="text-sm font-bold text-text-primary truncate">
                  {activeRental ? (
                    <span className="text-emerald-600">Rented (#{activeRental.contractNumber})</span>
                  ) : pendingRental ? (
                    <span className="text-amber-600">Pending Delivery (#{pendingRental.contractNumber})</span>
                  ) : (
                    <span className="text-text-muted">Available</span>
                  )}
                </p>
              </div>
            </div>

            {activeRental ? (
              <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-emerald-900">
                    Currently delivered to {activeRental.clientId?.name || "Client"}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Active until {new Date(activeRental.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedContractForModal(activeRental);
                    setIsContractDetailsOpen(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 text-white font-semibold rounded-lg text-[11px] hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            ) : pendingRental ? (
              <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-amber-900">
                    Delivery pending for {pendingRental.clientId?.name || "Client"}
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Starts {new Date(pendingRental.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedContractForModal(pendingRental);
                    setIsContractDetailsOpen(true);
                  }}
                  className="px-2.5 py-1 bg-amber-600 text-white font-semibold rounded-lg text-[11px] hover:bg-amber-700 transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            ) : null}
          </div>
          
        </div>
      </div>

      {/* ==================== FULL-WIDTH RENTAL HISTORY SECTION ==================== */}
      <div className="mt-10 bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-fade-in-up stagger-3">
        {/* Section Header */}
        <div className="p-6 border-b border-border bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">Rental History (سجل التأجير)</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Complete record of all contracts, renters, mileage, and revenue for this vehicle
              </p>
            </div>
          </div>

          <button
            onClick={() => router.push("/bookings/new")}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-xs self-start md:self-auto"
          >
            <Plus size={14} />
            Create Booking for this Car
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-border bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0" style={{ scrollbarWidth: 'none' }}>
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
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              Completed ({statusCounts.Completed})
            </button>
            <button
              onClick={() => setHistoryStatusFilter("Cancelled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                historyStatusFilter === "Cancelled"
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200/80"
              }`}
            >
              Cancelled ({statusCounts.Cancelled})
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
              className="w-full pl-9 pr-8 py-1.5 bg-gray-50 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
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

        {/* Rental History Table */}
        {filteredContracts.length > 0 ? (
          <div className="overflow-x-auto">
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

                  const startFormatted = new Date(contract.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });
                  const endFormatted = new Date(contract.endDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  });

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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(clientName)}`}>
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
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Pending Handover
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      {/* Mileage (Out → In) - Formatted like Financials font */}
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
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1 font-bold text-text-primary">
                            <span className="text-sm font-black text-emerald-700">
                              ${(contract.totalAmount || 0).toLocaleString()}
                            </span>
                            {contract.dailyRate && (
                              <span className="text-[10px] text-text-muted font-normal">
                                (${contract.dailyRate}/d)
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${paymentBadge}`}>
                              {contract.paymentStatus || "Pending"}
                            </span>
                          </div>
                        </div>
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
                          <a
                            href={`/bookings/${contract._id}/print`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Print / View Contract PDF"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-text-muted hover:text-text-primary rounded-lg transition-colors inline-block"
                          >
                            <Printer size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-200 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <History size={28} />
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
    </div>
  );
}
