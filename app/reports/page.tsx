"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Filter, Download, Trash2, FileText, Calendar, PieChart, TrendingUp, Users, Loader2, AlertCircle } from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Date Timeline Selector state
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]);

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
      const res = await fetch("/api/reports", { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch reports (${res.status})`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(`Reports fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
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
      const sDate = new Date(startDate).toLocaleDateString();
      const eDate = new Date(endDate).toLocaleDateString();
      
      let reportName = `${type} (${sDate} - ${eDate})`;
      
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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget._id);
      const res = await fetch(`/api/reports/${deleteTarget._id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Report deleted successfully");
        setReports((prev) => prev.filter((r) => r._id !== deleteTarget._id));
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

  return (
    <div className="space-y-6">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">Generate timeline-based reports and export your data as CSV files.</p>
        </div>
      </div>

      {/* Timeline Selector */}
      <div className="bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col md:flex-row items-end gap-4 animate-fade-in-up stagger-1">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-text-secondary mb-2">Select Timeline: Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="date"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-text-secondary mb-2">Select Timeline: End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="date"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Generation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up stagger-2">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          const isGenerating = generatingType === rt.name;

          return (
            <div 
              key={rt.name} 
              className={`bg-card p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between transition-all group ${
                isGenerating ? 'opacity-70 pointer-events-none' : 'hover:shadow-md hover:border-brand/30 cursor-pointer'
              }`}
              onClick={() => handleGenerateReport(rt.name)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl ${rt.bg} flex items-center justify-center`}>
                  {isGenerating ? <Loader2 size={24} className={`animate-spin ${rt.color}`} /> : <Icon size={24} className={rt.color} />}
                </div>
                <div className=" transition-opacity">
                  <span className="text-[10px] uppercase font-bold text-brand bg-brand/10 px-2 py-1 rounded-md">Generate</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">{rt.name}</h3>
                <p className="text-xs text-text-secondary mt-1 line-clamp-2">Generate a CSV report for the selected timeline.</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generated Reports Table */}
      <div className="flex flex-col gap-6 animate-fade-in-up stagger-3">
        {/* Toolbar */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText size={20} className="text-text-muted" /> Generated Reports History
          </h2>
          <div className="relative max-w-sm w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Search reports..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm" 
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-20">
              <Loader2 size={32} className="text-brand animate-spin mb-3" />
              <p className="text-text-secondary text-sm">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <FileText size={28} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">No reports generated</h3>
              <p className="text-text-secondary text-sm max-w-sm">Select a timeline and click one of the cards above to generate a downloadable CSV report.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Report Name & Timeline</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Type</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Generated On</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Status</th>
                  <th className="text-right py-3 px-4 text-text-muted font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredReports = reports.filter(r => 
                    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    r.type.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
                  const paginatedReports = filteredReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  return (
                    <>
                      {paginatedReports.map((r, idx) => (
                        <tr key={r._id} className="border-b border-border/50 bg-white animate-fade-in-up" style={{ animationDelay: `${idx * 0.05 + 0.3}s` }}>
                          <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-brand" />
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">{r.name}</div>
                          <div className="text-xs text-text-secondary mt-0.5">ID: {r._id.slice(-6)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-text-secondary">
                      {r.type}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(r.dateGenerated).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge variant={r.status.toLowerCase() as any} text={r.status} />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2  transition-opacity">
                        <a 
                          href={`/api/reports/${r._id}/download`} 
                          download
                          className="p-2 text-brand hover:bg-brand/10 rounded-lg transition-colors cursor-pointer"
                          title="Download CSV"
                        >
                          <Download size={18} />
                        </a>
                        <button 
                          onClick={() => setDeleteTarget(r)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Report"
                          disabled={deletingId === r._id}
                        >
                          {deletingId === r._id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </>
                );
              })()}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-white">
          <p>
            Showing{" "}
            <span className="font-medium text-text-primary">
              {reports.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-text-primary">
              {Math.min(currentPage * itemsPerPage, reports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase())).length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-text-primary">
              {reports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase())).length}
            </span>{" "}
            reports
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
              onClick={() => {
                const totalFiltered = reports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase())).length;
                setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalFiltered / itemsPerPage)));
              }}
              disabled={currentPage >= Math.ceil(reports.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase())).length / itemsPerPage)}
              className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
                className="flex-1 py-2.5 rounded-xl border border-border font-semibold text-text-primary hover:bg-gray-50 transition-colors"
                disabled={!!deletingId}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
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
