"use client";

import React, { useState, useEffect, useRef } from "react";
import { Building2, X, Phone, Mail, MapPin, FileText, Upload, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface CreateCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (company?: any) => void;
  companyToEdit?: any;
}

export default function CreateCompanyModal({
  isOpen,
  onClose,
  onSuccess,
  companyToEdit,
}: CreateCompanyModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [trn, setTrn] = useState("");
  const [tradeLicenseNumber, setTradeLicenseNumber] = useState("");
  const [docPreviews, setDocPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (companyToEdit) {
        setCompanyName(companyToEdit.companyName || companyToEdit.name || "");
        setPhone(companyToEdit.phone && companyToEdit.phone !== "N/A" ? companyToEdit.phone : "");
        setEmail(companyToEdit.email || "");
        setAddress(companyToEdit.address && companyToEdit.address !== "Dubai" ? companyToEdit.address : "");
        setTrn(companyToEdit.trn || "");
        setTradeLicenseNumber(companyToEdit.tradeLicenseNumber || "");
        setDocPreviews(Array.isArray(companyToEdit.documents) ? companyToEdit.documents : []);
      } else {
        setCompanyName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setTrn("");
        setTradeLicenseNumber("");
        setDocPreviews([]);
      }
      setError(null);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, companyToEdit]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDocPreviews((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDoc = (index: number) => {
    setDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setError("Please enter the company name. (يرجى إدخال اسم الشركة)");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Upload new base64 files if any
      const newFiles = docPreviews.filter((img) => img.startsWith("data:"));
      const existingUrls = docPreviews.filter((img) => !img.startsWith("data:"));
      let uploadedUrls: string[] = [];

      if (newFiles.length > 0) {
        const uploadPromises = newFiles.map(async (base64) => {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, folder: "company-documents" }),
          });
          if (res.ok) {
            const json = await res.json();
            return json.url || base64;
          }
          return base64;
        });
        uploadedUrls = await Promise.all(uploadPromises);
      }

      const allDocs = [...existingUrls, ...uploadedUrls];

      const payload = {
        name: trimmedName,
        companyName: trimmedName,
        phone: phone.trim() || "N/A",
        email: email.trim(),
        address: address.trim() || "Dubai",
        trn: trn.trim(),
        tradeLicenseNumber: tradeLicenseNumber.trim(),
        customerType: "B2B",
        clientType: "Corporate",
        nationality: "UAE",
        idNumber: trn.trim() || tradeLicenseNumber.trim() || `B2B-${Date.now().toString().slice(-6)}`,
        licenseNumber: "B2B-CORP",
        status: "Active",
        documents: allDocs,
      };

      const isEdit = Boolean(companyToEdit?._id);
      const url = isEdit ? `/api/clients/${companyToEdit._id}` : "/api/clients";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save company details");
      }

      toast.success(
        isEdit
          ? `Company "${trimmedName}" updated successfully!`
          : `Company "${trimmedName}" registered successfully!`
      );
      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error("Save company error:", err);
      setError(err.message || "An error occurred while saving company details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Matching Add New Customer Modal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
              <Building2 className="text-brand shrink-0" size={18} />
              <span>{companyToEdit ? "Edit Company Profile" : "Add New Company (B2B)"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-1 sm:line-clamp-none">
              {companyToEdit
                ? "Update corporate B2B account details and documents."
                : "Register a B2B corporate company account — only Company Name is required."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-3 sm:space-y-5">
          <form id="create-company-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-border shadow-xs space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-text-primary border-b border-border pb-2 flex items-center gap-2">
                <Building2 size={15} className="text-brand" />
                <span>Company Details (بيانات الشركة - B2B)</span>
              </h3>

              {/* Company Name (Mandatory) */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Company Name (اسم الشركة) <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Al Futtaim Logistics LLC / شركة الأمل للتجارة"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white font-medium"
                />
              </div>

              {/* Contact Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Phone / Contact (رقم الهاتف)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +971 4 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Email Address (البريد الإلكتروني)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. info@company.ae"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                  />
                </div>
              </div>

              {/* Tax / TRN & Trade License */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    TRN / Tax Number (الرقم الضريبي)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100234567800003"
                    value={trn}
                    onChange={(e) => setTrn(e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Trade License No (رقم الرخصة التجارية)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CN-1234567"
                    value={tradeLicenseNumber}
                    onChange={(e) => setTradeLicenseNumber(e.target.value)}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white font-mono"
                  />
                </div>
              </div>

              {/* Address / Location */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Company Address / Location (عنوان الشركة)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Business Bay, Office 1402, Dubai, UAE"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                />
              </div>

              {/* Optional Trade License Document Upload */}
              <div className="pt-2 border-t border-border">
                <label className="text-xs font-semibold text-text-secondary flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Upload size={13} className="text-brand" />
                    <span>Company Documents (مستندات الشركة - اختياري)</span>
                  </span>
                  <span className="text-[10px] text-text-muted">PDF or Images</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                />

                <div className="flex flex-wrap gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl border border-dashed border-gray-300 hover:border-brand hover:bg-brand/5 text-text-secondary text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={13} className="text-brand" />
                    <span>Upload Trade License / Docs</span>
                  </button>

                  {docPreviews.map((doc, idx) => (
                    <div key={idx} className="relative group w-14 h-14 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center shrink-0">
                      {doc.startsWith("data:application/pdf") || doc.endsWith(".pdf") ? (
                        <span className="text-[10px] font-bold text-brand">PDF</span>
                      ) : (
                        <img src={doc} alt="Doc preview" className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => removeDoc(idx)}
                        className="absolute top-0.5 right-0.5 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-xs"
                        title="Remove document"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer (Matching Add New Customer Modal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-border bg-white flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-company-form"
            disabled={submitting || !companyName.trim()}
            className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Saving...
              </>
            ) : companyToEdit ? (
              "Save Changes"
            ) : (
              "Create Company"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

