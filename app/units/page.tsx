"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Settings, 
  Users, 
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
  Eye
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import CreateUnitModal from "@/components/modals/CreateUnitModal";
import StatCard from "@/components/ui/StatCard";
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
  const itemsPerPage = 10;
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
      <div className="flex items-center justify-center min-h-[60vh]">
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
      <div className="space-y-6 animate-pulse max-w-[1600px] mx-auto pb-10">
        {/* Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-36 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
        
        {/* Primary Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[130px] p-5">
              <div className="flex justify-between">
                <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3"></div>
                <div className="w-16 h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-24 h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden h-[500px]">
          <div className="p-4 border-b border-border flex justify-between bg-gray-50/30">
            <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
          </div>
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-full bg-gray-100 rounded-xl"></div>
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
    <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vehicles</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your fleet, specifications, and availability.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditTarget(null); setIsUnitModalOpen(true); }}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ===== Main Content Area ===== */}
      {!loading && units.length === 0 && !searchQuery && statusFilter === "All" && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border border-dashed border-gray-300 animate-fade-in-up stagger-2">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <ExecutiveCarIcon size={32} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No vehicles found
          </h2>
          <p className="text-gray-500 mb-8 max-w-sm text-center text-sm">
            You haven't added any vehicles yet. Add your first vehicle to get started.
          </p>
          <button
            onClick={() => {
              setEditTarget(null);
              setIsUnitModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-brand hover:bg-brand-dark text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus size={18} />
            Add First Vehicle
          </button>
        </div>
      )}

      {(!loading && (units.length > 0 || searchQuery || statusFilter !== "All")) && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
        <div className="col-span-12 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Search by make, model, plate, VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>

              <div className="flex items-center gap-2 relative">
                <button 
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <Filter size={14} className="text-text-muted" /> 
                  {statusFilter === "All" ? "Status" : statusFilter}
                  <ChevronDown size={14} className="text-text-muted ml-1" />
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 w-40 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {["All", "Available", "Rented", "Maintenance"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setIsStatusDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer ${statusFilter === status ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"}`}
                      >
                        {status === "All" ? "All Statuses" : status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-text-muted font-semibold whitespace-nowrap">Vehicle</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Details</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Specifications</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Status & Rate</th>
                    <th className="text-right py-3 px-4 text-text-muted font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-text-muted">
                        <div className="flex flex-col items-center justify-center">
                          <ExecutiveCarIcon size={32} className="text-gray-300 mb-4" />
                          <h2 className="text-lg font-bold text-gray-900 mb-2">No vehicles found</h2>
                          <p className="text-gray-500 text-sm mb-4">No vehicles match your search criteria.</p>
                          <button onClick={() => { setSearchQuery(""); setStatusFilter("All"); }} className="px-4 py-2 text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer">
                            Clear Filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUnits.map((unit: any, idx: number) => (
                      <tr 
                        key={unit._id}
                        className="border-b border-border/50 bg-white animate-fade-in-up"
                        style={{ animationDelay: `${idx * 0.05 + 0.3}s` }}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-9 rounded-md bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                              {unit.images && unit.images.length > 0 ? (
                                <img src={unit.images[0]} alt={unit.model} className="w-full h-full object-cover" />
                              ) : (
                                <ExecutiveCarIcon size={16} className="text-gray-300" />
                              )}
                            </div>
                            <span className="font-bold text-text-primary flex items-center gap-2 group-hover:text-brand transition-colors">
                              {unit.make} {unit.model}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          <div>
                            <p className="font-semibold text-text-primary">Plate: {unit.plate || "N/A"}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-text-muted">
                                Year: {unit.year || new Date().getFullYear()}
                              </span>
                              {unit.insuranceExpiry && (
                                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                  Ins: {new Date(unit.insuranceExpiry).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium text-text-secondary line-clamp-1 flex items-center gap-1.5">
                              <Settings size={14} className="text-text-muted" /> {unit.transmission || "Auto"}
                            </span>
                            <span className="font-medium text-text-secondary line-clamp-1 flex items-center gap-1.5">
                              <Fuel size={14} className="text-text-muted" /> {unit.fuelType || "Petrol"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1.5 items-start" onClick={(e) => e.stopPropagation()}>
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
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 cursor-pointer shadow-2xs transition-colors ${getStatusClasses(unit.status)}`}
                            >
                              <option value="Available" className="bg-white text-gray-900">Available</option>
                              <option value="Rented" className="bg-white text-gray-900">Rented</option>
                              <option value="Maintenance" className="bg-white text-gray-900">Maintenance</option>
                            </select>
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                              <span className="px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Rate: ${unit.dailyRate || 100}/day
                              </span>
                              <span className={`px-1.5 py-0.5 rounded border ${unit.dailyKmLimit ? "bg-gray-50 text-gray-700 border-gray-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                {unit.dailyKmLimit ? `${unit.dailyKmLimit} km/d` : "Unlimited"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`flex items-center justify-end gap-1 transition-opacity `}>
                            <button 
                              className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer" 
                              title="View Details" 
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/units/${unit._id}`);
                              }}
                            >
                              <Eye size={15} />
                            </button>
                            <button 
                              className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                              title="Edit" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditTarget(unit);
                                setIsUnitModalOpen(true);
                              }}
                            >
                              <Edit size={15} />
                            </button>
                            <div className="w-px h-5 bg-border mx-1" />
                            <button 
                              className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                              title="Delete Vehicle" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(unit);
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-white">
              <p>
                Showing{" "}
                <span className="font-medium text-text-primary">
                  {filteredUnits.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-text-primary">
                  {Math.min(currentPage * itemsPerPage, filteredUnits.length)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-text-primary">
                  {filteredUnits.length}
                </span>{" "}
                results
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Prev
                </button>
                <button className="px-2.5 py-1 bg-brand text-white rounded-md font-medium shadow-sm">
                  {currentPage}
                </button>
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
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
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Vehicle</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete vehicle{" "}
              <strong className="text-gray-900 font-bold">{deleteTarget.make} {deleteTarget.model}</strong>
              {deleteTarget.plate ? ` (Plate: ${deleteTarget.plate})` : ""}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-sm">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-sm shadow-red-500/20">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
