"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, Edit, Trash2, ChevronDown } from "lucide-react";
import CreateDamageModal from "@/components/modals/CreateDamageModal";
import DeleteConfirmModal from "@/components/modals/DeleteConfirmModal";

interface DamageResponse {
  _id: string;
  damageId: string;
  unitId: {
    _id: string;
    brand: string;
    model: string;
    plateNumber: string;
  };
  contractId?: {
    _id: string;
    contractId: string;
  };
  description: string;
  cost: number;
  status: "Pending" | "Repaired";
  photos: string[];
  reportedByRole?: string;
  reportedByName?: string;
}

export default function DamagesPage() {
  const [damages, setDamages] = useState<DamageResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [damageToEdit, setDamageToEdit] = useState<DamageResponse | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDamages();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchDamages = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      const res = await fetch("/api/damages", { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch damages");
      const data = await res.json();
      setDamages(data);
      setError("");
    } catch (err: any) {
      console.error(`Damages fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchDamages(retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalState.id) return;
    
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/damages/${deleteModalState.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete damage");
      
      setDeleteModalState({ isOpen: false, id: null });
      fetchDamages();
    } catch (err: any) {
      console.error(err);
      alert("Error deleting damage");
    } finally {
      setIsDeleting(false);
    }
  };
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/damages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchDamages();
    } catch (err: any) {
      console.error(err);
      alert("Error updating status");
    }
  };

  const filteredDamages = damages.filter((damage) => {
    const q = searchQuery.toLowerCase();
    const vehicleName = damage.unitId ? `${damage.unitId.brand} ${damage.unitId.model} (${damage.unitId.plateNumber})`.toLowerCase() : "";
    const contractName = damage.contractId ? (damage.contractId.contractId?.toLowerCase() || damage.contractId._id.substring(0, 8).toLowerCase()) : "";
    
    const matchesSearch = vehicleName.includes(q) || contractName.includes(q) || (damage.description?.toLowerCase().includes(q) ?? false);
    const matchesStatus = statusFilter === "All" || damage.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredDamages.length / itemsPerPage);
  const paginatedDamages = filteredDamages.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
    <div className="space-y-6">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Damages</h1>
          <p className="text-sm text-text-secondary mt-1">Track vehicle damages, repair costs, and insurance claims.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setDamageToEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus size={16} /> Add Damage
          </button>
        </div>
      </div>

      {/* Damages Table */}
      <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-1">
        <div className="col-span-12 flex flex-col gap-6">
          {/* Toolbar */}
          <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
            <div className="relative max-w-sm w-full">
              <input 
                type="text" 
                placeholder="Search vehicle, contract..." 
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
                  {["All", "Pending", "Repaired"].map((status) => (
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
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Contract</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Damage Description</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Reported By</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Repair Cost</th>
                    <th className="text-left py-3 px-4 text-text-muted font-semibold">Status</th>
                    <th className="text-right py-3 px-4 text-text-muted font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    Loading damages...
                  </td>
                </tr>
              ) : filteredDamages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-5 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Search size={32} className="text-gray-300 mb-4" />
                      <h2 className="text-lg font-bold text-gray-900 mb-2">No damages found</h2>
                      <p className="text-gray-500 text-sm mb-4">
                        {searchQuery || statusFilter !== "All" ? "No damages match your search criteria." : "You haven't added any damages yet."}
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
                paginatedDamages.map((damage, idx) => {
                  const isDeducted = damage.status === "Repaired";
                  const vehicleName = damage.unitId ? `${damage.unitId.brand} ${damage.unitId.model} (${damage.unitId.plateNumber})` : "Unknown Vehicle";
                  const contractName = damage.contractId ? damage.contractId.contractId || damage.contractId._id.substring(0, 8).toUpperCase() : "N/A";
                  
                  return (
                    <tr key={damage._id} className="border-b border-border/50 bg-white animate-fade-in-up" style={{ animationDelay: `${idx * 0.05 + 0.3}s` }}>
                      <td className="py-3 px-4 font-bold text-text-primary">{vehicleName}</td>
                      <td className="py-3 px-4 font-medium text-text-secondary">{contractName}</td>
                      <td className="py-3 px-4 text-text-secondary truncate max-w-[200px]" title={damage.description}>
                        {damage.description}
                      </td>
                      <td className="py-3 px-4">
                        {damage.reportedByName ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary text-sm">{damage.reportedByName}</span>
                            {(damage.contractId as any)?.driverId?.email && (
                              <span className="text-xs text-text-muted">{(damage.contractId as any).driverId.email}</span>
                            )}
                            <span className="text-[11px] text-text-muted uppercase tracking-wider">{damage.reportedByRole}</span>
                          </div>
                        ) : damage.contractId && (damage.contractId as any).driverId ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary text-sm">{(damage.contractId as any).driverId.name}</span>
                            {(damage.contractId as any).driverId.email && (
                              <span className="text-xs text-text-muted">{(damage.contractId as any).driverId.email}</span>
                            )}
                            <span className="text-[11px] text-text-muted uppercase tracking-wider">DRIVER</span>
                          </div>
                        ) : (
                          <span className="text-text-muted italic text-sm">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-red-600">${damage.cost}</td>
                      <td className="py-3 px-4">
                        <select
                          value={damage.status}
                          onChange={(e) => handleStatusChange(damage._id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors cursor-pointer ${
                            damage.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          <option value="Pending" className="text-gray-900 bg-white">Pending</option>
                          <option value="Repaired" className="text-gray-900 bg-white">Repaired</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1  transition-opacity">
                          <button 
                            onClick={() => {
                              setDamageToEdit(damage);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer" 
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <div className="w-px h-5 bg-border mx-1" />
                          <button 
                            onClick={() => setDeleteModalState({ isOpen: true, id: damage._id })}
                            className="p-2 text-text-muted hover:text-brand hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                            title="Delete"
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

          {/* Pagination */}
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-white">
            <p>
              Showing{" "}
              <span className="font-medium text-text-primary">
                {filteredDamages.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-text-primary">
                {Math.min(currentPage * itemsPerPage, filteredDamages.length)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-text-primary">
                {filteredDamages.length}
              </span>{" "}
              damages
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
    </div>

      <CreateDamageModal 
        isOpen={isCreateModalOpen} 
        onClose={() => {
          setIsCreateModalOpen(false);
          setDamageToEdit(null);
        }} 
        onSuccess={fetchDamages}
        damageToEdit={damageToEdit}
      />

      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Damage Record"
        itemName={(() => {
          const d = damages.find((item: any) => item._id === deleteModalState.id);
          return d ? `${d.description || "Damage record"} ($${d.cost || 0})` : "this damage record";
        })()}
        isLoading={isDeleting}
      />
    </>
  );
}
