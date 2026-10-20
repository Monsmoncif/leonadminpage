"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  CreditCard,
  FileText,
  History,
  Calendar,
  AlertCircle,
  ShieldAlert,
  DollarSign,
  ExternalLink,
  Loader2,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Maximize2,
  Camera,
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getAvatarColor = (name: string) => {
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

const getContractStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "active": return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "completed": return "bg-blue-50 text-blue-700 border-blue-200";
    case "cancelled": return "bg-red-50 text-red-700 border-red-200";
    case "pending": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);

  useEffect(() => {
    if (previewDocIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewDocIndex(null);
      } else if (e.key === "ArrowLeft") {
        setPreviewDocIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setPreviewDocIndex((prev) => (prev !== null && client?.documents && prev < client.documents.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewDocIndex, client?.documents]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch customer details");
      const data = await res.json();
      setClient(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClient();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="w-48 h-7 bg-gray-200 rounded-lg" />
              <div className="w-64 h-4 bg-gray-200 rounded-md" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-32 h-10 bg-gray-200 rounded-xl" />
            <div className="w-32 h-10 bg-gray-200 rounded-xl" />
          </div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full" />
              <div className="space-y-3">
                <div className="w-40 h-6 bg-gray-200 rounded-md" />
                <div className="w-56 h-4 bg-gray-200 rounded-md" />
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex items-center px-6 py-4">
                <div className="flex items-center gap-3 w-48 shrink-0">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-48 h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-md shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Error</h2>
          <p className="text-sm text-text-secondary">{error || "Customer not found"}</p>
          <button
            onClick={() => router.push("/clients")}
            className="mt-4 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-dark cursor-pointer transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/clients")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Customer Details</h1>
            <p className="text-sm text-text-secondary mt-0.5">View and manage customer information</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b border-border bg-gray-50/30">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shadow-sm ${getAvatarColor(client.name)}`}
            >
              {getInitials(client.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary">{client.name}</h2>
                <span className={`text-[11px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full border ${
                  client.status === "Deactivated"
                    ? "bg-gray-100 text-gray-700 border-gray-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}>
                  {client.status || "Active"}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1.5">
                <span className="text-sm text-text-muted flex items-center gap-1.5">
                  <Globe size={14} /> {client.nationality}
                </span>
                <span className="text-sm text-text-muted flex items-center gap-1.5">
                  <Clock size={14} /> Member since {client.createdAt ? new Date(client.createdAt).toLocaleDateString("en-GB") : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Table */}
        <div className="divide-y divide-border">
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <CreditCard size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Passport / ID</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.idNumber || "—"}</span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <FileText size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">License Number</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.licenseNumber || "—"}</span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <Calendar size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">License Expiry</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {client.licenseExpiry
                ? new Date(client.licenseExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <Mail size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Email</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.email || "—"}</span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <Phone size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Phone</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.phone || "—"}</span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <Globe size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Nationality</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.nationality || "—"}</span>
          </div>
          <div className="flex items-center px-6 py-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-3 w-48 shrink-0">
              <MapPin size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Address</span>
            </div>
            <span className="text-sm font-semibold text-text-primary">{client.address || "—"}</span>
          </div>
        </div>
      </div>

      {/* Documents */}
      {client.documents && client.documents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-gray-50/30">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <FileText size={16} className="text-text-muted" />
              Documents
              <span className="text-xs font-medium text-text-muted bg-gray-100 px-2 py-0.5 rounded-md">
                {client.documents.length}
              </span>
            </h3>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {client.documents.map((doc: string, idx: number) => {
                const isPdf = doc.includes("application/pdf") || doc.endsWith(".pdf");
                return (
                  <div
                    key={idx}
                    onClick={() => setPreviewDocIndex(idx)}
                    className="relative h-28 sm:h-32 md:h-36 w-full rounded-xl border border-border overflow-hidden group shadow-2xs bg-gray-100 cursor-pointer active:scale-95 transition-transform"
                    title={`Document #${idx + 1} - Click to enlarge`}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-brand gap-1.5 p-2 text-center bg-gray-50">
                        <FileText size={28} />
                        <span className="text-[10px] font-semibold">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={doc}
                        alt={`Document ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 size={18} />
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                      <span className="bg-black/60 backdrop-blur-xs text-[9px] sm:text-[10px] font-medium text-white px-1.5 py-0.5 rounded truncate max-w-[75%]">
                        {isPdf ? "PDF" : "Document"}
                      </span>
                      <span className="text-[8px] sm:text-[9px] font-bold text-white/90 bg-black/60 px-1 py-0.5 rounded shrink-0">
                        #{idx + 1}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rental History */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border bg-gray-50/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <History size={16} className="text-text-muted" />
            Rental History
          </h3>
          <span className="text-xs font-medium text-text-muted">
            {client.contracts?.length || 0} contracts
          </span>
        </div>

        {client.contracts && client.contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Vehicle</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Period</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Amount (AED)</th>
                  <th className="text-left py-3 px-4 text-text-muted font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {client.contracts.map((contract: any, idx: number) => (
                  <tr
                    key={idx}
                    className="border-b border-border/50 bg-white animate-fade-in-up"
                  >
                    <td className="py-3 px-4">
                      <a href={`/bookings/${contract._id}`} className="font-semibold text-text-primary group-hover:text-brand transition-colors flex items-center gap-2">
                        <ExecutiveCarIcon size={14} className="text-text-muted" />
                        {contract.unitId ? `${contract.unitId.make} ${contract.unitId.model}` : "Unknown Vehicle"}
                        {contract.unitId?.plate && (
                          <span className="text-text-muted font-normal text-xs">({contract.unitId.plate})</span>
                        )}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(contract.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} → {new Date(contract.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      AED {Number(contract.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${getContractStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <ExecutiveCarIcon size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-text-secondary">No rental history</p>
            <p className="text-xs text-text-muted mt-1">This customer hasn't made any rentals yet.</p>
          </div>
        )}
      </div>

      {/* Full-size Image Preview Modal (Inspired by Booking & Handover Details) */}
      {previewDocIndex !== null && client?.documents?.[previewDocIndex] && (() => {
        const currentDoc = client.documents[previewDocIndex];
        const isPdfDoc = currentDoc.includes("application/pdf") || currentDoc.endsWith(".pdf");
        const downloadUrl = isPdfDoc && currentDoc.includes("cloudinary.com")
          ? currentDoc.replace("/upload/", "/upload/fl_attachment/")
          : currentDoc;
        const totalDocs = client.documents.length;

        return (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={() => setPreviewDocIndex(null)}
          >
            <div
              className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top controls: Download and Close */}
              <div className="absolute -top-11 right-0 sm:-top-10 sm:right-0 flex items-center gap-2">
                <a
                  href={downloadUrl}
                  download={`client-doc-${previewDocIndex + 1}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center"
                  title="Download or open original"
                >
                  <Download size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDocIndex(null)}
                  className="bg-black/60 hover:bg-black/90 text-white p-2 rounded-full cursor-pointer transition-all active:scale-95 shadow-md flex items-center justify-center"
                  aria-label="Close image preview"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Top info badge (Document title & count) */}
              <div className="absolute -top-11 left-0 sm:-top-10 sm:left-0 flex items-center gap-2 text-white/90 text-xs font-semibold select-none">
                <span className="bg-black/50 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-xs">
                  Document #{previewDocIndex + 1} {totalDocs > 1 ? `(${previewDocIndex + 1} / ${totalDocs})` : ""}
                </span>
              </div>

              {/* Previous Button (if multiple docs) */}
              {totalDocs > 1 && (
                <button
                  type="button"
                  disabled={previewDocIndex === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDocIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
                  }}
                  className="absolute -left-12 sm:-left-16 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Previous document (Left Arrow)"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Main Content */}
              {isPdfDoc ? (
                <iframe
                  src={currentDoc}
                  className="w-[85vw] max-w-4xl h-[80vh] rounded-xl sm:rounded-2xl bg-white shadow-2xl border border-white/20"
                  title={`Document ${previewDocIndex + 1}`}
                />
              ) : (
                <img
                  src={currentDoc}
                  alt={`Document ${previewDocIndex + 1}`}
                  className="max-h-[85vh] max-w-full rounded-xl sm:rounded-2xl object-contain shadow-2xl border border-white/20 select-none"
                />
              )}

              {/* Next Button (if multiple docs) */}
              {totalDocs > 1 && (
                <button
                  type="button"
                  disabled={previewDocIndex === totalDocs - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDocIndex((prev) => (prev !== null && prev < totalDocs - 1 ? prev + 1 : prev));
                  }}
                  className="absolute -right-12 sm:-right-16 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Next document (Right Arrow)"
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
