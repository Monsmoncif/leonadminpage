"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CONTRACT_TERMS } from "@/lib/contractTerms";

export default function PrintContractPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/contracts/${id}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load contract details");
        return res.json();
      })
      .then((data) => {
        setContract(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (contract) {
      const contractNum = contract.contractNumber
        ? String(contract.contractNumber)
        : (contract._id ? contract._id.toString().substring(0, 8).toUpperCase() : "2000");
      document.title = contractNum;
      const isNoPrint = window.location.search.includes('noprint=1');
      const timer = setTimeout(() => {
        if (!isNoPrint) window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [contract]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 size={36} className="text-brand animate-spin mb-3" />
        <p className="text-sm font-medium text-text-secondary">Generating print preview...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-border max-w-md mx-auto mt-20">
        <p className="text-red-500 font-bold mb-2">Error Loading Contract</p>
        <p className="text-xs text-text-muted mb-4">{error || "Contract not found"}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  // Format Helper functions
  const formatDate = (dateStr: any) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const client = contract.clientId || {};
  const unit = contract.unitId || {};
  const driver = contract.driverId || {};

  // Form serial number
  const serialNo = contract.contractNumber
    ? String(contract.contractNumber)
    : (contract._id ? contract._id.toString().substring(0, 8).toUpperCase() : "2000");

  return (
    <div id="contract-print-content" className="bg-white min-h-screen font-sans text-[10px] leading-normal text-gray-900 selection:bg-brand/10 print:bg-white print:p-0 p-4 max-w-[210mm] mx-auto">
      
      {/* CSS print utility styling to force A4 fitting */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 5mm 6mm 5mm;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            display: none !important;
          }
          #contract-print-content {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #contract-page-1 {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            min-height: 0 !important;
            box-sizing: border-box !important;
          }
          #contract-page-2 {
            page-break-before: always !important;
            break-before: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            min-height: 0 !important;
            height: auto !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* Top Banner (Print Button for non-print view) */}
      <div className="no-print mb-4 p-3 bg-brand/5 border border-brand/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <a
            href={`/api/contracts/${id}/pdf`}
            download={`Contract-${serialNo}.pdf`}
            className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download PDF
          </a>
          <button 
            onClick={() => {
              document.title = serialNo;
              window.print();
            }} 
            className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ===== Contract Form Container (Page 1) ===== */}
      <div id="contract-page-1" className="border-[1.5px] border-black p-3 relative overflow-hidden bg-white">
        
        {/* Border Ribbon Top */}
        <div className="absolute top-0 left-0 right-0 h-2.5 bg-[#EEA21B]" />

        {/* ===== Header Block ===== */}
        <div className="flex justify-between items-center mt-1 pb-1.5 border-b-2 border-black">
          {/* Logo Brand */}
          <div className="flex items-center w-[30%]">
            <img src="/logo-original.png" alt="Company Logo" className="h-10 object-contain object-left" crossOrigin="anonymous" />
          </div>

          {/* Center Title */}
          <div className="text-center flex flex-col items-center w-[32%]">
            <span className="text-[14px] font-black tracking-widest uppercase text-gray-900 leading-tight">RENTAL AGREEMENT</span>
            <span className="text-[9px] font-bold text-gray-700" dir="rtl">عقد إيجار مركبة</span>
          </div>

          {/* Contact Details Right */}
          <div className="flex flex-col items-end w-[38%]">
            <div className="flex flex-col items-start space-y-0.5 text-[7.5px] text-gray-900 font-bold">
              <div className="flex items-center gap-1.5">
                <svg className="w-2.5 h-2.5 text-[#EEA21B] shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1v3.5a1 1 0 01-1 1C10.6 21 3 13.4 3 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.2 2.2z" />
                </svg>
                <span>+971 589 206 713</span>
              </div>
              <div className="flex items-start gap-1.5">
                <svg className="w-2.5 h-2.5 text-[#EEA21B] shrink-0 fill-current mt-0.5" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
                <div className="leading-tight">
                  <div>19D Street - Al Quoz - Al Quoz</div>
                  <div>Industrial Area 3 - Dubai</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-2.5 h-2.5 text-[#EEA21B] shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                <span>LEON CAR Rental Dubai</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-2.5 h-2.5 text-[#EEA21B] shrink-0 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Leon_car_rantel_dubai</span>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Serial Number Bar ===== */}
        <div className="flex justify-between items-center py-1 px-2 border-b-2 border-black bg-gray-50/80">
          <div className="font-bold text-[7.5px] text-gray-600 uppercase tracking-wider">Agreement Details / تفاصيل العقد</div>
          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 border border-gray-300 rounded shadow-xs">
            <span className="font-bold text-gray-600 text-[8.5px] uppercase whitespace-nowrap">Agreement No / رقم العقد:</span>
            <span className="text-red-600 font-extrabold text-[10.5px] tracking-wider whitespace-nowrap">{serialNo}</span>
          </div>
        </div>

        {/* ===== Location & Dates Grid ===== */}
        <div className="grid grid-cols-4 border-b border-black text-[7px]">
          <div className="px-1 py-0.5 border-r border-black flex flex-col justify-between">
            <span className="text-[6px] text-gray-500 font-bold uppercase">Location / منفذ البيع</span>
            <span className="font-bold text-[8px] truncate">{contract.pickupLocation || "Main Office"}</span>
          </div>
          <div className="px-1 py-0.5 border-r border-black flex items-center justify-center gap-2.5">
            <div className="flex items-center gap-1">
              <input 
                type="checkbox" 
                checked={contract.rentalType === "Daily" || (!contract.rentalType && contract.totalDays < 30)} 
                readOnly 
                className="w-2.5 h-2.5 accent-brand" 
              />
              <span className="text-[7.5px] font-bold">Daily / يومي</span>
            </div>
            <div className="flex items-center gap-1">
              <input 
                type="checkbox" 
                checked={contract.rentalType === "Monthly" || (!contract.rentalType && contract.totalDays >= 30)} 
                readOnly 
                className="w-2.5 h-2.5 accent-brand" 
              />
              <span className="text-[7.5px] font-bold">Monthly / شهري</span>
            </div>
          </div>
          <div className="px-1 py-0.5 border-r border-black flex flex-col justify-between">
            <span className="text-[6px] text-gray-500 font-bold uppercase">HA Date / تاريخ الاتفاقية</span>
            <span className="font-extrabold text-[8px] truncate">{formatDate(contract.startDate)}</span>
          </div>
          <div className="px-1 py-0.5 flex flex-col justify-between">
            <span className="text-[6px] text-gray-500 font-bold uppercase">Hire Mode / نوع الاستئجار</span>
            <span className="font-bold text-[8px] truncate">{contract.driverId ? "Chauffeur Driven" : "Self-Drive"}</span>
          </div>
        </div>

        {/* ===== Dual-Column Layout ===== */}
        <div className="grid grid-cols-12 border-b border-black">
          
          {/* LEFT COLUMN: Hirer Information & Notes (Col Span 5) */}
          <div className="col-span-5 border-r border-black flex flex-col">
            
            {/* Section Header */}
            <div className="bg-gray-100 py-0.5 px-1 border-b border-black flex justify-between items-center">
              <span className="font-bold text-[7.5px] uppercase">HIRER INFORMATION</span>
              <span className="font-bold text-[7.5px]">معلومات المستأجر</span>
            </div>

            {/* Fields Grid */}
            <div className="grid grid-cols-2 border-b border-black text-[6.5px]">
              <div className="col-span-2 px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Name / الاسم</span>
                <span className="font-bold text-[8.5px] truncate">{client.name || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Driving License No / رقم الرخصة</span>
                <span className="font-bold truncate">{client.licenseNumber || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Customer Type / العميل</span>
                <span className="font-bold truncate">{contract.customerType || (client.companyName ? "B2B" : "B2C")}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Issued At / صادرة من</span>
                <span className="font-bold truncate">{client.licenseIssuedAt || "Dubai"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Valid Up To / صالحة لغاية</span>
                <span className="font-bold truncate">{client.licenseExpiry ? formatDate(client.licenseExpiry) : "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Passport or ID No / جواز السفر / الهوية</span>
                <span className="font-bold truncate">{client.passportNumber || client.idNumber || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Passport Expiry / تاريخ انتهاء الجواز</span>
                <span className="font-bold truncate">{client.passportExpiry ? formatDate(client.passportExpiry) : "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Nationality / الجنسية</span>
                <span className="font-bold truncate">{client.nationality || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Date of Birth / تاريخ الميلاد</span>
                <span className="font-bold truncate">{client.dob ? formatDate(client.dob) : "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Tel/Mobile / الهاتف</span>
                <span className="font-bold truncate">{client.phone || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Email / البريد الإلكتروني</span>
                <span className="font-semibold text-[7.5px] truncate">{client.email || "N/A"}</span>
              </div>
              <div className="col-span-2 px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Address in UAE / العنوان في الإمارات</span>
                <span className="font-medium truncate text-gray-800">{client.address || "N/A"}</span>
              </div>
              <div className="col-span-2 px-1 py-[1.5px] flex flex-col">
                <span className="text-gray-500 font-bold uppercase text-[6px]">Permanent Address / العنوان الدائم</span>
                <span className="font-medium truncate text-gray-600">{client.permanentAddress || client.address || "Same as above"}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Vehicle & Hire Info (Col Span 7) */}
          <div className="col-span-7 flex flex-col">
            
            {/* VEHICLE INFORMATION */}
            <div className="bg-gray-100 py-0.5 px-1 border-b border-black flex justify-between items-center">
              <span className="font-bold text-[7.5px] uppercase">VEHICLE INFORMATION</span>
              <span className="font-bold text-[7.5px]">معلومات المركبة</span>
            </div>
            
            <div className="grid grid-cols-3 border-b border-black text-[6.5px]">
              <div className="col-span-2 px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Vehicle Type / نوع المركبة</span>
                <span className="font-bold text-[8.5px] truncate">{unit.make || "N/A"} {unit.model || ""}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Traffic Plate No / رقم اللوحة</span>
                <span className="font-extrabold text-[8.5px] text-brand truncate">{unit.plate || "N/A"}</span>
              </div>
              
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Model / سنة الصنع</span>
                <span className="font-bold truncate">{unit.year || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Vehicle Colour / اللون</span>
                <span className="font-bold truncate">{unit.color || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">KM Per Day / كم يومي</span>
                <span className="font-bold truncate">{contract.dailyKmLimit > 0 ? `${contract.dailyKmLimit} km` : "Unlimited"}</span>
              </div>

              <div className="col-span-2 px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col justify-between">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Check Out Date / تاريخ الخروج</span>
                <span className="font-bold truncate">{formatDate(contract.startDate)}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col justify-between">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Check Out Time / وقت الخروج</span>
                <span className="font-bold truncate">{contract.checkoutTime || "07:00 AM"}</span>
              </div>

              <div className="col-span-2 px-1 py-[1.5px] border-r border-black flex flex-col justify-between">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Check In Date / تاريخ العودة</span>
                <span className="font-bold truncate">{formatDate(contract.endDate)}</span>
              </div>
              <div className="px-1 py-[1.5px] flex flex-col justify-between">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Check In Time / وقت العودة</span>
                <span className="font-bold truncate">{contract.status === "Completed" ? (contract.checkinTime || "") : ""}</span>
              </div>
            </div>

            {/* HIRE INFORMATION */}
            <div className="bg-gray-100 py-0.5 px-1 border-b border-black border-t border-black flex justify-between items-center">
              <span className="font-bold text-[7.5px] uppercase">HIRE INFORMATION</span>
              <span className="font-bold text-[7.5px]">معلومات الاستئجار</span>
            </div>

            <div className="grid grid-cols-3 border-b border-black text-[6.5px]">
              <div className="px-1 py-[1.5px] border-r border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Rental Period / مدة الإيجار</span>
                <span className="font-bold text-[8px] truncate">{contract.totalDays} Days</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Hire Rate 24H (AED) / الإيجار اليومي</span>
                <span className="font-bold text-[8px] truncate">AED {contract.dailyRate || 0}</span>
              </div>
              <div className="px-1 py-[1.5px] flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Deposit Amount / التأمين</span>
                <span className="font-extrabold text-[8px] text-emerald-600 truncate">AED {contract.depositAmount || 0}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-t border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Extra Mileage per KM / كم زائد</span>
                <span className="font-bold text-[8px] truncate">AED {contract.pricePerExtraKm || 0}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-t border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Total Amount / المبلغ الإجمالي</span>
                <span className="font-black text-[8.5px] text-black truncate">
                  AED {(() => {
                    const days = Number(contract.totalDays) || 1;
                    const rate = Number(contract.dailyRate) || 0;
                    return (days * rate).toFixed(2);
                  })()}
                </span>
              </div>
              <div className="px-1 py-[1.5px] border-t border-black flex flex-col bg-brand/5">
                <span className="text-[6px] text-brand font-extrabold uppercase">Amount Due / المستحق</span>
                <span className="font-black text-[8.5px] text-brand truncate">
                  AED {(() => {
                    const days = Number(contract.totalDays) || 1;
                    const rate = Number(contract.dailyRate) || 0;
                    const totalRent = days * rate;
                    const deposit = Number(contract.depositAmount) || 0;
                    const salik = Number(contract.salikCharge || contract.salikFees) || 0;
                    const parking = Number(contract.parkingCharge || contract.parkingFees) || 0;
                    const fines = Number(contract.finesCharge || contract.finesFees) || 0;
                    const fuel = Number(contract.fuelCharge || contract.fuelFees) || 0;
                    return (totalRent + deposit + salik + parking + fines + fuel).toFixed(2);
                  })()}
                </span>
              </div>
            </div>

            {/* ADDITIONAL DRIVER DETAILS */}
            <div className="bg-gray-100 py-0.5 px-1 border-b border-black flex justify-between items-center">
              <span className="font-bold text-[7.5px] uppercase">ADDITIONAL DRIVER DETAILS</span>
              <span className="font-bold text-[7.5px]">بيانات السائق الإضافي</span>
            </div>

            <div className="grid grid-cols-2 border-b border-black text-[6.5px]">
              <div className="px-1 py-[1.5px] border-r border-black border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Name of 2nd Driver / الاسم</span>
                <span className="font-bold truncate">{contract.additionalDriverName || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-b border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Driving License No / رقم الرخصة</span>
                <span className="font-bold truncate">{contract.additionalDriverLicense || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] border-r border-black flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Nationality / الجنسية</span>
                <span className="font-bold truncate">{contract.additionalDriverNationality || "N/A"}</span>
              </div>
              <div className="px-1 py-[1.5px] flex flex-col">
                <span className="text-[6px] text-gray-500 font-bold uppercase">Phone / الهاتف</span>
                <span className="font-bold truncate">{contract.additionalDriverPhone || "N/A"}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ===== TABLE 1: IMPORTANT NOTES FOR CUSTOMER ===== */}
        <div className="border-b border-black text-black bg-white">
          <div className="grid grid-cols-2 bg-gray-100 border-b border-black py-0.5 px-2">
            <span className="font-extrabold text-[8px] uppercase tracking-wide">IMPORTANT NOTES FOR CUSTOMER:</span>
            <span className="font-extrabold text-[8.5px] text-right" dir="rtl">معلومات هامة للمستأجر:</span>
          </div>
          
          {/* Row 1 */}
          <div className="border-b border-black px-2 py-0.5 text-center">
            <p className="font-bold text-[6.8px] leading-tight text-gray-950" dir="rtl">
              يكون لموظفي شركة ليون لتأجير السيارات ش.ذ.م.م كامل الصلاحية في تمديد فترة إيجار المركبة وزيادة رسومها المتفق عليها مع المستأجر
            </p>
            <p className="text-[6px] leading-tight text-gray-800 mt-0.5">
              Hirer is obliged to obtain all extensions to this hire agreement from authorized Leon Car Rental LLC staff, All extensions may be subject to rate increases.
            </p>
          </div>

          {/* Row 2 */}
          <div className="border-b border-black px-2 py-0.5 text-center">
            <p className="font-bold text-[6.8px] leading-tight text-gray-950" dir="rtl">
              التأمين لا يشمل أي ضرر لزجاج المركبة والإطارات وغطاء الإطارات والزنجات والأعطال الميكانيكية الناتجة عن إهمال المستأجر ويتحمل المستأجر مسؤولية تغطية قيمة الإصلاح أو الإستبدال
            </p>
            <p className="text-[6px] leading-tight text-gray-800 mt-0.5">
              Insurance does not cover or include any damage to the vehicle Glass, Tires, Tire cover or Alloy wheels, Mechanical malfunctions resulting from the Hirer negligence and the Hirer is responsible for covering the value of repair or replacement.
            </p>
          </div>

          {/* Row 3 */}
          <div className="border-b border-black px-2 py-0.5 text-center">
            <p className="font-bold text-[6.8px] leading-tight text-gray-950" dir="rtl">
              أوافق على سداد رسوم عبور بوابات التعرفة المرورية (سالك / درب) وكذلك قيمة كل مخالفة مرورية ارتكبها شاملة الرسوم إن وجدت.
            </p>
            <p className="text-[6px] leading-tight text-gray-800 mt-0.5">
              I Agree to pay the Traffic Toll Gate charges (SALIK / DARB) & each Traffic Violations & service charge if any.
            </p>
          </div>

          {/* Row 4 */}
          <div className="border-b border-black px-2 py-0.5 text-center">
            <p className="font-bold text-[6.8px] leading-tight text-gray-950" dir="rtl">
              فقدان المستأجر لمفتاح المركبة سيعرضه لسداد قيمة مفتاح جديد من وكيل المركبة المعتمد في الدولة فقط وبدون رسوم إضافية.
            </p>
            <p className="text-[6px] leading-tight text-gray-800 mt-0.5">
              In case the hirer loss the vehicle access key so he/she will pay the fees of get new Key from the vehicle agency that certified in UAE only.
            </p>
          </div>

          {/* Row 5: Smoking prohibition */}
          <div className="px-2 py-0.5 text-center">
            <p className="font-bold text-[6.8px] leading-tight text-gray-950 flex items-center justify-center gap-1.5" dir="rtl">
              <span>ممنوع التدخين داخل المركبة، في حال المخالفة سيتم فرض غرامة تصل إلى 2500 درهم إماراتي.</span>
              <span className="text-[9px] text-red-600">🚭</span>
            </p>
            <p className="text-[6px] font-semibold leading-tight text-gray-900 mt-0.5 flex items-center justify-center gap-1.5">
              <span className="text-[9px] text-red-600">🚭</span>
              <span>Smoking is strictly prohibited inside the vehicle. Any violation may result in a fine of up to AED 2,500.</span>
            </p>
          </div>
        </div>

        {/* ===== TABLE 2: NOTE / TERMS AND CONDITIONS ===== */}
        <div className="border-b border-black text-black bg-white">
          <div className="grid grid-cols-2 bg-gray-100 border-b border-black py-0.5 px-2">
            <span className="font-extrabold text-[8px] uppercase tracking-wide">Note:</span>
            <span className="font-extrabold text-[8.5px] text-right" dir="rtl">ملاحظات:</span>
          </div>

          <div className="grid grid-cols-2 text-[5.8px] leading-[1.18]">
            {/* Left Column (English) */}
            <div className="p-1.5 border-r border-black flex flex-col space-y-1 text-gray-900">
              <div className="font-bold text-[6.5px]">
                Terms and Conditions of Rental <span className="font-normal text-[5.2px] text-gray-600">(Subject to the laws of the United Arab Emirates)</span>
              </div>
              <ul className="space-y-0.5 list-none pl-0">
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>If the vehicle is impounded by government authorities for any violation of the law, I agree to pay the rental charges until the vehicle is returned to Leon Car Rental L.L.C.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <span>For all customers who are involved in collision accidents or hit-and-run incidents where the fault is attributed to a third party, the additional insurance coverage shall be applied as follows:</span>
                    <div className="pl-1.5 pt-0.5 space-y-0.5">
                      <p>a) In the case of total loss accidents (vehicle write-off), an amount starting from AED 3,000 will be charged in addition to a 10% deductible, in accordance with the Insurance Law and the insurance policy.</p>
                      <p>b) If the driver of the vehicle causing the accident is under 25 years of age, an additional 10% deductible shall be added, in accordance with the Insurance Law and the insurance policy.</p>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>A police report is mandatory in all cases.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>The renter agrees to return the vehicle with the same amount of fuel as it had at the time of rental.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>The rental period is calculated on a 24-hour basis.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>In the event of mechanical failures resulting from misuse (such as engine damage due to overheating, driving in rough areas, or failure to observe road conditions), the renter shall bear the cost of damages and repairs.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>By signing below on this page, the renter shall be responsible for the first excess of insurance, which is 10% of the compulsory deductible amount, for any damage or loss (including fire and theft) that occurs to the vehicle during its use, operation, or driving in accordance with this rental contract, despite payment of the stated fees.<br/>In the event of using, operating, or driving the vehicle in violation of any of the terms and conditions of this rental contract, the owner shall have the right to apply the provisions stated below/on the back of this page.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>Payment: The renter agrees, without discussion, to pay and settle all charges related to the vehicle rental to Leon Car Rental L.L.C. (the Company) on or before the date of returning the vehicle. In the event that the contract is open until the end of the month, the renter agrees to pay the rental charges in advance.</span>
                </li>
              </ul>
            </div>

            {/* Right Column (Arabic) */}
            <div className="p-1.5 flex flex-col space-y-1 text-right text-gray-900" dir="rtl">
              <div className="font-bold text-[6.5px]">
                أحكام وشروط الإيجار <span className="font-normal text-[5.2px] text-gray-600">(خاضعة لأحكام وقانون دولة الإمارات العربية المتحدة)</span>
              </div>
              <ul className="space-y-0.5 list-none pr-0">
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>إذا تم حجز المركبة من قبل السلطات الحكومية لأي مخالفة للقانون فإنني أوافق على دفع تكاليف الاستئجار حتى يتم إعادة المركبة إلى شركة ليون لتأجير السيارات ش.ذ.م.م.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <div>
                    <span>بالنسبة لجميع الزبائن الذين يرتكبون حوادث صدم أو هروب من موقع الحادث بحيث يكون إرجاع الخطأ إلى طرف ثالث فسوف يتم تغطية التأمين الإضافي على النحو التالي:</span>
                    <div className="pr-1.5 pt-0.5 space-y-0.5">
                      <p>أ- في حالة حوادث الخسارة الكلية (شطب المركبة) سيتم احتساب ابتداءً من 3000 درهم بالإضافة إلى نسبة 10% تحمل إضافي حسب قانون التأمينات وبوليصة التأمين.</p>
                      <p>ب- وفي حالة كان قائد المركبة المتسبب بالحادث تضاف للبند نسبة تحمل 10% للسائق تحت عمر 25 سنة حسب قانون التأمينات وبوليصة التأمين.</p>
                    </div>
                  </div>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>تقرير الشرطة إلزامي في كل الأحوال.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>يوافق المستأجر على إعادة المركبة بنفس كمية الوقود التي كانت في المركبة عند استئجارها.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>يتم احتساب مدة التأجير على أساس 24 ساعة.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>في حالة الأعطال الميكانيكية الناتجة عن سوء الاستعمال (كـ تلف المحرك بسبب ارتفاع درجة حرارته، القيادة في المناطق الوعرة، عدم مراعاة ظروف الطريق) يتحمل المستأجر قيمة الأضرار وإصلاحها.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>بالتوقيع أدناه بهذه الصفحة يكون المستأجر مسؤولاً عن الزيادة الأولى في التأمين وهي 10% من قيمة التحمل الإجباري لأي ضرر أو فقد (بما في ذلك الحريق والسرقة) يحدث للمركبة أثناء استعمالها أو تشغيلها أو قيادتها وفقاً لعقد الإيجار هذا بالرغم من سداد الرسوم المذكورة وفي حالة استعمال أو تشغيل أو قيادة المركبة بالمخالفة لأي من أحكام وشروط عقد الإيجار هذا يحق للمالك تطبيق الأحكام المبينة أدناه / خلف هذه الصفحة.</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="shrink-0 font-bold">•</span>
                  <span>السداد: يقبل المستأجر بدون مناقشة أن يدفع ويسدد كافة الرسوم المتعلقة بإيجار المركبة إلى ليون لتأجير السيارات ش.ذ.م.م (الشركة) في تاريخ أو قبل إعادة المركبة وفي حالة أن العقد مفتوح لنهاية الشهر ومن لآخر يوافق المستأجر على سداد الإيجار مقدماً.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ===== Bottom Section: Vehicle Inspection (CHECK OUT & CHECK IN - Full Width) ===== */}
        <div className="mt-1.5 flex flex-col gap-1">
          <div className="grid grid-cols-2 gap-2.5 w-full">
            
            {/* CHECK OUT Diagram & Data */}
            <div className="border border-black p-1.5 rounded flex flex-col bg-gray-50/20">
              <div className="flex justify-between items-center mb-1 pb-0.5 border-b border-black/10">
                <span className="font-extrabold text-[8.5px] uppercase tracking-wider text-black">CHECK OUT</span>
                <span className="text-[8px] font-bold text-gray-800" dir="rtl">تسليم المركبة (خروج)</span>
              </div>
              
              {/* Visual inspection grid (8 angles across 4 columns) */}
              <div className="grid grid-cols-4 gap-1 p-0.5 w-full relative">
                {contract.inspectionPhotos && contract.inspectionPhotos.length > 0 ? (
                  contract.inspectionPhotos.slice(0, 8).map((photo: string, idx: number) => (
                    <div key={idx} className="border border-gray-300 p-0.5 flex flex-col items-center justify-center w-full aspect-[4/3] max-h-12 overflow-hidden relative bg-white rounded-sm shadow-xs">
                      <img src={photo} alt={`Checkout ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  [
                    { en: 'Front View', ar: 'الأمام' },
                    { en: 'Rear View', ar: 'الخلف' },
                    { en: 'Left Side', ar: 'اليسار' },
                    { en: 'Right Side', ar: 'اليمين' },
                    { en: 'Dashboard / KM', ar: 'العداد' },
                    { en: 'Front Interior', ar: 'الصالون' },
                    { en: 'Rear Interior', ar: 'المقاعد' },
                    { en: 'Trunk / Boot', ar: 'الصندوق' },
                  ].map((angle) => (
                    <div key={angle.en} className="text-[6.5px] text-gray-600 border border-dashed border-gray-300 p-1 flex flex-col items-center justify-center w-full h-8 overflow-hidden relative bg-white text-center leading-tight rounded-sm">
                      <span className="font-bold truncate w-full text-gray-800">{angle.en}</span>
                      <span className="text-[5.5px] text-gray-400" dir="rtl">{angle.ar}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Odometer & Fuel Level */}
              <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-black/10 text-[7.5px]">
                <div className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="text-gray-600 font-semibold">KM Odometer / العداد:</span>
                  <span className="font-extrabold text-brand text-[8px]">{contract.checkoutMileage !== undefined ? contract.checkoutMileage : (contract.unitMileage || unit.mileage || "N/A")} km</span>
                </div>
                <div className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="text-gray-600 font-semibold">Fuel / الوقود:</span>
                  <span className="font-extrabold text-emerald-700 text-[8px]">{contract.checkoutFuelLevel !== undefined ? `${contract.checkoutFuelLevel}%` : "100%"}</span>
                </div>
              </div>
            </div>

            {/* CHECK IN Diagram & Data */}
            <div className="border border-black p-1.5 rounded flex flex-col bg-gray-50/20">
              <div className="flex justify-between items-center mb-1 pb-0.5 border-b border-black/10">
                <span className="font-extrabold text-[8.5px] uppercase tracking-wider text-black">CHECK IN</span>
                <span className="text-[8px] font-bold text-gray-800" dir="rtl">استلام المركبة (عودة)</span>
              </div>
              
              {/* Visual inspection grid (8 angles across 4 columns) */}
              <div className="grid grid-cols-4 gap-1 p-0.5 w-full relative">
                {contract.status === "Completed" && contract.returnPhotos && contract.returnPhotos.length > 0 ? (
                  contract.returnPhotos.slice(0, 8).map((photo: string, idx: number) => (
                    <div key={idx} className="border border-gray-300 p-0.5 flex flex-col items-center justify-center w-full aspect-[4/3] max-h-12 overflow-hidden relative bg-white rounded-sm shadow-xs">
                      <img src={photo} alt={`Return ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))
                ) : (
                  [
                    { en: 'Front View', ar: 'الأمام' },
                    { en: 'Rear View', ar: 'الخلف' },
                    { en: 'Left Side', ar: 'اليسار' },
                    { en: 'Right Side', ar: 'اليمين' },
                    { en: 'Dashboard / KM', ar: 'العداد' },
                    { en: 'Front Interior', ar: 'الصالون' },
                    { en: 'Rear Interior', ar: 'المقاعد' },
                    { en: 'Trunk / Boot', ar: 'الصندوق' },
                  ].map((angle) => (
                    <div key={angle.en} className="text-[6.5px] text-gray-400 border border-dashed border-gray-200 p-1 flex flex-col items-center justify-center w-full h-8 overflow-hidden relative bg-white text-center leading-tight rounded-sm">
                      <span className="font-semibold truncate w-full">{angle.en}</span>
                      <span className="text-[5.5px] text-gray-300" dir="rtl">{angle.ar}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Odometer & Fuel Level */}
              <div className="grid grid-cols-2 gap-2 mt-1 pt-1 border-t border-black/10 text-[7.5px]">
                <div className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="text-gray-600 font-semibold">Return KM / عداد العودة:</span>
                  <span className={`text-[8px] ${contract.status === "Completed" ? "font-extrabold text-brand" : "font-medium text-gray-400"}`}>
                    {contract.status === "Completed" ? `${contract.returnOdometer || contract.returnMileage || "N/A"} km` : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-gray-200">
                  <span className="text-gray-600 font-semibold">Return Fuel / وقود العودة:</span>
                  <span className={`text-[8px] ${contract.status === "Completed" ? "font-extrabold text-emerald-700" : "font-medium text-gray-400"}`}>
                    {contract.status === "Completed" && contract.returnFuelLevel !== undefined ? `${contract.returnFuelLevel}%` : (contract.status === "Completed" ? "100%" : "Pending")}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Acknowledgment line */}
          <div className="flex justify-between items-center text-[5.8px] text-gray-600 px-1 leading-tight">
            <span>By signing below, the hirer acknowledges vehicle condition inspection, verification of fuel and odometer, and agrees to all terms and conditions of this contract.</span>
            <span dir="rtl" className="text-right">بالتوقيع أدناه، يقر المستأجر بمعاينة حالة المركبة والتحقق من الوقود ومستوى العداد ويوافق على كافة الشروط والأحكام.</span>
          </div>

          {/* ===== Bottom Signature Line ===== */}
          <div className="pt-2 pb-0.5 mt-0.5 border-t border-black/15 grid grid-cols-2 gap-8 w-full items-center">
            
            {/* 1. Staff Sign (Left) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[8.5px] text-black shrink-0 whitespace-nowrap">Staff Sign:</span>
              <div className="flex-1 relative flex items-center justify-center min-w-[50px] overflow-hidden h-6">
                <span className="w-full text-black font-bold text-[8px] tracking-[1.5px] select-none truncate text-center">
                  ...................................................................................
                </span>
                {contract.adminSignature && (
                  <img 
                    src={contract.adminSignature} 
                    alt="Staff Sign" 
                    className="absolute inset-0 m-auto max-h-7 max-w-[85%] object-contain mix-blend-multiply pointer-events-none" 
                  />
                )}
              </div>
              <span className="font-bold text-[8.5px] text-black shrink-0 whitespace-nowrap" dir="rtl">: توقيع الموظف</span>
            </div>

            {/* 2. Hirer Sign (Right) */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[8.5px] text-black shrink-0 whitespace-nowrap">Hirer Sign:</span>
              <div className="flex-1 relative flex items-center justify-center min-w-[50px] overflow-hidden h-6">
                <span className="w-full text-black font-bold text-[8px] tracking-[1.5px] select-none truncate text-center">
                  ...................................................................................
                </span>
                {contract.customerSignature && (
                  <img 
                    src={contract.customerSignature} 
                    alt="Hirer Sign" 
                    className="absolute inset-0 m-auto max-h-7 max-w-[85%] object-contain mix-blend-multiply pointer-events-none" 
                  />
                )}
              </div>
              <span className="font-bold text-[8.5px] text-black shrink-0 whitespace-nowrap" dir="rtl">: توقيع المستأجر</span>
            </div>

          </div>

        </div>

      </div>

      {/* ===== Page Break for Print & PDF ===== */}
      <div 
        className="html2pdf__page-break page-break" 
        style={{ pageBreakBefore: 'always', breakBefore: 'page', height: '0', margin: '0' }} 
      />

      {/* ===== Page 2: Terms & Conditions Container ===== */}
      <div 
        id="contract-page-2" 
        className="border-[1.5px] border-black px-2.5 pt-2 pb-1.5 mt-6 print:mt-0 relative overflow-hidden bg-white print:min-h-0 print:h-auto flex flex-col box-border" 
        style={{ pageBreakBefore: 'always', breakBefore: 'page' }}
      >
        
        {/* Border Ribbon Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#EEA21B]" />

        <div>
          {/* Header Block */}
          <div className="flex justify-between items-center mt-0.5 pb-1 mb-1 border-b border-black">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-900 underline decoration-1.5 underline-offset-2">
              Terms &amp; Conditions:-
            </span>
            <span className="text-[10.5px] font-black text-gray-900 underline decoration-1.5 underline-offset-2" dir="rtl">
              الشروط والأحكام:-
            </span>
          </div>

          {/* 45 Terms Dual-Column Grid */}
          <div className="flex flex-col gap-y-[0.75px] text-[5.9px] leading-[1.14] font-medium text-gray-950">
            {CONTRACT_TERMS.map((term) => (
              <div 
                key={term.num} 
                className="grid grid-cols-2 gap-x-2 items-start border-b border-gray-100/60 pb-[0.5px]"
              >
                {/* English Clause */}
                <div className="text-left pr-0.5">
                  <span className="font-bold mr-0.5 shrink-0">{term.num}-</span>
                  <span className="text-gray-900 font-normal">{term.en}</span>
                  {term.subItems && (
                    <div className="pl-1.5 mt-0.5 space-y-[0.5px]">
                      {term.subItems.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-0.5">
                          <span className="font-bold shrink-0">{sub.enKey}</span>
                          <span>{sub.en}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arabic Clause */}
                <div className="text-right pl-0.5" dir="rtl">
                  <span dir="ltr" className="font-bold ml-1 inline-block shrink-0">{term.num}-</span>
                  <span className="text-gray-900 font-normal">{term.ar}</span>
                  {term.subItems && (
                    <div className="pr-1.5 mt-0.5 space-y-[0.5px]">
                      {term.subItems.map((sub, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-0.5">
                          <span className="font-bold shrink-0">{sub.arKey}</span>
                          <span>{sub.ar}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
