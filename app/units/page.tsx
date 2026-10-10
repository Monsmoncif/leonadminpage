"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Settings, 
  Fuel,
  Edit, 
  Trash2, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  Plus, 
  CheckCircle, 
  Key, 
  Wrench, 
  Filter, 
  Eye, 
  Gauge 
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import StatCard from "@/components/ui/StatCard";
import TablePagination from "@/components/ui/TablePagination";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

// Status badge styling with vibrant, professional colors matching bookings page
const getStatusClasses = (status: string) => {
  switch (status) {
    case "Available":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 focus:ring-emerald-300";
    case "Rented":
      return "bg-blue-50 text-blue-700 border-blue-300 focus:ring-blue-300";
    case "Maintenance":
      return "bg-red-50 text-red-700 border-red-300 focus:ring-red-300";
    default:
      return "bg-amber-50 text-amber-700 border-amber-300 focus:ring-amber-300";
  }
};

export default function UnitsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ units: any[], stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const toast = useToast();

  const fetchUnits = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    setLoading(true);
    try {
      const res = await fetch("/api/units", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch units data (${res.status})`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setData({ units: json, stats: {} });
      } else {
        setData(json);
      }
      setError(null);
    } catch (err: any) {
      console.error(`Units fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchUnits(retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUnits(); }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/units/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
      
      if (data) {
        const newUnits = data.units.filter((u: any) => u._id !== deleteTarget._id);
        setData({ ...data, units: newUnits });
      }
      toast.success(`${deleteTarget.make} ${deleteTarget.model} deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-card rounded-2xl border border-red-200 p-8 text-center max-w-md shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Connection Error</h2>
          <p className="text-sm text-text-secondary mb-4">{error}</p>
          <button onClick={() => { setError(null); fetchUnits(); }} className="mt-4 px-4 py-2 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-brand-dark cursor-pointer transition-colors shadow-sm">Retry</button>
        </div>
      </div>
    );
  }

  const units = data?.units || [];
  const filteredUnits = units.filter((unit: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      unit.make?.toLowerCase().includes(q) || 
      unit.model?.toLowerCase().includes(q) ||
      unit.plate?.toLowerCase().includes(q) ||
      unit.vin?.toLowerCase().includes(q) ||
      unit.status?.toLowerCase().includes(q)
    );
    const matchesStatus = statusFilter === "All" || unit.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const paginatedUnits = filteredUnits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-10">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-2">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-gray-200 rounded-lg"></div>
            <div className="h-3.5 w-60 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        </div>
        
        {/* Primary Stats Skeleton (Matches Bookings 2x2 on mobile, 4 on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-xl sm:rounded-2xl h-[105px] sm:h-[130px] p-3 sm:p-5">
              <div className="flex justify-between">
                <div className="w-8 h-8 sm:w-11 sm:h-11 bg-gray-200 rounded-xl mb-2 sm:mb-3"></div>
                <div className="w-12 sm:w-16 h-6 sm:h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-20 h-3 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-12 h-6 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden h-[450px]">
          <div className="p-3 sm:p-4 border-b border-border flex justify-between bg-gray-50/30">
            <div className="h-9 w-56 bg-gray-200 rounded-xl"></div>
            <div className="h-9 w-24 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 sm:h-12 w-full bg-gray-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unitStats = {
    total: units.length,
    available: units.filter((u: any) => u.status === "Available").length,
    rented: units.filter((u: any) => u.status === "Rented").length,
    maintenance: units.filter((u: any) => u.status === "Maintenance").length,
  };

  const sparklineData = {
    total: [12, 12, 14, 15, 15, 16, 16],
    available: [6, 5, 8, 4, 6, 9, 8],
    rented: [5, 6, 5, 9, 7, 5, 6],
    maintenance: [1, 1, 1, 2, 2, 2, 2],
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* ===== Summary Header (Matches Bookings Page) ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            Vehicles
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
            Manage your fleet, specifications, and availability.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => { setEditTarget(null); setIsUnitModalOpen(true); }}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* ===== Primary Stats Cards (Matches Bookings Page 2x2 Mobile & 4x1 Desktop) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="stagger-1">
          <StatCard 
            icon={ExecutiveCarIcon} 
            label="Total Fleet" 
            value={unitStats.total} 
            change={5} 
            subtitle="vs last month"
            accentColor="#8B5CF6" 
            sparkData={sparklineData.total}
          />
        </div>
        <div className="stagger-2">
          <StatCard 
            icon={CheckCircle} 
            label="Available" 
            value={unitStats.available} 
            change={12} 
            subtitle="vs last month"
            accentColor="#22C55E" 
            sparkData={sparklineData.available}
          />
        </div>
        <div className="stagger-3">
          <StatCard 
            icon={Key} 
            label="On Rent" 
            value={unitStats.rented} 
            change={-2} 
            subtitle="vs last month"
            accentColor="#3B82F6" 
            sparkData={sparklineData.rented}
          />
        </div>
        <div className="stagger-4">
          <StatCard 
            icon={Wrench} 
            label="In Maintenance" 
            value={unitStats.maintenance} 
            change={0} 
            subtitle="vs last month"
            accentColor="#F59E0B" 
            sparkData={sparklineData.maintenance}
          />
        </div>
      </div>

      {/* ===== Empty State ===== */}
      {!loading && units.length === 0 && !searchQuery && statusFilter === "All" && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-card rounded-xl sm:rounded-2xl border border-dashed border-border animate-fade-in-up stagger-2 p-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50/50 rounded-full flex items-center justify-center mb-5">
            <ExecutiveCarIcon size={32} className="text-text-muted" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary mb-1.5">
            No vehicles found
          </h2>
          <p className="text-text-secondary mb-6 max-w-sm text-center text-xs sm:text-sm">
            You haven't added any vehicles yet. Add your first vehicle to get started.
          </p>
          <button
            onClick={() => {
              setEditTarget(null);
              setIsUnitModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl font-semibold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>Add First Vehicle</span>
          </button>
        </div>
      )}

      {/* ===== Main Content Area (Matches Bookings Page) ===== */}
      {(!loading && (units.length > 0 || searchQuery || statusFilter !== "All")) && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          <div className="col-span-12 flex flex-col gap-4 sm:gap-6">
            
            {/* Toolbar (Matches Bookings Page) */}
            <div className="relative z-20 bg-card rounded-xl sm:rounded-2xl border border-border p-3 sm:p-4 shadow-xs sm:shadow-sm flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 card-hover">
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Search by make, model, plate, VIN..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full text-xs sm:text-sm border border-border rounded-xl pl-9 sm:pl-10 pr-3.5 sm:pr-4 py-2 sm:py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
                />
                <Search size={15} className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>

              <div className="flex items-center gap-2 relative w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="text-xs sm:text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center justify-between sm:justify-start gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-xs cursor-pointer w-full sm:w-auto"
                >
                  <span className="flex items-center gap-2">
                    <Filter size={14} className="text-text-muted" /> 
                    {statusFilter === "All" ? "All Statuses" : statusFilter}
                  </span>
                  <ChevronDown size={14} className="text-text-muted ml-1" />
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 w-44 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {[
                      { label: "All Statuses", val: "All", dot: "bg-gray-400" },
                      { label: "Available", val: "Available", dot: "bg-emerald-500" },
                      { label: "Rented", val: "Rented", dot: "bg-blue-500" },
                      { label: "Maintenance", val: "Maintenance", dot: "bg-amber-500" }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setStatusFilter(item.val);
                          setIsStatusDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2 ${statusFilter === item.val ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table (Matches Bookings Page Table Style & Responsive UX) */}
            <div className="bg-card rounded-xl sm:rounded-2xl border border-border shadow-xs sm:shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] sm:text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/75 text-[9.5px] sm:text-[11px] md:text-xs text-text-muted font-semibold uppercase tracking-wider">
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                        Vehicle
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[180px]">
                        Details
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2 sm:px-4 min-w-[160px] sm:min-w-[200px]">
                        Specifications
                      </th>
                      <th className="text-left py-2 sm:py-2.5 px-2 whitespace-nowrap w-[110px] sm:w-[130px]">
                        Status &amp; Rate
                      </th>
                      <th className="text-right py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredUnits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 px-5 text-center text-text-muted">
                          <div className="flex flex-col items-center justify-center">
                            <ExecutiveCarIcon size={32} className="text-gray-300 mb-4" />
                            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1.5">No vehicles found</h2>
                            <p className="text-gray-500 text-xs sm:text-sm mb-4">No vehicles match your search criteria.</p>
                            <button 
                              type="button"
                              onClick={() => { setSearchQuery(""); setStatusFilter("All"); }} 
                              className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                            >
                              Clear Search
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedUnits.map((unit: any, idx: number) => (
                        <tr 
                          key={unit._id}
                          onClick={() => router.push(`/units/${unit._id}`)}
                          className="bg-white hover:bg-gray-50/75 transition-colors animate-fade-in-up cursor-pointer"
                          style={{ animationDelay: `${idx * 0.04 + 0.08}s` }}
                        >
                          {/* Vehicle Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4">
                            <div className="flex items-center gap-2 sm:gap-2.5">
                              <div className="w-10 h-7 sm:w-12 sm:h-9 rounded-md bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                {unit.images && unit.images.length > 0 ? (
                                  <img src={unit.images[0]} alt={unit.model} className="w-full h-full object-cover" />
                                ) : (
                                  <ExecutiveCarIcon size={14} className="text-gray-300" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-text-primary text-[11px] sm:text-xs md:text-sm block truncate" title={`${unit.make} ${unit.model}`}>
                                  {unit.make} {unit.model}
                                </span>
                                {unit.color && (
                                  <span className="text-[9.5px] sm:text-[11px] text-text-muted block truncate">
                                    {unit.color} {unit.year ? `• ${unit.year}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Details Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 min-w-[140px] sm:min-w-[180px]">
                            <div>
                              <p className="font-semibold text-text-primary text-[11px] sm:text-xs md:text-sm leading-tight">
                                Plate: <span className="font-mono text-brand font-bold">{unit.plate || "N/A"}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                {unit.registrationExpiry && (
                                  <span className="text-[9px] sm:text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded leading-tight">
                                    Reg: {new Date(unit.registrationExpiry).toLocaleDateString()}
                                  </span>
                                )}
                                {unit.insuranceExpiry && (
                                  <span className="text-[9px] sm:text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-tight">
                                    Ins: {new Date(unit.insuranceExpiry).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {unit.owner && (
                                <p className="text-[9.5px] sm:text-[11px] text-text-muted mt-0.5 truncate max-w-[180px]" title={`Owner: ${unit.owner}`}>
                                  Owner: {unit.owner}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Specifications Column */}
                          <td className="py-2 sm:py-2.5 px-2 sm:px-4 min-w-[160px] sm:min-w-[200px]">
                            {(() => {
                              const currentKm = Number(unit.mileage) || 0;
                              const lastVidange = unit.lastOilChangeMileage != null && unit.lastOilChangeMileage > 0
                                ? Number(unit.lastOilChangeMileage)
                                : (unit.initialMileage != null && unit.initialMileage > 0 ? Number(unit.initialMileage) : currentKm);
                              const nextVidange = lastVidange + 10000;
                              const remainingVidange = nextVidange - currentKm;

                              return (
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-text-primary flex items-center gap-1 text-[11px] sm:text-xs tabular-nums">
                                      <Gauge size={12} className="text-brand shrink-0" />
                                      {currentKm.toLocaleString()} km
                                    </span>
                                    {remainingVidange <= 0 ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded leading-tight" title={`Oil change overdue by ${Math.abs(remainingVidange).toLocaleString()} km`}>
                                        <AlertCircle size={9} className="text-red-500 shrink-0" /> Overdue
                                      </span>
                                    ) : remainingVidange <= 1500 ? (
                                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded leading-tight" title={`Oil change due in ${remainingVidange.toLocaleString()} km`}>
                                        <Wrench size={9} className="text-amber-500 shrink-0" /> Vidange {remainingVidange.toLocaleString()} km
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded leading-tight" title={`Next oil change at ${nextVidange.toLocaleString()} km`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /> Vidange {remainingVidange.toLocaleString()} km
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[9.5px] sm:text-[11px] text-text-muted">
                                    <span className="flex items-center gap-1">
                                      <Settings size={11} className="shrink-0" /> {unit.transmission || "Auto"}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Fuel size={11} className="shrink-0" /> {unit.fuelType || "Petrol"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Status & Rate Column */}
                          <td className="py-2 sm:py-2.5 px-2 whitespace-nowrap w-[110px] sm:w-[130px]">
                            <div className="flex flex-col gap-1 items-start w-[105px] sm:w-[125px]" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={unit.status}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    const res = await fetch(`/api/units/${unit._id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: newStatus })
                                    });
                                    if (!res.ok) throw new Error("Failed to update status");
                                    toast.success(`Vehicle status updated to ${newStatus}`);
                                    fetchUnits();
                                  } catch (err: any) {
                                    toast.error(err.message || "Failed to update status");
                                  }
                                }}
                                className={`text-[9.5px] sm:text-[11px] font-semibold px-1 sm:px-2 py-0.5 rounded border focus:outline-none focus:ring-1 cursor-pointer shadow-2xs transition-colors w-full ${getStatusClasses(unit.status)}`}
                              >
                                <option value="Available" className="bg-white text-gray-900">Available</option>
                                <option value="Rented" className="bg-white text-gray-900">Rented</option>
                                <option value="Maintenance" className="bg-white text-gray-900">Maintenance</option>
                              </select>
                              <div className="flex items-center gap-1 text-[8px] sm:text-[9.5px] font-semibold whitespace-nowrap">
                                <span className="px-1 py-0.2 rounded border bg-emerald-50 text-emerald-700 border-emerald-200 leading-tight">
                                  AED {unit.dailyRate || 100}/d
                                </span>
                                <span className={`px-1 py-0.2 rounded border leading-tight ${unit.dailyKmLimit ? "bg-gray-50 text-gray-700 border-gray-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                  {unit.dailyKmLimit ? `${unit.dailyKmLimit} km` : "No limit"}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Actions Column */}
                          <td className="py-2 sm:py-2.5 px-2.5 sm:px-4 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 sm:gap-1.5 transition-opacity">
                              <button 
                                type="button"
                                className="p-1 sm:p-1.5 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" 
                                title="View Vehicle Details" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/units/${unit._id}`);
                                }}
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                type="button"
                                className="p-1 sm:p-1.5 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" 
                                title="Edit Vehicle" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget(unit);
                                  setIsUnitModalOpen(true);
                                }}
                              >
                                <Edit size={14} />
                              </button>
                              <div className="w-px h-3.5 sm:h-4 bg-border mx-0.5" />
                              <button 
                                type="button"
                                className="p-1 sm:p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-md sm:rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" 
                                title="Delete Vehicle" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(unit);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination (Matches Bookings Page) */}
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUnits.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Unit Modal */}
      <CreateUnitModal
        isOpen={isUnitModalOpen}
        unitToEdit={editTarget}
        onClose={() => {
          setIsUnitModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => {
          setIsUnitModalOpen(false);
          toast.success(`Vehicle ${editTarget ? 'updated' : 'added'} successfully!`);
          setEditTarget(null);
          fetchUnits();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-border p-6 sm:p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-red-100">
              <AlertCircle size={26} className="text-red-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Delete Vehicle</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 leading-relaxed">
              Are you sure you want to delete vehicle{" "}
              <strong className="text-gray-900 font-bold">{deleteTarget.make} {deleteTarget.model}</strong>
              {deleteTarget.plate ? ` (Plate: ${deleteTarget.plate})` : ""}? This action cannot be undone.
            </p>
            <div className="flex gap-2.5 sm:gap-3 justify-center">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-xs">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-xs shadow-red-500/20">
                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
