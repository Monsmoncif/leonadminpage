"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  UserPlus, 
  Loader2, 
  AlertCircle, 
  ImagePlus, 
  Trash2, 
  FileText, 
  ScanLine, 
  CheckCircle2, 
  User, 
  CreditCard, 
  ShieldCheck,
  Camera,
  ImageIcon
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface CreateDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  driverToEdit?: any | null;
}

export default function CreateDriverModal({
  isOpen,
  onClose,
  onSuccess,
  driverToEdit,
}: CreateDriverModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    driverId: "",
    license: "",
    licenseExpiry: "",
    status: "Active",
    password: "",
  });

  const [documents, setDocuments] = useState<File[]>([]);
  const [docPreviews, setDocPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scanningDoc, setScanningDoc] = useState(false);
  const [autoScannedSuccess, setAutoScannedSuccess] = useState(false);
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (driverToEdit) {
        setFormData({
          name: driverToEdit.name || "",
          email: driverToEdit.email || "",
          phone: driverToEdit.phone || "",
          driverId: driverToEdit.driverId || "",
          license: driverToEdit.license || "",
          licenseExpiry: driverToEdit.licenseExpiry ? new Date(driverToEdit.licenseExpiry).toISOString().split('T')[0] : "",
          status: driverToEdit.status || "Active",
          password: "", // don't load password on edit
        });
        setDocPreviews(driverToEdit.documents || []);
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          driverId: "",
          license: "",
          licenseExpiry: "",
          status: "Active",
          password: "",
        });
        setDocPreviews([]);
      }
      setDocuments([]);
      setError("");
      setAutoScannedSuccess(false);
    }
  }, [isOpen, driverToEdit]);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const isPdf = file.type === "application/pdf";
      if (isPdf) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
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

          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (docPreviews.length + newFiles.length > 5) {
        setError("Maximum 5 documents allowed");
        return;
      }

      try {
        const processedFiles = await Promise.all(
          newFiles.map(file => processFile(file))
        );
        setDocPreviews(prev => [...prev, ...processedFiles]);
        setError("");
      } catch (err) {
        console.error("Error processing documents:", err);
        setError("Failed to process one or more documents");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const removeDoc = (index: number) => {
    setDocPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Scan all currently uploaded driver document images with AI
  const scanUploadedDocs = async (imagesToScan?: string[]) => {
    const targets = imagesToScan || docPreviews;
    if (!targets || targets.length === 0) {
      toast.error("Please upload at least one document image first.");
      return;
    }

    setScanningDoc(true);
    setError("");
    toast.success("Scanning driver documents with AI...");

    try {
      const res = await fetch("/api/ocr/scan-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: targets }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to scan documents");
      }

      const { data } = resData;

      // Auto-fill driver fields strictly from extracted data without touching or duplicating doc previews
      setFormData((prev) => ({
        ...prev,
        name: data.name || prev.name,
        license: data.licenseNumber || data.idNumber || prev.license,
        licenseExpiry: data.licenseExpiry
          ? new Date(data.licenseExpiry).toISOString().split("T")[0]
          : prev.licenseExpiry,
        driverId: prev.driverId || data.idNumber || `DRV-${Math.floor(100 + Math.random() * 900)}`,
        phone: data.phone || prev.phone,
        email: data.email || prev.email,
      }));

      setAutoScannedSuccess(true);
      toast.success("Driver details extracted successfully! ✓");
    } catch (err: any) {
      console.error("Scan error:", err);
      setError(err.message || "An error occurred while scanning documents");
      toast.error(err.message || "An error occurred while scanning documents");
    } finally {
      setScanningDoc(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setScanningDoc(true);
    setError("");
    toast.success("Scanning driver documents with AI...");

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
      setError(err.message || "An error occurred while scanning documents");
      toast.error(err.message || "An error occurred while scanning documents");
    } finally {
      setScanningDoc(false);
      if (scanInputRef.current) scanInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      let uploadedDocUrls: string[] = [];
      const existingDocs = docPreviews.filter(
        (doc) => doc.startsWith("http") || doc.startsWith("/")
      );
      
      const newImagesToUpload = docPreviews.filter(
        (doc) => doc.startsWith("data:image")
      );
      const newPdfsToUpload = docPreviews.filter(
        (doc) => doc.startsWith("data:application/pdf")
      );

      if (newImagesToUpload.length > 0 || newPdfsToUpload.length > 0) {
        const allNewDocs = [...newImagesToUpload, ...newPdfsToUpload];
        
        for (const doc of allNewDocs) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: doc }),
          });
          const data = await res.json();
          if (!res.ok || !data.url) {
            throw new Error("Failed to upload one or more documents");
          }
          uploadedDocUrls.push(data.url);
        }
      }

      const allDocs = [...existingDocs, ...uploadedDocUrls];

      const url = driverToEdit ? `/api/drivers/${driverToEdit._id}` : "/api/drivers";
      const method = driverToEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          documents: allDocs,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      toast.success(
        driverToEdit
          ? "Driver updated successfully! ✓"
          : "Driver added successfully! ✓"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save driver");
      toast.error(err.message || "Failed to save driver");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError("");
    setAutoScannedSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Widescreen Modal (max-w-5xl matching CreateClientModal & CreateUnitModal) */}
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <UserPlus className="text-brand" size={22} />
              {driverToEdit ? "Edit Driver Profile" : "Add New Driver"}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {driverToEdit
                ? "Update driver identification, license details, and account credentials."
                : "Register a new driver with smart AI document extraction and licensing credentials."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-6">
          <form id="create-driver-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Hidden Inputs for Document Upload & Scan */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleDocChange}
              accept="image/*,application/pdf"
              multiple
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

            {/* SECTION 1: DOCUMENTS & AI SCANNING */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <FileText size={16} className="text-brand" />
                    Driver Documents & AI Extraction
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Take photo or upload license/ID (max 5 files). AI can scan and auto-fill driver details.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {autoScannedSuccess && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Auto-Filled by AI
                    </span>
                  )}

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

                  {!driverToEdit && (
                    <button
                      type="button"
                      disabled={scanningDoc || isSubmitting}
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
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {docPreviews.map((doc, idx) => {
                  const isPdf = doc.includes("application/pdf") || doc.endsWith(".pdf");
                  return (
                    <div
                      key={idx}
                      className="relative w-28 h-28 rounded-xl border border-gray-200 overflow-hidden group shadow-xs bg-gray-50 flex items-center justify-center"
                    >
                      {isPdf ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-brand">
                          <FileText size={32} className="text-red-500 mb-1" />
                          <span className="text-[10px] font-medium text-gray-500 text-center mt-1 truncate w-full px-1">PDF</span>
                        </div>
                      ) : (
                        <img
                          src={doc}
                          alt="Document preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeDoc(idx)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                        title="Remove Document"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}

                {/* Take Photo Button */}
                {docPreviews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className={`w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                      uploadMode === "camera"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title="Take Photo with Camera (التقاط بالكاميرا)"
                  >
                    <Camera size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">Take Photo</span>
                    <span className="text-[9px] opacity-70">Camera</span>
                  </button>
                )}

                {/* Upload File Button */}
                {docPreviews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-28 h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs ${
                      uploadMode === "gallery"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title="Upload File or PDF from Device (رفع من الجهاز)"
                  >
                    <ImagePlus size={24} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[11px] font-bold">Upload File</span>
                    <span className="text-[9px] opacity-70">Gallery / PDF</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: PNG, JPG, WebP, or PDF.
              </p>
            </div>

            {/* SECTION 2: PERSONAL INFORMATION */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <User size={16} className="text-brand" />
                    Personal Information
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Full name, email address, and direct telephone number
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    placeholder="e.g. john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    placeholder="e.g. +971 50 123 4567"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: DRIVER IDENTIFICATION & LICENSING */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <CreditCard size={16} className="text-brand" />
                    Driver Identification & Licensing
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Official internal driver ID, driver's license number, and expiration date
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Driver ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="driverId"
                    required
                    value={formData.driverId}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white uppercase font-mono"
                    placeholder="e.g. DRV-001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    License Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="license"
                    required
                    value={formData.license}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white uppercase font-mono"
                    placeholder="e.g. L123456"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    License Expiry <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="licenseExpiry"
                    required
                    value={formData.licenseExpiry}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: ACCOUNT SECURITY & STATUS */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <ShieldCheck size={16} className="text-brand" />
                    Account Security & Status
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Configure driver portal login credentials and system status
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Deactivated">Deactivated</option>
                  </select>
                </div>

                {!driverToEdit && (
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Account Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                      placeholder="Enter a secure password for driver login"
                    />
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-between shrink-0">
          <div>
            {docPreviews.length > 0 && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> {docPreviews.length} document{docPreviews.length > 1 ? "s" : ""} attached
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-driver-form"
              disabled={isSubmitting || scanningDoc}
              className="px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : driverToEdit ? (
                "Save Changes"
              ) : (
                "Create Driver"
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
