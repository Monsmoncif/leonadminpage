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
          startDate: new Date(contractData.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          endDate: new Date(contractData.endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
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

  const isHandedOver = Boolean(
    contractDetails.contractNumber ||
    contractDetails.deliveryStatus === "Delivered" ||
    contractDetails.status === "Active" ||
    contractDetails.status === "Completed"
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button 
            onClick={() => router.back()}
            className="p-2 border border-border rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-2xs"
          >
            <ChevronLeft size={18} className="text-text-secondary" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
              {isHandedOver ? "Contract Details" : "Delivery Order Details"}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-text-secondary mt-0.5">
              {contractDetails.contractNumber
                ? `#${contractDetails.contractNumber}`
                : `Order #${contractDetails._id?.toString().substring(0,8).toUpperCase()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <StatusBadge
            variant={contractDetails.status.toLowerCase().replace(" ", "-") as any}
            text={contractDetails.status}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-xs sm:shadow-sm border border-border overflow-hidden">
        <div className="p-3.5 sm:p-6 md:p-8">
          {/* Info Grid */}
          <div className="space-y-3.5 sm:space-y-4 text-xs sm:text-sm bg-gray-50/50 rounded-xl p-3.5 sm:p-6 border border-gray-100 mb-6 sm:mb-8">
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <User size={15} /> Customer
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails.customer}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <User size={15} /> Driver
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails.driver}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <ExecutiveCarIcon size={15} /> Vehicle
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails.vehicle}
              </span>
            </div>
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <Calendar size={15} /> Period
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails.startDate} - {contractDetails.endDate}
              </span>
            </div>
            
            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <ExecutiveCarIcon size={15} /> Checkout Mileage
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails?.checkoutMileage !== undefined ? contractDetails.checkoutMileage.toLocaleString() : (contractDetails?.unitId?.mileage?.toLocaleString() || 0)} km
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <DollarSign size={15} /> Daily Rate
              </span>
              <span className="font-semibold text-text-primary text-right">
                ${contractDetails?.dailyRate || 0}
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <CheckCircle size={15} /> Daily KM Limit
              </span>
              <span className="font-semibold text-text-primary text-right">
                {contractDetails?.dailyKmLimit ? `${contractDetails.dailyKmLimit} km` : "Unlimited"}
              </span>
            </div>

            <div className="w-full h-px bg-border/50" />
            <div className="flex items-center justify-between group/row">
              <span className="flex items-center gap-2 text-text-muted font-medium">
                <DollarSign size={15} /> Price per Extra KM
              </span>
              <span className="font-semibold text-text-primary text-right">
                ${contractDetails?.pricePerExtraKm || 0}
              </span>
            </div>
          </div>

          {/* Damages Section */}
          {damages.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <h4 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4">Damages Related to Contract</h4>
              <div className="space-y-2.5 sm:space-y-3">
                {damages.map(damage => (
                  <div key={damage._id} className="bg-red-50/50 rounded-xl p-3.5 sm:p-5 border border-red-100 flex items-start justify-between hover:bg-red-50 transition-colors">
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-red-900">{damage.description}</p>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-700 mt-1.5">Status: {damage.status}</p>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-red-600">AED {damage.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Signature Display */}
          {contractDetails.customerSignature && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2 mb-4 sm:mb-6">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <FileSignature size={15} className="text-emerald-600" />
                  <span>Customer Digital Signature (توقيع العميل الإلكتروني)</span>
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Signed &amp; Verified
                </span>
              </div>
              <div className="h-28 sm:h-36 border border-dashed border-gray-200 rounded-xl bg-gray-50/60 p-2 flex items-center justify-center">
                <img
                  src={contractDetails.customerSignature}
                  alt="Customer Signature"
                  className="max-h-full max-w-full object-contain select-none"
                />
              </div>
            </div>
          )}

          {/* Document Details or Pending Handover Notice */}
          {isHandedOver ? (
            <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-2xs border border-gray-100 shrink-0">
                  <FileText size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-base font-bold text-gray-900 truncate">
                    {contractDetails.contractNumber ? `${contractDetails.contractNumber}.pdf` : 'Contract.pdf'}
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">Signed Official Contract</p>
                </div>
              </div>
              <button
                onClick={() => window.open(`/bookings/${contractDetails._id}/print`, "_blank")}
                className="p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl hover:text-brand hover:border-brand hover:shadow-md transition-all cursor-pointer text-gray-600 shrink-0"
                title="Download or Print PDF"
              >
                <Download size={16} />
              </button>
            </div>
          ) : (
            <div className="bg-amber-50/70 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 shadow-2xs border border-amber-200 shrink-0">
                  <Clock size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-base font-bold text-amber-950">
                    Pending Vehicle Handover (بانتظار تسليم السيارة وتوثيق الفحص)
                  </p>
                  <p className="text-[11px] sm:text-xs font-medium text-amber-700 mt-0.5">
                    Official signed contract PDF will be generated and automatically sent to the client once vehicle inspection and client handover are confirmed.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/driver/delivery?contractId=${contractDetails._id}`)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <CheckCircle size={15} />
                <span>Confirm Handover (تأكيد التسليم)</span>
              </button>
            </div>
          )}
        </div>

        {/* Action Footer */}
        {isHandedOver ? (
          <div className="px-3.5 sm:px-6 py-3.5 sm:py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={() => window.open(`/bookings/${contractDetails._id}/print`, "_blank")}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-brand text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-md hover:shadow-lg hover:bg-brand-dark cursor-pointer"
            >
              <Printer size={15} />
              <span>Print Official Contract</span>
            </button>
          </div>
        ) : (
          <div className="px-3.5 sm:px-6 py-3.5 sm:py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={() => router.push(`/driver/delivery?contractId=${contractDetails._id}`)}
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <CheckCircle size={16} />
              <span>Proceed to Handover &amp; Inspection (بدء تسليم السيارة)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
