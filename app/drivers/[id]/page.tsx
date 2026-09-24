"use client";

import { useState, useEffect, use } from "react";
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
                  <Clock size={14} /> Member since {driver.createdAt ? new Date(driver.createdAt).toLocaleDateString() : "Unknown"}
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
                ? new Date(driver.licenseExpiry).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
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
                ? new Date(driver.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
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
                const fileUrl = isPdf && doc.includes("cloudinary.com") ? doc.replace("/upload/", "/upload/fl_attachment/") : doc;
                return (
                  <a
                    key={idx}
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-28 h-28 rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all block group bg-gray-50"
                  >
                    {isPdf ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-brand gap-1.5">
                        <FileText size={28} />
                        <span className="text-[10px] font-semibold">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={doc}
                        alt={`Document ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
