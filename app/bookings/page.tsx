"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  Download, 
  Edit, 
  ChevronDown, 
  FileSignature, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Eye, 
  ArrowLeftRight,
  UserCheck,
  CheckCircle,
  XCircle
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import CreateContractModal from "@/components/modals/CreateContractModal";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";
import { useToast } from "@/components/providers/ToastProvider";

// Helper for generating initials for avatars (matches clients page)
const getInitials = (name: string) => {
  return name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "?";
};

// Pastel avatar colors matching clients page
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = name?.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

// Status badge styling with vibrant, professional colors
const getStatusClasses = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-blue-50 text-blue-700 border-blue-300 focus:ring-blue-300";
    case "Completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 focus:ring-emerald-300";
    case "Cancelled":
      return "bg-red-50 text-red-700 border-red-300 focus:ring-red-300";
    case "Draft":
    default:
      return "bg-amber-50 text-amber-700 border-amber-300 focus:ring-amber-300";
  }
};

const getPaymentBadge = (status: string) => {
  if (status === "Paid") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

const getCarStatusBadge = (status: string) => {
  if (status === "Delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "Returned") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
};

export default function ContractsPage() {
  const [data, setData] = useState<{ contracts: any[], stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editTarget, setEditTarget] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Pagination (matches clients page UI/UX)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const toast = useToast();

  const fetchContracts = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    setLoading(true);
    try {
      const res = await fetch("/api/contracts", { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch contracts data (${res.status})`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      console.error(`Contracts fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchContracts(retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!contractToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/contracts/${contractToDelete._id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete contract");

      if (data) {
        const newContracts = data.contracts.filter(
          (c: any) => c._id !== contractToDelete._id
        );
        setData({ ...data, contracts: newContracts });
      }
      toast.success(`Contract #${contractToDelete.id || contractToDelete._id?.substring(0, 8)} deleted successfully.`);
      setIsDeleteDialogOpen(false);
      setContractToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete contract");
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-md shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchContracts();
            }}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark cursor-pointer transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const contracts = data?.contracts || [];
  const stats = data?.stats || {
    activeContracts: 0,
    pendingSignatures: 0,
    completedThisMonth: 0,
    cancelled: 0,
  };

  // Search & Status filtering
  const filteredContracts = contracts.filter((c: any) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (c.id && c.id.toLowerCase().includes(query)) ||
      (c.customer && c.customer.toLowerCase().includes(query)) ||
      (c.vehicle && c.vehicle.toLowerCase().includes(query)) ||
      (c.driver && c.driver.toLowerCase().includes(query)) ||
      (c.deliveryDriver && c.deliveryDriver.toLowerCase().includes(query)) ||
      (c.returnDriver && c.returnDriver.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = filteredContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sparklineData = {
    active: [10, 15, 12, 18, 24, 22, 28],
    pending: [5, 4, 6, 3, 5, 2, 4],
    completed: [20, 25, 30, 28, 35, 40, 45],
    cancelled: [2, 1, 3, 1, 0, 1, 2],
  };

  return (
    <div className="space-y-6">
      {/* ===== Summary Header (Matches Clients Page) ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Bookings &amp; Contracts</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage rental agreements, handover deliveries, and vehicle returns.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/bookings/return"
            className="flex items-center gap-2 bg-white border border-border hover:bg-gray-50 text-text-primary px-4 py-2.5 rounded-xl font-semibold text-sm shadow-2xs hover:border-gray-300 transition-all cursor-pointer"
          >
            <ArrowLeftRight size={16} className="text-brand" />
            <span>Return Vehicle</span>
          </Link>
          <Link
            href="/bookings/new"
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Booking</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards (Matches Clients Page Layout) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl h-[130px] p-5 animate-pulse">
              <div className="flex justify-between">
                <div className="w-11 h-11 bg-gray-200 rounded-xl mb-3"></div>
                <div className="w-16 h-8 bg-gray-100 rounded-md"></div>
              </div>
              <div className="w-24 h-4 bg-gray-200 rounded-md mb-2"></div>
              <div className="w-16 h-8 bg-gray-200 rounded-md"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up stagger-1">
          <div className="stagger-1">
            <StatCard 
              icon={FileText} 
              label="Active Contracts" 
              value={stats.activeContracts ?? 0} 
              change={8} 
              subtitle="vs last month"
              accentColor="#3B82F6" 
              sparkData={sparklineData.active}
            />
          </div>
          <div className="stagger-2">
            <StatCard 
              icon={FileSignature} 
              label="Pending Signatures" 
              value={stats.pendingSignatures ?? 0} 
              change={-2} 
              subtitle="vs last month"
              accentColor="#F59E0B" 
              sparkData={sparklineData.pending}
            />
          </div>
          <div className="stagger-3">
            <StatCard 
              icon={CheckCircle} 
              label="Completed This Month" 
              value={stats.completedThisMonth ?? 0} 
              change={15} 
              subtitle="vs last month"
              accentColor="#22C55E" 
              sparkData={sparklineData.completed}
            />
          </div>
          <div className="stagger-4">
            <StatCard 
              icon={XCircle} 
              label="Cancelled" 
              value={stats.cancelled ?? 0} 
              change={0} 
              subtitle="vs last month"
              accentColor="#EF4444" 
              sparkData={sparklineData.cancelled}
            />
          </div>
        </div>
      )}

      {/* ===== Main Content Area ===== */}
      {/* Loading Skeleton for Table */}
      {loading && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          <div className="col-span-12">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-pulse">
              <div className="h-14 bg-gray-50/50 border-b border-border hidden sm:block"></div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-4 border-b border-border/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0"></div>
                    <div className="space-y-2">
                      <div className="w-32 h-4 bg-gray-200 rounded-full"></div>
                      <div className="w-48 h-3 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                  <div className="w-24 h-4 bg-gray-200 rounded-full hidden md:block"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded-md"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State (Matches Clients Page) */}
      {!loading && contracts.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-card rounded-2xl border border-dashed border-border">
          <div className="w-20 h-20 bg-gray-50/50 rounded-full flex items-center justify-center mb-6">
            <FileText size={32} className="text-text-muted" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            No contracts found
          </h2>
          <p className="text-text-secondary mb-6 text-center max-w-sm">
            You haven't added any bookings yet. Create your first booking to get started.
          </p>
          <Link
            href="/bookings/new"
            className="flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Plus size={18} />
            <span>New Booking</span>
          </Link>
        </div>
      )}

      {/* Data Loaded */}
      {!loading && contracts.length > 0 && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          {/* Contracts Table Area */}
          <div className="col-span-12 flex flex-col gap-6">
            
            {/* Toolbar (Matches Clients Page) */}
            <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
              <div className="relative max-w-sm w-full">
                <input 
                  type="text" 
                  placeholder="Search contract no, customer, vehicle..." 
                  className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              </div>
              
              <div className="flex items-center gap-2 relative">
                <button 
                  type="button"
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-sm cursor-pointer"
                >
                  <Filter size={14} className="text-text-muted" /> 
                  {statusFilter === "All" ? "All Statuses" : statusFilter}
                  <ChevronDown size={14} className="text-text-muted ml-1" />
                </button>
                {isStatusDropdownOpen && (
                  <div className="absolute top-full mt-2 right-0 w-40 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                    {[
                      { label: "All Statuses", val: "All", dot: "bg-gray-400" },
                      { label: "Active", val: "Active", dot: "bg-blue-500" },
                      { label: "Completed", val: "Completed", dot: "bg-emerald-500" },
                      { label: "Draft", val: "Draft", dot: "bg-amber-500" },
                      { label: "Cancelled", val: "Cancelled", dot: "bg-red-500" }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          setStatusFilter(item.val);
                          setIsStatusDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2 ${statusFilter === item.val ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Table (Matches Clients Page Table Style & Hover) */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-text-muted font-semibold whitespace-nowrap">
                        Contract
                      </th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">
                        Customer / Driver
                      </th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">
                        Vehicle
                      </th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">
                        Period
                      </th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">
                        Status
                      </th>
                      <th className="text-right py-3 px-4 text-text-muted font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-5 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <FileText size={32} className="text-gray-300 mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">No contracts found</h2>
                            <p className="text-gray-500 text-sm mb-4">No contracts match your search criteria.</p>
                            <button
                              type="button"
                              onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
                              className="px-4 py-2 text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                            >
                              Clear Search
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedContracts.map((contract: any, idx: number) => {
                        const cPaymentStatus = contract.status === "Active" || contract.status === "Completed" ? "Paid" : "Pending";
                        const cCarStatus = contract.deliveryStatus || (contract.status === "Completed" ? "Returned" : contract.status === "Draft" ? "Pending" : "Delivered");

                        return (
                          <tr 
                            key={contract._id} 
                            className="border-b border-border/50 bg-white hover:bg-gray-50/50 transition-colors animate-fade-in-up"
                            style={{ animationDelay: `${idx * 0.05 + 0.1}s` }}
                          >
                            {/* Contract Column */}
                            <td className="py-3 px-4">
                              <span 
                                className="font-semibold text-text-primary hover:text-brand cursor-pointer transition-colors"
                                title="عرض تفاصيل العقد • View Details"
                                onClick={() => {
                                  setSelectedContractForDetails(contract);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                {contract.id}
                              </span>
                            </td>

                            {/* Customer / Driver Column (Only customer name & driver name) */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${getAvatarColor(contract.customer)}`}>
                                  {getInitials(contract.customer)}
                                </div>
                                <div className="min-w-0">
                                  <span 
                                    className="font-semibold flex items-center gap-1.5 transition-colors text-text-primary hover:text-brand cursor-pointer" 
                                    title={`عرض تفاصيل: ${contract.customer}`}
                                    onClick={() => {
                                      setSelectedContractForDetails(contract);
                                      setIsDetailsModalOpen(true);
                                    }}
                                  >
                                    {contract.customer}
                                  </span>
                                  {(() => {
                                    const hasDelivery = contract.deliveryDriver && contract.deliveryDriver !== "None";
                                    const hasReturn = contract.returnDriver && contract.returnDriver !== "None";
                                    let driverDisplay = "Self-drive";

                                    if (hasDelivery && hasReturn) {
                                      driverDisplay = contract.deliveryDriver === contract.returnDriver 
                                        ? contract.deliveryDriver 
                                        : `${contract.deliveryDriver} / ${contract.returnDriver}`;
                                    } else if (hasDelivery) {
                                      driverDisplay = contract.deliveryDriver;
                                    } else if (hasReturn) {
                                      driverDisplay = contract.returnDriver;
                                    } else if (contract.driver && contract.driver !== "None") {
                                      driverDisplay = contract.driver;
                                    }

                                    return (
                                      <p className="text-xs text-text-muted truncate mt-0.5" title={`Driver: ${driverDisplay}`}>
                                        {driverDisplay}
                                      </p>
                                    );
                                  })()}
                                </div>
                              </div>
                            </td>

                            {/* Vehicle Column */}
                            <td className="py-3 px-4">
                              <span className="font-medium text-text-primary line-clamp-1" title={contract.vehicle}>
                                {contract.vehicle}
                              </span>
                              {contract.vehiclePlate && (
                                <p className="text-xs text-text-muted mt-0.5">
                                  {contract.vehiclePlate}
                                </p>
                              )}
                            </td>

                            {/* Period Column (Only the Period) */}
                            <td className="py-3 px-4">
                              <p className="font-medium text-text-secondary flex items-center gap-1.5 whitespace-nowrap">
                                <Calendar size={13} className="text-text-muted shrink-0" />
                                {contract.startDate} to {contract.endDate}
                              </p>
                            </td>

                            {/* Status Column */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <select
                                  value={contract.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                      const res = await fetch(`/api/contracts/${contract._id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: newStatus })
                                      });
                                      if (!res.ok) throw new Error("Failed to update status");
                                      toast.success(`Status updated to ${newStatus}`);
                                      fetchContracts();
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to update status");
                                    }
                                  }}
                                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 cursor-pointer shadow-2xs transition-colors ${getStatusClasses(contract.status)}`}
                                >
                                  <option value="Draft" className="bg-white text-gray-900">Draft</option>
                                  <option value="Active" className="bg-white text-gray-900">Active</option>
                                  <option value="Completed" className="bg-white text-gray-900">Completed</option>
                                  <option value="Cancelled" className="bg-white text-gray-900">Cancelled</option>
                                </select>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                                  <span className={`px-1.5 py-0.5 rounded border ${getPaymentBadge(cPaymentStatus)}`}>
                                    Pay: {cPaymentStatus}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded border ${getCarStatusBadge(cCarStatus)}`}>
                                    Car: {cCarStatus}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Actions Column (Matches Clients Page) */}
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-1 transition-opacity">
                                <button 
                                  className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer" 
                                  title="View Details" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedContractForDetails(contract);
                                    setIsDetailsModalOpen(true);
                                  }}
                                >
                                  <Eye size={16} />
                                </button>
                                <button 
                                  className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer" 
                                  title="Edit Contract" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTarget(contract);
                                    setIsContractModalOpen(true);
                                  }}
                                >
                                  <Edit size={16} />
                                </button>
                                {contract.status === "Active" && (
                                  <Link 
                                    href={`/bookings/return?contractId=${contract._id}`}
                                    className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center" 
                                    title="Return Vehicle" 
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ArrowLeftRight size={16} />
                                  </Link>
                                )}
                                <button 
                                  className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer" 
                                  title="Print Contract PDF" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/bookings/${contract._id}/print`, '_blank');
                                  }}
                                >
                                  <Download size={16} />
                                </button>
                                <div className="w-px h-5 bg-border mx-1" />
                                <button 
                                  className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                                  title="Delete Contract" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setContractToDelete(contract);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination (Matches Clients Page exactly) */}
              <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-white">
                <p>
                  Showing{" "}
                  <span className="font-medium text-text-primary">
                    {filteredContracts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-text-primary">
                    {Math.min(currentPage * itemsPerPage, filteredContracts.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-text-primary">
                    {filteredContracts.length}
                  </span>{" "}
                  contracts
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

      {/* Delete Confirmation Modal (Matches Clients Page UI/UX) */}
      {isDeleteDialogOpen && contractToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Contract
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete contract{" "}
              <strong className="text-gray-900 font-bold">#{contractToDelete.id || contractToDelete._id?.substring(0, 8)}</strong>
              {contractToDelete.customer && (
                <> for client <strong className="text-gray-900 font-bold">{contractToDelete.customer}</strong></>
              )}
              {contractToDelete.vehicle && (
                <> ({contractToDelete.vehicle})</>
              )}
              ? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setContractToDelete(null);
                }}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Contract Modal */}
      <CreateContractModal 
        isOpen={isContractModalOpen} 
        contractToEdit={editTarget}
        onClose={() => {
          setIsContractModalOpen(false);
          setEditTarget(null);
        }} 
        onSuccess={() => {
          setIsContractModalOpen(false);
          setEditTarget(null);
          toast.success("Contract saved successfully");
          fetchContracts();
        }}
      />

      {/* Contract Details Modal */}
      <ContractDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedContractForDetails(null);
        }}
        contract={selectedContractForDetails}
        onEdit={(contractToEdit) => {
          setIsDetailsModalOpen(false);
          setEditTarget(contractToEdit);
          setIsContractModalOpen(true);
        }}
      />
    </div>
  );
}
