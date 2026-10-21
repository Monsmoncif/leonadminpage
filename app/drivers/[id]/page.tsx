"use client";

import { useState, useEffect, use } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  AlertCircle,
  UserCircle,
  Clock,
  Loader2,
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";

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
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  if (!name) return colors[0];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function DriverDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDocIndex, setPreviewDocIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock background scroll when preview modal is open
  useEffect(() => {
    if (previewDocIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [previewDocIndex]);

  useEffect(() => {
    if (previewDocIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewDocIndex(null);
      } else if (e.key === "ArrowLeft") {
        setPreviewDocIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === "ArrowRight") {
        setPreviewDocIndex((prev) => (prev !== null && driver?.documents && prev < driver.documents.length - 1 ? prev + 1 : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewDocIndex, driver?.documents]);

  const fetchDriver = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/drivers/${id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error("Failed to fetch driver details");
      const data = await res.json();
      setDriver(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriver();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="space-y-2">
            <div className="w-48 h-6 bg-gray-200 rounded-md" />
            <div className="w-64 h-4 bg-gray-200 rounded-md" />
          </div>
        </div>

        {/* Profile Card Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full shrink-0" />
              <div className="space-y-3 w-full">
                <div className="w-40 h-8 bg-gray-200 rounded-md" />
                <div className="w-56 h-4 bg-gray-200 rounded-md" />
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center px-6 py-4 gap-2 sm:gap-0">
                <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
                  <div className="w-4 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-4 bg-gray-200 rounded" />
                </div>
                <div className="w-48 h-4 bg-gray-200 rounded sm:ml-0 ml-7" />
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  if (error || !driver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-md shadow-sm">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-text-primary mb-2">Error</h2>
          <p className="text-sm text-text-secondary">{error || "Driver not found"}</p>
          <button
            onClick={() => router.push("/drivers")}
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
            onClick={() => router.push("/drivers")}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-text-muted hover:text-text-primary"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Driver Details</h1>
            <p className="text-sm text-text-secondary mt-0.5">View and manage driver information</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* Profile Header */}
        <div className="p-6 border-b border-border bg-gray-50/30">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-sm ${getAvatarColor(driver.name)}`}
            >
              {getInitials(driver.name)}
            </div>
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary">{driver.name}</h2>
                <div className="w-fit">
                  <StatusBadge variant={driver.status?.toLowerCase() as any} text={driver.status} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                <span className="text-sm text-text-muted flex items-center gap-1.5">
                  <UserCircle size={14} /> ID: {driver.driverId}
                </span>
                <span className="text-sm text-text-muted flex items-center gap-1.5">
                  <Clock size={14} /> Member since {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString("en-GB") : "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Table */}
        <div className="divide-y divide-border">
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <FileText size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">License Number</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">{driver.license || "—"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <Calendar size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">License Expiry</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">
              {driver.licenseExpiry
                ? new Date(driver.licenseExpiry).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <Mail size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Email</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0 break-all">{driver.email || "—"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <Phone size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Phone</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">{driver.phone || "—"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <MapPin size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Address</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">{driver.address || "—"}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <Calendar size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Registered Since</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">
              {driver.createdAt
                ? new Date(driver.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center px-6 py-4 hover:bg-gray-50/50 transition-colors gap-1 sm:gap-0">
            <div className="flex items-center gap-3 w-full sm:w-48 shrink-0">
              <ExecutiveCarIcon size={16} className="text-text-muted" />
              <span className="text-sm font-medium text-text-muted">Completed Contracts</span>
            </div>
            <span className="text-sm font-semibold text-text-primary ml-7 sm:ml-0">{driver.completedContracts || 0}</span>
          </div>
        </div>
      </div>

      {/* Documents */}
      {driver.documents && driver.documents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-gray-50/30">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <FileText size={16} className="text-text-muted" />
              Documents
              <span className="text-xs font-medium text-text-muted bg-gray-100 px-2 py-0.5 rounded-md">
                {driver.documents.length}
              </span>
            </h3>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-4">
              {driver.documents.map((doc: string, idx: number) => {
                const isPdf = doc.includes("application/pdf") || doc.endsWith(".pdf");
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewDocIndex(idx)}
                    className="w-28 h-28 rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block group bg-gray-50 cursor-pointer relative text-left"
                    title={`Click to view document ${idx + 1}`}
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-brand gap-1.5 p-2">
                        <FileText size={28} />
                        <span className="text-[10px] font-semibold">PDF Document</span>
                      </div>
                    ) : (
                      <img
                        src={doc}
                        alt={`Document ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-[1px]">
                      <ZoomIn size={20} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Full-size Document Preview Lightbox (Mounted to document.body for true fullscreen black background) */}
      {mounted && previewDocIndex !== null && driver?.documents?.[previewDocIndex] && typeof document !== "undefined" && createPortal(
        (() => {
          const currentDoc = driver.documents[previewDocIndex];
          const isPdfDoc = currentDoc.includes("application/pdf") || currentDoc.endsWith(".pdf");
          const downloadUrl = isPdfDoc && currentDoc.includes("cloudinary.com")
            ? currentDoc.replace("/upload/", "/upload/fl_attachment/")
            : currentDoc;
          const totalDocs = driver.documents.length;

          return (
            <div
              className="fixed inset-0 z-[99999] w-screen h-screen min-h-screen bg-black/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-fade-in select-none"
              onClick={() => setPreviewDocIndex(null)}
            >
              {/* Top Bar Controls */}
              <div className="fixed top-0 left-0 right-0 z-[100000] flex items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2">
                  <span className="bg-white/10 text-white/90 border border-white/15 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-2 shadow-lg">
                    <FileText size={14} className="text-white/70" />
                    Document #{previewDocIndex + 1} of {totalDocs}
                  </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-2.5">
                  <a
                    href={downloadUrl}
                    download={`driver-doc-${previewDocIndex + 1}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10"
                    title="Download original file"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Download size={18} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewDocIndex(null)}
                    className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer backdrop-blur-md flex items-center justify-center shadow-lg border border-white/10"
                    title="Close (Esc)"
                    aria-label="Close image preview"
                  >
                    <X size={20} />
                  </button>
                </div>
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
                  className="fixed left-4 sm:left-6 top-1/2 -translate-y-1/2 z-[100000] p-3 rounded-full bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-2xl border border-white/10"
                  title="Previous document (Left Arrow)"
                >
                  <ChevronLeft size={28} />
                </button>
              )}

              {/* Centered Document / Image */}
              <div
                className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {isPdfDoc ? (
                  <iframe
                    src={currentDoc}
                    className="w-[88vw] max-w-5xl h-[82vh] rounded-2xl bg-white shadow-2xl border border-white/20"
                    title={`Document ${previewDocIndex + 1}`}
                  />
                ) : (
                  <img
                    src={currentDoc}
                    alt={`Document ${previewDocIndex + 1}`}
                    className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl border border-white/20 select-none animate-fade-in-scale"
                  />
                )}
              </div>

              {/* Next Button (if multiple docs) */}
              {totalDocs > 1 && (
                <button
                  type="button"
                  disabled={previewDocIndex === totalDocs - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewDocIndex((prev) => (prev !== null && prev < totalDocs - 1 ? prev + 1 : prev));
                  }}
                  className="fixed right-4 sm:right-6 top-1/2 -translate-y-1/2 z-[100000] p-3 rounded-full bg-white/10 hover:bg-white/25 text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer backdrop-blur-md active:scale-95 shadow-2xl border border-white/10"
                  title="Next document (Right Arrow)"
                >
                  <ChevronRight size={28} />
                </button>
              )}

              {/* Bottom Navigation / Shortcut Hint */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100000] pointer-events-none">
                <span className="bg-black/60 border border-white/10 text-white/70 text-[11px] font-medium px-3.5 py-1 rounded-full backdrop-blur-md shadow-lg">
                  Use ← → to navigate • Press Esc to close
                </span>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
