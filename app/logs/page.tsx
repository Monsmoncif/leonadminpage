"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  LogIn, 
  FileText, 
  Trash2, 
  Edit, 
  Clock, 
  User, 
  Download, 
  ShieldCheck,
  AlertCircle,
  Loader2,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface LogResponse {
  _id: string;
  logId: string;
  user: string;
  role: string;
  action: string;
  description: string;
  ip: string;
  type: string;
  createdAt: string;
}

const getLogIcon = (type: string) => {
  switch (type) {
    case "auth": return <LogIn size={16} className="text-blue-500" />;
    case "create": return <FileText size={16} className="text-emerald-500" />;
    case "delete": return <Trash2 size={16} className="text-red-500" />;
    case "edit": return <Edit size={16} className="text-amber-500" />;
    default: return <AlertCircle size={16} className="text-gray-500" />;
  }
};

const getLogBg = (type: string) => {
  switch (type) {
    case "auth": return "bg-blue-50 border-blue-100";
    case "create": return "bg-emerald-50 border-emerald-100";
    case "delete": return "bg-red-50 border-red-100";
    case "edit": return "bg-amber-50 border-amber-100";
    default: return "bg-gray-50 border-gray-100";
  }
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return d.toLocaleString("en-US", { 
    month: "short", 
    day: "2-digit", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
};

export default function ActivityLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState<LogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LogResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    try {
      setLoading(true);
      const res = await fetch("/api/logs", { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to fetch logs (${res.status})`);
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      console.error(`Logs fetch error (attempt ${retryCount + 1}):`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
        await new Promise(res => setTimeout(res, delay));
        return fetchLogs(retryCount + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllLogs = async () => {
    try {
      setClearing(true);
      const res = await fetch("/api/logs", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear logs");
      toast.success("All activity logs cleared");
      setIsClearModalOpen(false);
      setLogs([]);
    } catch (error) {
      toast.error("Failed to clear logs");
      console.error(error);
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/logs/${deleteTarget._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete log");
      toast.success("Log deleted");
      setLogs(logs.filter(log => log._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Failed to delete log");
      console.error(error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* ===== Summary Header ===== */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activity Logs</h1>
          <p className="text-sm text-text-secondary mt-1">Track system events, user actions, and audit trails.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsClearModalOpen(true)}
            disabled={logs.length === 0}
            className="bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 size={16} /> Clear All Logs
          </button>
          <button className="bg-brand hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors shadow-sm hover:shadow-md cursor-pointer">
            <Download size={16} /> Export Logs
          </button>
        </div>
      </div>

      {/* Activity Logs Table Area */}
      <div className="col-span-12 flex flex-col gap-6 animate-fade-in-up stagger-1">
        {/* Toolbar */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col sm:flex-row justify-between gap-4 card-hover">
            <div className="relative max-w-sm w-full">
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search user, action, or description..." 
                className="w-full text-sm border border-border rounded-xl pl-10 pr-4 py-2.5 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-sm" 
              />
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            </div>
            <div className="flex items-center gap-2 relative">
              <button className="text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-sm cursor-pointer">
                <Filter size={14} className="text-text-muted" /> 
                Date Range
                <ChevronDown size={14} className="text-text-muted ml-1" />
              </button>
              <button className="text-sm border border-border rounded-xl px-3 py-2 text-text-secondary hover:bg-gray-50 flex items-center gap-2 font-medium transition-colors bg-white whitespace-nowrap shadow-sm cursor-pointer">
                <Filter size={14} className="text-text-muted" /> 
                Action Type
                <ChevronDown size={14} className="text-text-muted ml-1" />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden card-hover">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-text-muted font-semibold w-12">Action</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">User</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Description</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Time</th>
                  <th className="text-right py-3 px-4 text-text-muted font-semibold"></th>
                </tr>
              </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                (() => {
                  const filteredLogs = logs.filter(log => 
                    (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.description || "").toLowerCase().includes(searchTerm.toLowerCase())
                  );
                  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
                  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  
                  return (
                    <>
                      {paginatedLogs.map((log, idx) => (
                        <tr 
                          key={log._id} 
                          className="border-b border-border/50 bg-white animate-fade-in-up" 
                          style={{ animationDelay: `${idx * 0.05}s` }}
                        >
                    <td className="py-3 px-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${getLogBg(log.type)}`}>
                        {getLogIcon(log.type)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-semibold text-text-primary flex items-center gap-1.5">
                          <User size={14} className="text-text-muted" /> {log.user}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 capitalize">
                          <ShieldCheck size={12} /> {log.role}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-text-primary mb-0.5">{log.action}</p>
                      <p className="text-text-secondary text-[13px]">{log.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                        <Clock size={12} className="text-gray-500" /> {formatDate(log.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setDeleteTarget(log)}
                        className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete log"
                      >
                        <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  </>
                  );
                })()
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-text-secondary bg-white">
          <p>
            Showing{" "}
            <span className="font-medium text-text-primary">
              {logs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-text-primary">
              {Math.min(currentPage * itemsPerPage, logs.filter(log => (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.description || "").toLowerCase().includes(searchTerm.toLowerCase())).length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-text-primary">
              {logs.filter(log => (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.description || "").toLowerCase().includes(searchTerm.toLowerCase())).length}
            </span>{" "}
            events
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
                const totalFiltered = logs.filter(log => (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.description || "").toLowerCase().includes(searchTerm.toLowerCase())).length;
                setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalFiltered / itemsPerPage)));
              }}
              disabled={currentPage >= Math.ceil(logs.filter(log => (log.user || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) || (log.description || "").toLowerCase().includes(searchTerm.toLowerCase())).length / itemsPerPage)}
              className="px-2.5 py-1 border border-border rounded-md bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        </div>
      </div>
      
      {/* Clear All Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Logs</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to permanently delete all activity logs? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsClearModalOpen(false)}
                disabled={clearing}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer w-full"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllLogs}
                disabled={clearing}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer flex items-center justify-center gap-2 w-full disabled:opacity-50"
              >
                {clearing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Log Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-border p-8 text-center bg-white transform transition-all scale-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-100">
              <AlertCircle size={28} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Log</h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              Are you sure you want to delete log entry{" "}
              <strong className="text-gray-900 font-bold">"{deleteTarget.action || deleteTarget.description || "this log"}"</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer w-full"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLog}
                disabled={deleting}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl cursor-pointer flex items-center justify-center gap-2 w-full disabled:opacity-50"
              >
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} 
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
}
