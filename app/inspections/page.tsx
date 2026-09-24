"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  Camera,
  Gauge,
  Fuel as FuelIcon,
  AlertTriangle,
  CheckCircle,
  SplitSquareHorizontal,
  Loader2,
  AlertCircle,
  Trash2,
  Edit,
  ArrowRight,
  ArrowLeft,
  MoreHorizontal,
  X,
  MapPin,
  Wallet,
  TrendingUp,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  ChevronDown
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/providers/ToastProvider";
import CreateInspectionModal from "@/components/modals/CreateInspectionModal";

const ANGLES = ["Front View", "Rear View", "Left Side", "Right Side", "Dashboard / Mileage", "Front Interior", "Rear Interior", "Trunk / Boot"];

export default function InspectionsPage() {
  const toast = useToast();
  const [inspections, setInspections] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"list" | "compare">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Compare tab state
  const [compareContractId, setCompareContractId] = useState<string>("");
  
  // Image Lightbox state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchData = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      setError(null);

      // Fetch both in parallel and wait for BOTH to finish
      const [inspectionsResult, contractsResult] = await Promise.allSettled([
        fetch("/api/inspections", { cache: "no-store" }).then(res => {
          if (!res.ok) throw new Error("Failed to fetch inspections");
          return res.json();
        }),
        fetch("/api/contracts", { cache: "no-store" }).then(res => {
          if (!res.ok) throw new Error("Failed to fetch contracts");
          return res.json();
        })
      ]);

      // Process inspections
      if (inspectionsResult.status === "fulfilled") {
        setInspections(inspectionsResult.value);
      } else {
        throw new Error(inspectionsResult.reason?.message || "Failed to fetch inspections");
      }

      // Process contracts
      if (contractsResult.status === "fulfilled") {
        setContracts(contractsResult.value.contracts || []);
      } else {
        // Contracts failing is non-critical, log and continue
        console.warn("Contracts fetch failed:", contractsResult.reason);
        setContracts([]);
      }
    } catch (err: any) {
      console.error(`Inspections loading error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchData(retryCount + 1);
      }
      setError(err.message || "Failed to load inspections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/inspections/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || "Failed to delete inspection");
      }

      setInspections((prev) => prev.filter((insp) => insp._id !== deleteTarget._id));
      toast.success(`Inspection log deleted successfully.`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  // Search filtering
  const filteredContracts = useMemo(() => {
    return contracts.filter((c: any) => {
      const q = searchQuery.toLowerCase();
      const vehicleName = c.vehicle?.toLowerCase() || "";
      const driverName = c.driver?.toLowerCase() || "";
      const contractId = c.id?.toLowerCase() || "";
      const customerName = c.customer?.toLowerCase() || "";

      const matchesSearch = (
        vehicleName.includes(q) ||
        driverName.includes(q) ||
        contractId.includes(q) ||
        customerName.includes(q)
      );
      const matchesStatus = statusFilter === "All" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const paginatedContracts = useMemo(() => {
    return filteredContracts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  // Contracts that have at least one logged inspection
  const contractsWithInspections = useMemo(() => {
    const ids = new Set(inspections.map((insp) => insp.contractId?._id));
    return contracts.filter((c) => ids.has(c._id));
  }, [contracts, inspections]);

  // Set default comparison contract once list loads
  useEffect(() => {
    if (contractsWithInspections.length > 0 && !compareContractId) {
      setCompareContractId(contractsWithInspections[0]._id);
    }
  }, [contractsWithInspections, compareContractId]);

  // Get before & after inspections for the selected contract in comparison
  const comparisonInspections = useMemo(() => {
    if (!compareContractId) return { before: null, after: null };
    const contractInsps = inspections.filter(
      (insp) => insp.contractId?._id === compareContractId
    );
    const before = contractInsps.find((insp) => insp.type === "Before Rental") || null;
    const after = contractInsps.find((insp) => insp.type === "After Rental") || null;
    return { before, after };
  }, [inspections, compareContractId]);

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
              fetchData();
            }}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedContract = useMemo(() => {
    return contracts.find((c: any) => c._id === compareContractId) || null;
  }, [contracts, compareContractId]);

  const pickupMileage = selectedContract?.checkoutMileage ?? selectedContract?.unitMileage ?? 0;
  const returnMileage = selectedContract?.returnOdometer ?? 0;
  const distance = (returnMileage > 0 && pickupMileage > 0) ? Math.max(0, returnMileage - pickupMileage) : 0;
  const isUnlimited = !(selectedContract?.dailyKmLimit > 0);
  const allowance = isUnlimited ? 0 : (selectedContract?.dailyKmLimit || 0) * (selectedContract?.totalDays || 1);
  const overLimit = isUnlimited ? 0 : Math.max(0, distance - allowance);
  const extraFee = overLimit * (selectedContract?.pricePerExtraKm || 0);

  return (
    <div className="space-y-6">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Inspections</h1>
          <p className="text-sm text-text-secondary mt-1">
            Track and compare vehicle condition logs.
          </p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          <div className="col-span-12">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-gray-50 animate-pulse"
            >
              <div className="w-12 h-6 bg-gray-100 rounded-md"></div>
              <div className="flex-1 space-y-2">
                <div className="w-40 h-4 bg-gray-200 rounded-full"></div>
                <div className="w-24 h-3 bg-gray-100 rounded-full"></div>
              </div>
              <div className="w-24 h-4 bg-gray-100 rounded-full"></div>
              <div className="w-16 h-6 bg-gray-100 rounded-md"></div>
            </div>
          ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-1">
          <div className="col-span-12 flex flex-col gap-6">
            {/* Toolbar */}
            <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
              <div className="relative max-w-sm w-full">
                <input
                  type="text"
                  placeholder="Search vehicle, driver, contract ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                />
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                />
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
                    {["All", "Draft", "Active", "Completed", "Cancelled"].map((status) => (
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

            {/* List Tab Content */}
            {activeTab === "list" && (
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-text-muted font-semibold whitespace-nowrap">Contract ID</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Vehicle</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Client</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Driver</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-text-muted font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 px-5 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <SplitSquareHorizontal size={32} className="text-gray-300 mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">No contracts found</h2>
                            <p className="text-gray-500 text-sm mb-4">
                              {searchQuery || statusFilter !== "All" ? "No contracts match your search criteria." : "You haven't added any contracts yet."}
                            </p>
                            {(searchQuery || statusFilter !== "All") && (
                              <button
                                onClick={() => { setSearchQuery(""); setStatusFilter("All"); }}
                                className="px-4 py-2 text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedContracts.map((c: any) => (
                        <tr
                          key={c._id}
                          className="border-b border-border/50 bg-white animate-fade-in-up hover:bg-gray-50/50"
                        >
                          <td className="py-3 px-4">
                            <span className="font-bold text-text-primary">{c.id}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-text-primary">{c.vehicle}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-text-primary">{c.customer}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-text-primary">{c.driver}</span>
                          </td>
                          <td className="py-3 px-4">
                            <StatusBadge variant={c.status?.toLowerCase() as any} text={c.status} />
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setCompareContractId(c._id);
                                  setActiveTab("compare");
                                }}
                                className="p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer"
                                title="Compare Inspections"
                              >
                                <SplitSquareHorizontal size={16} />
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
            )}

            {/* Compare Tab Content */}
            {activeTab === "compare" && (
              <div className="space-y-6 animate-fade-in-up">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveTab("list")}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-text-muted hover:text-text-primary"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h3 className="text-xl font-bold text-text-primary">Compare Inspections</h3>
                      <p className="text-sm text-text-secondary mt-0.5">Select a contract to see before and after.</p>
                    </div>
                  </div>
                  
                  <select
                    value={compareContractId}
                    onChange={(e) => setCompareContractId(e.target.value)}
                    className="text-sm border border-border rounded-xl px-4 py-2.5 bg-white text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand w-full sm:w-80 font-semibold shadow-sm cursor-pointer"
                  >
                    {contracts.length === 0 ? (
                      <option value="">No contracts available</option>
                    ) : (
                      contracts.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.id} — {c.vehicle} ({c.customer})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {!compareContractId ? (
                  <div className="flex flex-col items-center justify-center min-h-[40vh] bg-card rounded-2xl border border-border shadow-sm">
                    <SplitSquareHorizontal size={40} className="text-gray-200 mb-4" />
                    <p className="text-sm text-text-muted font-medium">
                      Log inspections first to view dynamic comparison side-by-side.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* Mileage Summary Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-border bg-gray-50/30">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                          <Gauge size={16} className="text-text-muted" />
                          Mileage Summary
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-muted">Pickup Mileage</span>
                            <span className="text-lg font-bold text-text-primary">
                              {pickupMileage > 0 ? `${pickupMileage.toLocaleString()} km` : "—"}
                            </span>
                            {selectedContract?.startDate && (
                              <span className="text-xs text-text-muted">
                                {new Date(selectedContract.startDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-muted">Return Mileage</span>
                            <span className="text-lg font-bold text-text-primary">
                              {returnMileage > 0 ? `${returnMileage.toLocaleString()} km` : "—"}
                            </span>
                            {selectedContract?.endDate && (
                              <span className="text-xs text-text-muted">
                                {new Date(selectedContract.endDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-text-muted">Total Distance</span>
                            <span className="text-lg font-bold text-text-primary">
                              {pickupMileage > 0 && returnMileage > 0
                                ? `${distance.toLocaleString()} km`
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trip Statistics Card */}
                    {selectedContract && (
                      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-gray-50/30">
                          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            <TrendingUp size={16} className="text-text-muted" />
                            Trip Statistics
                          </h3>
                        </div>
                        <div className="divide-y divide-border">
                          {/* KM Allowance */}
                          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 w-48 shrink-0">
                              <MapPin size={16} className="text-text-muted" />
                              <span className="text-sm font-medium text-text-muted">KM Allowance</span>
                            </div>
                            <span className="text-sm font-semibold text-text-primary">
                              {isUnlimited ? "Unlimited" : `${allowance.toLocaleString()} km`}
                            </span>
                          </div>
                          {/* Over-limit */}
                          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 w-48 shrink-0">
                              <AlertTriangle size={16} className="text-text-muted" />
                              <span className="text-sm font-medium text-text-muted">Over-limit</span>
                            </div>
                            <span className={`text-sm font-semibold ${!isUnlimited && overLimit > 0 ? "text-red-600" : "text-text-primary"}`}>
                              {isUnlimited ? "N/A" : `${overLimit.toLocaleString()} km`}
                            </span>
                          </div>
                          {/* Extra Fee */}
                          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-3 w-48 shrink-0">
                              <Wallet size={16} className="text-text-muted" />
                              <span className="text-sm font-medium text-text-muted">Extra Fee</span>
                            </div>
                            <span className={`text-sm font-semibold ${!isUnlimited && extraFee > 0 ? "text-red-600" : "text-text-primary"}`}>
                              ${!isUnlimited ? extraFee.toFixed(2) : "0.00"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Visual Comparison Card */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-border bg-gray-50/30">
                        <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                          <Camera size={16} className="text-text-muted" />
                          Visual Comparison
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {ANGLES.map((angle, idx) => {
                            const beforeImg = comparisonInsps().before?.photos?.[idx] || comparisonInsps().before?.contractId?.inspectionPhotos?.[idx];
                            const afterImg = comparisonInsps().after?.photos?.[idx] || comparisonInsps().after?.contractId?.returnPhotos?.[idx];
                            
                            return (
                              <div key={angle} className="bg-gray-50/50 rounded-xl border border-border overflow-hidden">
                                <div className="px-3 py-2 bg-gray-100/50 border-b border-border">
                                  <p className="text-xs font-semibold text-text-secondary text-center truncate">{angle}</p>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-border">
                                  {/* Before */}
                                  <div
                                    className="aspect-square relative cursor-pointer group"
                                    onClick={() => beforeImg && setSelectedImage(beforeImg)}
                                  >
                                    {beforeImg ? (
                                      <>
                                        <img src={beforeImg} alt={`${angle} before`} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                                        <div className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm text-gray-700">Before</div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-1 bg-white">
                                        <Camera size={16} className="opacity-40" />
                                        <span className="text-[10px] font-medium">No Photo</span>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* After */}
                                  <div
                                    className="aspect-square relative cursor-pointer group"
                                    onClick={() => afterImg && setSelectedImage(afterImg)}
                                  >
                                    {afterImg ? (
                                      <>
                                        <img src={afterImg} alt={`${angle} after`} className="w-full h-full object-cover group-hover:opacity-90 transition-opacity" />
                                        <div className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm text-gray-700">After</div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center text-text-muted gap-1 bg-white">
                                        <Camera size={16} className="opacity-40" />
                                        <span className="text-[10px] font-medium">No Photo</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Damages Report Card */}
                    {comparisonInsps().after && (
                      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-gray-50/30">
                          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                            {comparisonInsps().after.damages && comparisonInsps().after.damages !== "None" 
                              ? <ShieldAlert size={16} className="text-red-500" />
                              : <ShieldCheck size={16} className="text-emerald-500" />
                            }
                            Health & Damages Report
                          </h3>
                        </div>
                        <div className="p-6">
                          {comparisonInsps().after.damages && comparisonInsps().after.damages !== "None" ? (
                            <div className="flex flex-col gap-4">
                              <p className="text-sm font-semibold text-text-primary">
                                The following damages were reported upon return:
                              </p>
                              <p className="text-sm text-red-600 bg-red-50 border border-red-100 p-4 rounded-xl">
                                {comparisonInsps().after.damages}
                              </p>
                              {comparisonInsps().after.contractId?.damageCharge > 0 && (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-medium text-text-muted">Penalty Charge Applied:</span>
                                  <span className="text-sm font-bold text-red-600">${comparisonInsps().after.contractId.damageCharge.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 text-emerald-600">
                              <CheckCircle size={20} />
                              <span className="text-sm font-medium">Vehicle was returned clean with no damages reported.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Inspection
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete inspection log{" "}
              <strong className="text-gray-900 font-bold">{deleteTarget.inspectionId}</strong>
              {deleteTarget.vehicle ? ` for ${deleteTarget.vehicle}` : ""}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {deleting ? (
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
      {/* Fullscreen Image Viewer Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-all"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
          >
            <X size={24} />
          </button>
          <img 
            src={selectedImage} 
            alt="Fullscreen view" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
      
      {/* Edit Modal */}
      <CreateInspectionModal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          fetchData();
        }}
        inspectionToEdit={editTarget}
      />
    </div>
  );

  // Helper method for accessing comparison states
  function comparisonInsps() {
    return comparisonInspections;
  }
}
