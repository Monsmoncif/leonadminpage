"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  ScanLine, 
  Users,
  CheckCircle2,
  FileText,
  Camera,
  ImageIcon,
  ImagePlus
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface AdditionalDriverData {
  name: string;
  license: string;
  nationality: string;
  phone: string;
  expiry: string;
  issuedAt: string;
}

interface AdditionalDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AdditionalDriverData) => void;
  onRemove?: () => void;
  initialData?: AdditionalDriverData;
  existingClients?: any[];
}

export default function AdditionalDriverModal({
  isOpen,
  onClose,
  onSave,
  onRemove,
  initialData,
  existingClients = [],
}: AdditionalDriverModalProps) {
  const [scanningDoc, setScanningDoc] = useState(false);
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const [error, setError] = useState<string | null>(null);
  const [docPreviews, setDocPreviews] = useState<string[]>([]);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const [formData, setFormData] = useState<AdditionalDriverData>({
    name: "",
    license: "",
    nationality: "",
    phone: "",
    expiry: "",
    issuedAt: "",
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.name) {
        setFormData(initialData);
      } else {
        setFormData({
          name: "",
          license: "",
          nationality: "",
          phone: "",
          expiry: "",
          issuedAt: "",
        });
      }
      setDocPreviews([]);
      setError(null);
    }
  }, [isOpen, initialData]);

  // Process file into base64 with compression
  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (file.type === "application/pdf") {
          resolve(event.target?.result as string);
          return;
        }

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // OCR Scan document
  // Scan all currently uploaded driver document images with AI
  const scanUploadedDocs = async (imagesToScan?: string[]) => {
    const targets = imagesToScan || docPreviews;
    if (!targets || targets.length === 0) {
      toast.error("Please upload at least one document image first.");
      return;
    }

    setScanningDoc(true);
    setError(null);
    toast.success("جاري فحص وقراءة كافة الوثائق عبر الذكاء الاصطناعي... (Scanning all documents...)");

    try {
      const res = await fetch("/api/ocr/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: targets }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "فشل مسح الوثائق");
      }

      const { data } = resData;

      // 1. Auto-fill form fields strictly from extracted data
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        license: data.licenseNumber || data.idNumber || prev.license,
        expiry: data.licenseExpiry || prev.expiry,
        nationality: data.nationality || prev.nationality,
        issuedAt: data.address || prev.issuedAt,
      }));

      toast.success("تم استخراج بيانات السائق من كافة الصور بنجاح! ✓");
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast.error(err.message || "حدث خطأ أثناء فحص الوثائق");
    } finally {
      setScanningDoc(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanningDoc(true);
    setError(null);
    toast.success("جاري فحص وقراءة وثائق السائق عبر الذكاء الاصطناعي... (Scanning documents...)");

    try {
      const base64List: string[] = [];
      for (const file of Array.from(files)) {
        const b64 = await processFile(file);
        if (b64) base64List.push(b64);
      }

      const allDocs = [...docPreviews];
      base64List.forEach((b64) => {
        if (!allDocs.includes(b64)) allDocs.push(b64);
      });
      setDocPreviews(allDocs);

      await scanUploadedDocs(allDocs.length > 0 ? allDocs : base64List);
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message);
      toast.error(err.message || "حدث خطأ أثناء فحص الوثائق");
    } finally {
      setScanningDoc(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const processedFiles: string[] = [];
    for (const file of Array.from(files)) {
      const processedBase64 = await processFile(file);
      processedFiles.push(processedBase64);
    }
    setDocPreviews((prev) => [...prev, ...processedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeDoc = (index: number) => {
    setDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectExistingClient = (clientId: string) => {
    if (!clientId) return;
    const client = existingClients.find((c) => c._id === clientId);
    if (!client) return;

    setFormData({
      name: client.name || "",
      license: client.licenseNumber || client.license || client.idNumber || "",
      nationality: client.nationality || "",
      phone: client.phone || "",
      expiry: client.licenseExpiry ? client.licenseExpiry.split("T")[0] : "",
      issuedAt: client.address || "",
    });

    if (client.documents && Array.isArray(client.documents)) {
      setDocPreviews(client.documents);
    }

    toast.success(`تم اختيار بيانات العميل (${client.name}) بنجاح`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Please provide the second driver's full name.");
      return;
    }

    onSave({
      name: formData.name.trim(),
      license: formData.license.trim(),
      nationality: formData.nationality.trim(),
      phone: formData.phone.trim(),
      expiry: formData.expiry,
      issuedAt: formData.issuedAt.trim(),
    });

    toast.success("تمت إضافة السائق الثاني بنجاح! ✓");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Add Second Driver (بيانات السائق الإضافي)
              </h2>
              <p className="text-xs text-text-secondary">
                Scan ID / Driving License or fill details for the additional driver
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          <form id="additional-driver-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Hidden Inputs for Scan & Upload */}
            <input
              type="file"
              ref={scanInputRef}
              onChange={handleScanDocument}
              accept="image/*,application/pdf"
              multiple
              className="hidden"
            />
            {/* Direct Scan Camera input */}
            <input
              type="file"
              ref={scanCameraInputRef}
              onChange={handleScanDocument}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDocChange}
              multiple
              accept="image/*,application/pdf"
              className="hidden"
            />
            {/* Camera input with capture="environment" for taking photo */}
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleDocChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Quick Autofill from existing customers */}
            {existingClients.length > 0 && (
              <div className="bg-brand/5 border border-brand/20 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-text-secondary flex items-center gap-2">
                  <Users size={15} className="text-brand" />
                  <span>Choose from existing customers (اختيار عميل مسجل مسبقاً):</span>
                </span>
                <select
                  className="bg-white border border-border rounded-xl text-xs px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand cursor-pointer text-text-primary sm:w-60"
                  onChange={(e) => handleSelectExistingClient(e.target.value)}
                  defaultValue=""
                >
                  <option value="">-- Select Saved Customer --</option>
                  {existingClients.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.name} {client.phone ? `(${client.phone})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Document Upload & Scan Document */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-border shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="block text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>Documents (Passport, ID, License)</span>
                  <span className="text-xs text-gray-500 font-normal">
                    {docPreviews.length}/5
                  </span>
                </label>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Mode Switcher: Camera vs Gallery (like car inspection) */}
                  <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setUploadMode("camera")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        uploadMode === "camera"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Camera Mode (التقاط بالكاميرا)"
                    >
                      <Camera size={14} className={uploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("gallery")}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        uploadMode === "gallery"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Gallery / Files Mode (رفع من الملفات)"
                    >
                      <ImageIcon size={14} className={uploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                      <span>Gallery</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={scanningDoc}
                    onClick={() => {
                      if (docPreviews.length > 0) {
                        scanUploadedDocs();
                      } else {
                        if (uploadMode === "camera") {
                          scanCameraInputRef.current?.click();
                        } else {
                          scanInputRef.current?.click();
                        }
                      }
                    }}
                    className="px-3.5 py-1.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {scanningDoc ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        {uploadMode === "camera" && docPreviews.length === 0 ? (
                          <Camera size={13} />
                        ) : (
                          <ScanLine size={13} />
                        )}
                        <span>
                          {docPreviews.length > 0 
                            ? "Scan Document" 
                            : uploadMode === "camera" 
                            ? "Take Photo & Scan" 
                            : "Scan Document"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Previews */}
              <div className="flex flex-wrap gap-3">
                {docPreviews.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-border group bg-gray-50 shadow-2xs">
                    <img src={src} alt="Document" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeDoc(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove Document"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {/* Take Photo Button */}
                {docPreviews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                      uploadMode === "camera"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title="Take Photo with Camera (التقاط بالكاميرا)"
                  >
                    <Camera size={20} className="mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Take Photo</span>
                    <span className="text-[8px] opacity-70">Camera</span>
                  </button>
                )}

                {/* Upload File Button */}
                {docPreviews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                      uploadMode === "gallery"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title="Upload File or PDF from Device (رفع من الجهاز)"
                  >
                    <ImagePlus size={20} className="mb-0.5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Upload</span>
                    <span className="text-[8px] opacity-70">Gallery / PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Full Name of 2nd Driver (اسم السائق الثاني) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Driving License No (رقم رخصة القيادة)
                </label>
                <input
                  type="text"
                  placeholder="e.g. DL-12345678"
                  value={formData.license}
                  onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Phone Number (رقم الهاتف)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +971 50 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Nationality (الجنسية)
                </label>
                <input
                  type="text"
                  placeholder="e.g. French, Emirati..."
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  License Expiry (تاريخ انتهاء الرخصة)
                </label>
                <input
                  type="date"
                  value={formData.expiry}
                  onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Issued At / Address (جهة الإصدار / العنوان)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dubai, Abu Dhabi..."
                  value={formData.issuedAt}
                  onChange={(e) => setFormData({ ...formData, issuedAt: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 shrink-0 bg-gray-50">
          <div>
            {initialData?.name && onRemove && (
              <button
                type="button"
                onClick={() => {
                  onRemove();
                  onClose();
                  toast.success("تمت إزالة السائق الإضافي بنجاح");
                }}
                className="px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-red-200"
              >
                Remove 2nd Driver
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="additional-driver-form"
              className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>Save Second Driver</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
