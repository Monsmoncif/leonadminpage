"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  User,
  Calendar,
  FileSignature,
  CheckCircle,
  Clock,
  MapPin,
  Wifi,
  Download,
  Printer,
  DollarSign,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  Send
} from "lucide-react";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/providers/ToastProvider";

export default function DriverContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contractId } = use(params);
  const router = useRouter();
  const toast = useToast();
  
  const [contractDetails, setContractDetails] = useState<any>(null);
  const [damages, setDamages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contractId) {
      Promise.all([
        fetch(`/api/contracts/${contractId}`, { cache: 'no-store' }).then(res => res.json()),
        fetch("/api/damages", { cache: 'no-store' }).then(res => res.json())
      ]).then(([contractData, damagesData]) => {
        const enriched = {
          ...contractData,
          startDate: new Date(contractData.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          endDate: new Date(contractData.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          customer: contractData.clientId?.name || contractData.customer,
          driver: contractData.driverId?.name || "No Driver Assigned",
          vehicle: contractData.unitId ? `${contractData.unitId.make} ${contractData.unitId.model} (${contractData.unitId.plate})` : contractData.vehicle,
          paymentStatus: contractData.status === "Active" || contractData.status === "Completed" ? "Paid" : "Pending",
          carStatus: contractData.status === "Completed" ? "Returned" : contractData.status === "Draft" ? "Pending" : "Delivered",
          gpsLocation: "24.7136° N, 46.6753° E",
          ipAddress: "192.168.1.42",
          signTime: `${contractData.startDate} 10:30 AM`,
          signatureUrl: "Signed electronically by customer",
        };
        setContractDetails(enriched);

        if (Array.isArray(damagesData)) {
          setDamages(damagesData.filter(d => {
            const cId = d.contractId && typeof d.contractId === 'object' ? d.contractId._id : d.contractId;
            return cId && String(cId) === String(contractId);
          }));
        }
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching data:", err);
        setLoading(false);
      });
    }
  }, [contractId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-brand animate-spin" />
          <p className="text-sm text-text-muted font-medium">Loading contract details...</p>
        </div>
      </div>
    );
  }

  if (!contractDetails) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-text-muted">Contract not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 border border-border rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Contract Details</h1>
            <p className="text-sm font-medium text-text-secondary mt-1">#{contractDetails.contractNumber || contractDetails._id?.toString().substring(0,8).toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            variant={contractDetails.status.toLowerCase().replace(" ", "-") as any}
            text={contractDetails.status}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Info Grid */}
          <div className="space-y-4 text-sm bg-gray-50/50 rounded-xl p-6 border border-gray-100 mb-8">
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <User size={16} /> Customer
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails.customer}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <User size={16} /> Driver
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails.driver}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <ExecutiveCarIcon size={16} /> Vehicle
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails.vehicle}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <Calendar size={16} /> Period
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails.startDate} - {contractDetails.endDate}
              </span>
            </div>
            
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <ExecutiveCarIcon size={16} /> Checkout Mileage
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails?.checkoutMileage !== undefined ? contractDetails.checkoutMileage.toLocaleString() : (contractDetails?.unitId?.mileage?.toLocaleString() || 0)} km
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <DollarSign size={16} /> Daily Rate
              </span>
              <span className="font-semibold text-text-primary">
                ${contractDetails?.dailyRate || 0}
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <CheckCircle size={16} /> Daily KM Limit
              </span>
              <span className="font-semibold text-text-primary">
                {contractDetails?.dailyKmLimit ? `${contractDetails.dailyKmLimit} km` : "Unlimited"}
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <DollarSign size={16} /> Price per Extra KM
              </span>
              <span className="font-semibold text-text-primary">
                ${contractDetails?.pricePerExtraKm || 0}
              </span>
            </div>
          </div>

          {/* Damages Section */}
          {damages.length > 0 && (
            <div className="mb-8">
              <h4 className="text-base font-bold text-gray-900 mb-4">Damages Related to Contract</h4>
              <div className="space-y-3">
                {damages.map(damage => (
                  <div key={damage._id} className="bg-red-50/50 rounded-xl p-5 border border-red-100 flex items-start justify-between hover:bg-red-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-red-900">{damage.description}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-red-700 mt-2">Status: {damage.status}</p>
                    </div>
                    <span className="text-base font-bold text-red-600">${damage.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          )}



          {/* Document Details */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm border border-gray-100">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">{contractDetails.contractNumber ? `${contractDetails.contractNumber}.pdf` : 'Contract.pdf'}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">2.4 MB • Signed</p>
              </div>
            </div>
            <button
              onClick={() => window.open(`/bookings/${contractDetails._id}/print`, "_blank")}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:text-brand hover:border-brand hover:shadow-md transition-all cursor-pointer text-gray-600"
            >
              <Download size={18} />
            </button>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-3 justify-end">
          <div className="flex items-center gap-2">
            <button className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-100 hover:border-gray-300 text-gray-700 text-sm font-bold px-4 py-3 rounded-xl transition-all shadow-sm cursor-pointer">
              <Mail size={16} className="text-gray-400" /> Resend Email
            </button>
            {contractDetails.clientId?.phone ? (
              <a
                href={`tel:${contractDetails.clientId.phone.replace(/[^0-9+]/g, '')}`}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-100 text-text-primary font-bold px-4 py-3 rounded-xl transition-all shadow-sm"
              >
                <Phone size={16} className="text-text-primary" /> Call Client
              </a>
            ) : (
              <button 
                type="button"
                onClick={() => toast.error("No phone number available for this customer.")}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-gray-100 border border-gray-200 text-gray-400 font-bold px-4 py-3 rounded-xl transition-all shadow-sm cursor-not-allowed"
              >
                <Phone size={16} /> Call Client
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm cursor-pointer">
              <Send size={16} className="text-gray-400" /> Send PDF
            </button>
            <button
              onClick={() => window.open(`/bookings/${contractDetails._id}/print`, "_blank")}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 bg-brand text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-brand-dark hover:-translate-y-0.5 cursor-pointer"
            >
              <Printer size={16} /> Print PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
