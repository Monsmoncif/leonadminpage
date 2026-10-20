"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Search, 
  Download, 
  Trash2, 
  FileText, 
  Calendar, 
  PieChart, 
  TrendingUp, 
  Users, 
  Loader2, 
  AlertCircle, 
  Pencil, 
  Eye, 
  X, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import TablePagination from "@/components/ui/TablePagination";
import { useToast } from "@/components/providers/ToastProvider";

interface ReportResponse {
  _id: string;
  name: string;
  type: string;
  startDate?: string;
  endDate?: string;
  dateGenerated: string;
  status: "Generated" | "Pending";
}

export default function ReportsPage() {
  const toast = useToast();
  const [reports, setReports] = useState<ReportResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReportResponse | null>(null);

  // View & Edit Modal States
  const [viewingReport, setViewingReport] = useState<ReportResponse | null>(null);
  const [editingReport, setEditingReport] = useState<ReportResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editStatus, setEditStatus] = useState<"Generated" | "Pending">("Generated");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Date Timeline Selector state for new reports
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]
  );

  const reportTypes = [
    { name: "Financial & Revenue", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
    { name: "Vehicle Utilization", icon: ExecutiveCarIcon, color: "text-blue-500", bg: "bg-blue-50" },
    { name: "Customer Analytics", icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    { name: "Damage & Maintenance", icon: PieChart, color: "text-orange-500", bg: "bg-orange-50" },
  ];

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      const res = await fetch("/api/reports", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Reports fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise((res) => setTimeout(res, delay));
        return fetchReports(retryCount + 1);
      }
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (type: string) => {
    if (!startDate || !endDate) {
      return toast.error("Please select a valid timeline (Start Date and End Date).");
    }

    try {
      setGeneratingType(type);
      const sDate = new Date(startDate).toLocaleDateString("en-GB");
      const eDate = new Date(endDate).toLocaleDateString("en-GB");
      
      const reportName = `${type} (${sDate} - ${eDate})`;
      
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: reportName, 
          type, 
          startDate, 
          endDate 
        }),
      });

      if (res.ok) {
        toast.success(`${type} generated successfully!`);
        fetchReports();
      } else {
        toast.error("Failed to generate report");
      }
    } catch (err) {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingType(null);
    }
  };

  const handleOpenEdit = (report: ReportResponse) => {
    setEditingReport(report);
    setEditName(report.name);
    setEditType(report.type);
    setEditStartDate(report.startDate ? new Date(report.startDate).toISOString().split("T")[0] : "");
    setEditEndDate(report.endDate ? new Date(report.endDate).toISOString().split("T")[0] : "");
    setEditStatus(report.status || "Generated");
  };

  const handleSaveEdit = async () => {
    if (!editingReport) return;
    if (!editName.trim()) {
      return toast.error("Report name cannot be empty");
    }

    try {
      setIsSavingEdit(true);
      const res = await fetch(`/api/reports/${editingReport._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          startDate: editStartDate || undefined,
          endDate: editEndDate || undefined,
          status: editStatus,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setReports((prev) =>
          prev.map((r) => (r._id === updated._id ? { ...r, ...updated } : r))
        );
        if (viewingReport?._id === updated._id) {
          setViewingReport({ ...viewingReport, ...updated });
        }
        toast.success("Report updated successfully");
        setEditingReport(null);
      } else {
        toast.error("Failed to update report");
      }
    } catch (err) {
      toast.error("Failed to update report");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget._id);
      const res = await fetch(`/api/reports/${deleteTarget._id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Report deleted successfully");
        setReports((prev) => prev.filter((r) => r._id !== deleteTarget._id));
        if (viewingReport?._id === deleteTarget._id) {
          setViewingReport(null);
        }
      } else {
        toast.error("Failed to delete report");
      }
    } catch (err) {
      toast.error("Failed to delete report");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  // Filter & Pagination Logic
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.type?.toLowerCase().includes(q) ||
        r._id?.toLowerCase().includes(q) ||
        r.status?.toLowerCase().includes(q)
      );
    });
  }, [reports, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / itemsPerPage));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(start, start + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Generate timeline-based reports, view summaries, edit report configurations, and export data as CSV.
          </p>
        </div>
      </div>

      {/* Timeline Selector */}
      <div className="bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-xs sm:shadow-sm flex flex-col md:flex-row items-end gap-4 animate-fade-in-up stagger-1">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
            Timeline Start Date (تاريخ البداية)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
            <input 
              type="date"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
            Timeline End Date (تاريخ النهاية)
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
            <input 
              type="date"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-border rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 animate-fade-in-up stagger-2">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          const isGenerating = generatingType === rt.name;

          return (
            <div 
              key={rt.name} 
              className={`bg-card p-5 sm:p-6 rounded-2xl border border-border shadow-xs sm:shadow-sm flex flex-col justify-between transition-all group ${
                isGenerating ? "opacity-70 pointer-events-none" : "hover:shadow-md hover:border-brand/40 cursor-pointer active:scale-[0.99]"
              }`}
              onClick={() => handleGenerateReport(rt.name)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${rt.bg} flex items-center justify-center shrink-0 shadow-2xs`}>
                  {isGenerating ? (
                    <Loader2 size={22} className={`animate-spin ${rt.color}`} />
                  ) : (
                    <Icon size={22} className={rt.color} />
                  )}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                    Generate
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-sm sm:text-base group-hover:text-brand transition-colors">
                  {rt.name}
                </h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                  Generate full CSV records for the selected timeline.
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated Reports Table Container */}
      <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in-up stagger-3">
        {/* Table Toolbar */}
        <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-xs sm:shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <FileText size={20} className="text-brand" />
              <span>Generated Reports History</span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Review, edit metadata, inspect, and download generated analytical reports.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-xs sm:text-sm border border-border rounded-xl pl-9 pr-8 py-2 bg-gray-50/50 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all" 
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-0.5 rounded-full"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-card rounded-2xl border border-border shadow-xs sm:shadow-sm overflow-hidden">
          <div className="overflow-x-auto min-h-[320px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <Loader2 size={32} className="text-brand animate-spin mb-3" />
                <p className="text-text-secondary text-xs sm:text-sm font-medium">Loading reports history...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 border border-dashed border-gray-300">
                  <FileText size={26} className="text-gray-400" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-text-primary mb-1">
                  {searchQuery ? "No matching reports found" : "No reports generated yet"}
                </h3>
                <p className="text-text-secondary text-xs max-w-sm mb-4">
                  {searchQuery 
                    ? "No reports match your search query. Try searching by name, type, or ID."
                    : "Select a date timeline above and click one of the generation cards to create your first report."}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 py-1.5 text-xs font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-xs sm:text-sm text-left">
                <thead>
                  <tr className="border-b border-border/80 bg-gray-50/75 text-text-muted font-semibold text-[11px] sm:text-xs">
                    <th className="py-3 px-4">Report Name & ID</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Timeline Covered</th>
                    <th className="py-3 px-4">Generated On</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedReports.map((r, idx) => {
                    const startStr = r.startDate ? new Date(r.startDate).toLocaleDateString("en-GB") : null;
                    const endStr = r.endDate ? new Date(r.endDate).toLocaleDateString("en-GB") : null;

                    return (
                      <tr 
                        key={r._id} 
                        className="bg-white hover:bg-gray-50/75 transition-colors animate-fade-in-up" 
                        style={{ animationDelay: `${idx * 0.03 + 0.05}s` }}
                      >
                        {/* Report Name & ID */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
                              <FileText size={17} />
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-md">
                              <div className="font-bold text-text-primary text-xs sm:text-sm truncate" title={r.name}>
                                {r.name}
                              </div>
                              <div className="text-[10.5px] text-text-muted font-mono mt-0.5">
                                #{r._id.slice(-6).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-text-primary text-xs">
                            {r.type}
                          </span>
                        </td>

                        {/* Timeline */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {startStr && endStr ? (
                            <div className="text-xs text-text-secondary flex items-center gap-1.5 tabular-nums">
                              <Calendar size={13} className="text-text-muted shrink-0" />
                              <span>{startStr} – {endStr}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-text-muted font-normal">All Time</span>
                          )}
                        </td>

                        {/* Generated On */}
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-text-secondary tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-text-muted shrink-0" />
                            <span>{new Date(r.dateGenerated).toLocaleDateString("en-GB")} {new Date(r.dateGenerated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <StatusBadge variant={r.status.toLowerCase() as any} text={r.status} />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setViewingReport(r)}
                              className="p-1.5 sm:p-2 text-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="View Report Overview"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Edit Report */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 sm:p-2 text-text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer"
                              title="Edit Report Details"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* Download CSV */}
                            <a 
                              href={`/api/reports/${r._id}/download`} 
                              download
                              className="p-1.5 sm:p-2 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Download CSV"
                            >
                              <Download size={16} />
                            </a>

                            <div className="w-px h-3.5 bg-border mx-0.5" />

                            {/* Delete Report */}
                            <button 
                              type="button"
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 sm:p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete Report"
                              disabled={deletingId === r._id}
                            >
                              {deletingId === r._id ? (
                                <Loader2 size={16} className="animate-spin text-red-600" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* TablePagination Component matching Clients, Bookings & Units */}
          {!loading && filteredReports.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredReports.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              itemLabel="reports"
            />
          )}
        </div>
      </div>

      {/* ===== Edit Report Modal ===== */}
      {editingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border p-6 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                  <Pencil size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Edit Report Details</h3>
                  <p className="text-xs text-text-muted">Modify report title, type, date range, or status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              {/* Report Name */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Report Title
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-border rounded-xl font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  placeholder="e.g. Financial & Revenue Q3"
                />
              </div>

              {/* Report Type */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Report Category / Type
                </label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-border rounded-xl font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                >
                  {reportTypes.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50/70 border border-border rounded-xl font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-50/70 border border-border rounded-xl font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as "Generated" | "Pending")}
                  className="w-full px-3.5 py-2.5 bg-gray-50/70 border border-border rounded-xl font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all cursor-pointer"
                >
                  <option value="Generated">Generated (Ready for Download)</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-border/80 pt-3 mt-2">
              <button
                type="button"
                onClick={() => setEditingReport(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold text-text-secondary hover:bg-gray-100 transition-colors cursor-pointer"
                disabled={isSavingEdit}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== View Details Modal ===== */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border p-6 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200/60">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Report Overview</h3>
                  <p className="text-xs text-text-muted">ID: #{viewingReport._id.slice(-6).toUpperCase()}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-100 text-xs sm:text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Report Name</span>
                <span className="font-bold text-text-primary text-sm mt-0.5 block">{viewingReport.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Type</span>
                  <span className="font-semibold text-text-primary mt-0.5 block">{viewingReport.type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Status</span>
                  <div className="mt-1">
                    <StatusBadge variant={viewingReport.status.toLowerCase() as any} text={viewingReport.status} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60">
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Timeline Start</span>
                  <span className="font-medium text-text-secondary mt-0.5 block tabular-nums">
                    {viewingReport.startDate ? new Date(viewingReport.startDate).toLocaleDateString("en-GB") : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Timeline End</span>
                  <span className="font-medium text-text-secondary mt-0.5 block tabular-nums">
                    {viewingReport.endDate ? new Date(viewingReport.endDate).toLocaleDateString("en-GB") : "N/A"}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-200/60">
                <span className="text-[10px] font-bold uppercase text-text-muted tracking-wider block">Generated On</span>
                <span className="font-medium text-text-secondary mt-0.5 block tabular-nums">
                  {new Date(viewingReport.dateGenerated).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-border/80 pt-3">
              <button
                type="button"
                onClick={() => {
                  const target = viewingReport;
                  setViewingReport(null);
                  handleOpenEdit(target);
                }}
                className="px-3.5 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold text-text-secondary hover:text-brand hover:border-brand/40 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil size={14} />
                <span>Edit Metadata</span>
              </button>

              <a
                href={`/api/reports/${viewingReport._id}/download`}
                download
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download size={15} />
                <span>Download CSV</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Delete Report</h3>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete report <strong className="text-gray-900 font-bold">"{deleteTarget.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex w-full gap-3">
              <button 
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-text-primary hover:bg-gray-50 transition-colors cursor-pointer"
                disabled={!!deletingId}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                disabled={!!deletingId}
              >
                {deletingId ? <><Loader2 size={16} className="animate-spin"/> Deleting...</> : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
