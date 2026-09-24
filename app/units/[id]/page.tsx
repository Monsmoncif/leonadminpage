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
  BarChart3
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CreateUnitModal from "@/components/modals/CreateUnitModal";

export default function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const chartData: { name: string; km: number }[] = unit.mileageHistory && unit.mileageHistory.length > 0
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

  return (
    <div className="max-w-[1600px] mx-auto pb-10">
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
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark transition-all cursor-pointer shadow-sm hover:shadow-md"
        >
          <Edit size={15} />
          Edit Vehicle
        </button>
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
                Last 6 Months
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
          
        </div>
      </div>

      <CreateUnitModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          fetchUnit();
        }}
        unitToEdit={unit}
      />
    </div>
  );
}
