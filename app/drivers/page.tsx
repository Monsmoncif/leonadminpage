"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Clock,
  FileText,
  UserCircle,
  ShieldAlert,
  ShieldCheck,
  Users,
  Activity,
  Award,
  MoreHorizontal,
  Star,
  Calendar,
  AlertCircle,
  Loader2,
  Filter,
  ChevronDown
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/providers/ToastProvider";
import CreateDriverModal from "@/components/modals/CreateDriverModal";
import { useRouter } from "next/navigation";

const getInitials = (name: string) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return "bg-blue-100 text-blue-700";
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

// Status badge styling with vibrant, professional colors matching bookings page
const getDriverStatusClasses = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700 border-emerald-300 focus:ring-emerald-300";
    case "Deactivated":
    default:
      return "bg-gray-50 text-gray-700 border-gray-300 focus:ring-gray-300";
  }
};

export default function DriversPage() {
  const [data, setData] = useState<{ drivers: any[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const toast = useToast();
  const router = useRouter();

  const fetchDrivers = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    setLoading(true);
    try {
      const res = await fetch("/api/drivers", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch drivers data (${res.status})`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setData({ drivers: json, stats: {} });
      } else {
        setData(json);
      }
      setError(null);
    } catch (err: any) {
      console.error(`Drivers fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchDrivers(retryCount + 1);
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const targetId = deleteTarget._id || deleteTarget.driverModelId || deleteTarget.userId;
      const res = await fetch(`/api/drivers/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || "Failed to delete driver");
      }

      if (data) {
        const newDrivers = data.drivers.filter(
          (d: any) => d._id !== deleteTarget._id && d.driverModelId !== deleteTarget.driverModelId
        );
        setData({
          ...data,
          drivers: newDrivers,
          stats: {
            ...data.stats,
            totalDrivers: Math.max(0, (data.stats?.totalDrivers || 1) - 1),
            activeNow: deleteTarget.status === "Active" ? Math.max(0, (data.stats?.activeNow || 1) - 1) : (data.stats?.activeNow || 0),
          },
        });
      }
      toast.success(`${deleteTarget.name} deleted successfully.`);
      setDeleteTarget(null);
      await fetchDrivers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllConfirm = async () => {
    try {
      setDeleting(true);
      const res = await fetch("/api/drivers/all", {
        method: "DELETE",
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || "Failed to delete all drivers");
      }

      setData({
        drivers: [],
        stats: {
          ...data?.stats,
          totalDrivers: 0,
          activeNow: 0,
        },
      });
      toast.success("All drivers deleted successfully.");
      setIsDeleteAllOpen(false);
      await fetchDrivers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (driver: any, newStatus: string) => {
    try {
      const res = await fetch(`/api/drivers/${driver._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const resJson = await res.json();
        throw new Error(resJson.error || "Failed to update driver status");
      }
      toast.success(`Driver status updated to ${newStatus}`);
      fetchDrivers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update driver status");
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
              fetchDrivers();
            }}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-red-700 cursor-pointer transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const drivers = data?.drivers || [];
  const stats = data?.stats || {};

  const filteredDrivers = drivers.filter((driver: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      driver.name?.toLowerCase().includes(q) ||
      driver.email?.toLowerCase().includes(q) ||
      driver.phone?.includes(q) ||
      driver.driverId?.toLowerCase().includes(q) ||
      driver.license?.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);
  const paginatedDrivers = filteredDrivers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sparklineData = {
    total: [45, 48, 52, 55, 60, 62, 65],
    active: [30, 32, 35, 38, 42, 45, 48],
    contracts: [120, 130, 145, 155, 170, 185, 200],
    performance: [4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8],
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Drivers</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage driver profiles, licenses, and performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {drivers.length > 0 && (
            <button
              onClick={() => setIsDeleteAllOpen(true)}
              className="border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 size={16} /> Delete All Drivers
            </button>
          )}
          <button
            onClick={() => {
              setEditTarget(null);
              setIsModalOpen(true);
            }}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm hover:shadow-md cursor-pointer"
          >
            <Plus size={16} /> Add Driver
          </button>
        </div>
      </div>

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
              icon={Users}
              label="Total Drivers"
              value={stats.totalDrivers ?? 0}
              change={15}
              subtitle="vs last month"
              accentColor="#3B82F6"
              sparkData={sparklineData.total}
            />
          </div>
          <div className="stagger-2">
            <StatCard
              icon={Activity}
              label="Active Now"
              value={stats.activeNow ?? 0}
              change={8}
              subtitle="vs last month"
              accentColor="#22C55E"
              sparkData={sparklineData.active}
            />
          </div>
          <div className="stagger-3">
            <StatCard
              icon={FileText}
              label="Contracts Handled"
              value={stats.contractsCreated ?? 0}
              change={22}
              subtitle="vs last month"
              accentColor="#8B5CF6"
              sparkData={sparklineData.contracts}
            />
          </div>
          <div className="stagger-4">
            <StatCard
              icon={Award}
              label="Avg. Performance"
              value={stats.avgPerformance ? stats.avgPerformance.toFixed(1) : "0.0"}
              change={4}
              subtitle="vs last month"
              accentColor="#F59E0B"
              sparkData={sparklineData.performance}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          <div className="col-span-12">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 border-b border-gray-50 animate-pulse"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-32 h-4 bg-gray-200 rounded-full"></div>
                    <div className="w-48 h-3 bg-gray-100 rounded-full"></div>
                  </div>
                  <div className="w-24 h-4 bg-gray-100 rounded-full"></div>
                  <div className="w-16 h-6 bg-gray-100 rounded-md"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {!loading && drivers.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white rounded-2xl border border-dashed border-gray-300">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Users size={32} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            No drivers found
          </h2>
          <p className="text-gray-500 mb-6 text-center max-w-sm">
            You haven't added any drivers yet. Add your first driver to get
            started.
          </p>
          <button
            onClick={() => {
              setEditTarget(null);
              setIsModalOpen(true);
            }}
            className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
          >
            <Plus size={16} /> Add First Driver
          </button>
        </div>
      )}

      {!loading && drivers.length > 0 && (
        <div className="grid grid-cols-12 gap-6 animate-fade-in-up stagger-2">
          <div className="col-span-12 flex flex-col gap-6">
            {/* Toolbar */}
            <div className="relative z-20 bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
                <div className="relative max-w-sm w-full">
                  <input
                    type="text"
                    placeholder="Search by name, ID, or license..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm"
                  />
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
                  />
                </div>
                {/* Status filter removed */}
              </div>

              {/* Table */}
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50/50">
                      <th className="text-left py-3 px-4 text-text-muted font-semibold whitespace-nowrap">Driver</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Contact</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">License Info</th>
                      <th className="text-left py-3 px-4 text-text-muted font-semibold">Status</th>
                      <th className="text-right py-3 px-4 text-text-muted font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 px-5 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Users size={32} className="text-gray-300 mb-4" />
                            <h2 className="text-lg font-bold text-gray-900 mb-2">No drivers found</h2>
                            <p className="text-gray-500 text-sm mb-4">No drivers match your search criteria.</p>
                            <button
                              onClick={() => setSearchQuery("")}
                              className="px-4 py-2 text-sm font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                            >
                              Clear Search
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedDrivers.map((driver: any, idx: number) => (
                        <tr
                          key={driver._id}
                          className="border-b border-border/50 bg-white animate-fade-in-up"
                          style={{ animationDelay: `${idx * 0.05 + 0.3}s` }}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 shadow-sm ${getAvatarColor(
                                  driver.name
                                )}`}
                              >
                                {getInitials(driver.name)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-text-primary group-hover:text-brand transition-colors">
                                  {driver.name}
                                </span>
                                <span className="text-xs text-text-muted mt-0.5">
                                  ID: {driver.driverId}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-text-secondary flex items-center gap-1.5">
                              <Phone size={12} className="text-text-muted" />
                              {driver.phone}
                            </p>
                            <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1.5">
                              <Mail size={12} className="text-text-muted" />
                              {driver.email}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-text-secondary text-xs">
                              {driver.license}
                            </p>
                            <p className="text-text-muted text-[11px] mt-0.5">
                              Exp: {new Date(driver.licenseExpiry).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={driver.status}
                              onChange={(e) => handleStatusChange(driver, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 cursor-pointer shadow-2xs transition-colors ${getDriverStatusClasses(driver.status)}`}
                            >
                              <option value="Active" className="bg-white text-gray-900">Active</option>
                              <option value="Deactivated" className="bg-white text-gray-900">Deactivated</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-end gap-1  transition-opacity">
                              <button
                                className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="View Details"
                                onClick={() => router.push(`/drivers/${driver._id}`)}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className="p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit Driver"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTarget(driver);
                                  setIsModalOpen(true);
                                }}
                              >
                                <Edit size={16} />
                              </button>
                              <div className="w-px h-5 bg-border mx-1" />
                              <button
                                className="p-2 text-text-muted hover:text-brand hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Driver"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTarget(driver);
                                }}
                              >
                                <Trash2 size={16} />
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
                    {filteredDrivers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-text-primary">
                    {Math.min(currentPage * itemsPerPage, filteredDrivers.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-text-primary">
                    {filteredDrivers.length}
                  </span>{" "}
                  drivers
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

      {/* Create/Edit Driver Modal */}
      <CreateDriverModal 
        isOpen={isModalOpen}
        driverToEdit={editTarget}
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          toast.success(
            `Driver ${editTarget ? "updated" : "added"} successfully!`
          );
          setEditTarget(null);
          fetchDrivers();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Driver
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete driver{" "}
              <strong className="text-gray-900 font-bold">{deleteTarget.name}</strong>
              {deleteTarget.phone ? ` (${deleteTarget.phone})` : ""}? This action cannot be undone.
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

      {/* Delete All Confirmation Modal */}
      {isDeleteAllOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete All Drivers
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 font-bold">all drivers</strong>? This will permanently remove all driver profiles and credentials. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsDeleteAllOpen(false)}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 cursor-pointer transition-colors w-full bg-white shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllConfirm}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-2 w-full disabled:opacity-50 shadow-sm shadow-red-600/20"
              >
                {deleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
