"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Loader2, 
  AlertCircle, 
  ImagePlus, 
  Trash2, 
  Camera, 
  Image as ImageIcon,
  CheckCircle2, 
  CreditCard, 
  Settings2,
  ScanLine,
  Sparkles,
  FileText,
  Building2,
  Calendar
} from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";
import { CarMakeCombobox, CarModelCombobox } from "@/components/ui/CarMakeModelCombobox";

interface CreateUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  unitToEdit?: any;
}

export default function CreateUnitModal({ isOpen, onClose, onSuccess, unitToEdit }: CreateUnitModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Vehicle Card OCR Scanner State
  const [scanningCard, setScanningCard] = useState(false);
  const [cardScannedSuccess, setCardScannedSuccess] = useState(false);
  const [cardScanSummary, setCardScanSummary] = useState<string | null>(null);
  const [documents, setDocuments] = useState<string[]>([]);
  const [cardUploadMode, setCardUploadMode] = useState<"camera" | "gallery">("camera");
  const scanCardFileInputRef = useRef<HTMLInputElement | null>(null);
  const scanCardCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Vehicle pictures (supports live capture & gallery, multiple angles)
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUploadMode, setPhotoUploadMode] = useState<"camera" | "gallery">("camera");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Live Webcam Viewfinder State
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [webcamTarget, setWebcamTarget] = useState<"photo" | "card">("photo");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const toast = useToast();

  // Form State
  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: new Date().getFullYear(),
    plate: "",
    vin: "",
    color: "",
    mileage: 0 as number | string,
    status: "Available",
    dailyRate: 100 as number | string,
    dailyKmLimit: 0 as number | string,
    pricePerExtraKm: 0 as number | string,
    transmission: "Automatic",
    capacity: 5,
    fuelType: "Petrol",
    insuranceExpiry: "",
    registrationExpiry: "",
    owner: ""
  });

  const formatDateForInput = (d: any) => {
    if (!d) return "";
    try {
      return new Date(d).toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (unitToEdit) {
        setFormData({
          make: unitToEdit.make || "",
          model: unitToEdit.model || "",
          year: unitToEdit.year || new Date().getFullYear(),
          plate: unitToEdit.plate || "",
          vin: unitToEdit.vin || "",
          color: unitToEdit.color || "",
          mileage: unitToEdit.mileage ?? 0,
          status: unitToEdit.status || "Available",
          dailyRate: unitToEdit.dailyRate ?? 100,
          dailyKmLimit: unitToEdit.dailyKmLimit ?? 0,
          pricePerExtraKm: unitToEdit.pricePerExtraKm ?? 0,
          transmission: unitToEdit.transmission || "Automatic",
          capacity: unitToEdit.capacity ?? 5,
          fuelType: unitToEdit.fuelType || "Petrol",
          insuranceExpiry: formatDateForInput(unitToEdit.insuranceExpiry),
          registrationExpiry: formatDateForInput(unitToEdit.registrationExpiry),
          owner: unitToEdit.owner || ""
        });
        
        let loadedPhotos: string[] = [];
        if (unitToEdit.images && Array.isArray(unitToEdit.images)) {
          loadedPhotos = unitToEdit.images.filter((img: string) => typeof img === "string" && img.trim() !== "");
        } else if (typeof unitToEdit.image === "string" && unitToEdit.image.trim() !== "") {
          loadedPhotos = [unitToEdit.image];
        }
        setPhotos(loadedPhotos);
        setDocuments(Array.isArray(unitToEdit.documents) ? unitToEdit.documents : []);
      } else {
        resetForm();
      }
      setError(null);
    }
  }, [isOpen, unitToEdit]);

  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  useEffect(() => {
    if (isWebcamOpen && mediaStream && videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isWebcamOpen, mediaStream]);

  const resetForm = () => {
    setFormData({
      make: "",
      model: "",
      year: new Date().getFullYear(),
      plate: "",
      vin: "",
      color: "",
      mileage: 0,
      status: "Available",
      dailyRate: 100,
      dailyKmLimit: 0,
      pricePerExtraKm: 0,
      transmission: "Automatic",
      capacity: 5,
      fuelType: "Petrol",
      insuranceExpiry: "",
      registrationExpiry: "",
      owner: ""
    });
    setPhotos([]);
    setDocuments([]);
    setCardScannedSuccess(false);
    setCardScanSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (scanCardFileInputRef.current) scanCardFileInputRef.current.value = "";
    if (scanCardCameraInputRef.current) scanCardCameraInputRef.current.value = "";
    stopWebcam();
  };

  const startWebcam = async (target: "photo" | "card" = "photo") => {
    setCameraError(null);
    setWebcamTarget(target);
    setIsWebcamOpen(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam is not supported on this browser.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn("Video play error:", e));
      }
    } catch (err: any) {
      console.warn("Could not start live webcam:", err);
      setCameraError(err.message || "Camera access denied. Click below to use device camera or file selector.");
    }
  };

  const stopWebcam = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsWebcamOpen(false);
    setCameraError(null);
  };

  const captureWebcamPhoto = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    stopWebcam();

    if (webcamTarget === "card") {
      await processCardScanBase64([base64]);
    } else {
      setPhotos((prev) => [...prev, base64].slice(0, 8));
      toast.success("Live photo captured successfully! ✓");
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
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
          resolve(canvas.toDataURL("image/jpeg", 0.7));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const processCardScanBase64 = async (base64Images: string[]) => {
    if (base64Images.length === 0) return;
    setScanningCard(true);
    setError(null);

    try {
      toast.success("Analyzing vehicle license with AI... (جارٍ قراءة بطاقة رخصة المركبة)");

      // Store in documents preview
      setDocuments((prev) => {
        const combined = [...prev];
        base64Images.forEach((img) => {
          if (!combined.includes(img)) combined.push(img);
        });
        return combined;
      });

      const res = await fetch("/api/ocr/scan-vehicle-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to scan vehicle license card.");
      }

      const { data } = resData;

      setFormData((prev) => ({
        ...prev,
        plate: data.plate || prev.plate,
        owner: data.owner || prev.owner,
        make: data.make || prev.make,
        model: data.model || prev.model,
        year: Number(data.year) || prev.year,
        color: data.color || prev.color,
        vin: data.vin || prev.vin,
        capacity: Number(data.capacity) || prev.capacity,
        registrationExpiry: data.registrationExpiry || prev.registrationExpiry,
        insuranceExpiry: data.insuranceExpiry || prev.insuranceExpiry,
      }));

      setCardScannedSuccess(true);
      const summaryParts = [
        data.make && data.model ? `${data.make} ${data.model} ${data.year || ""}`.trim() : "",
        data.plate ? `Plate: ${data.plate}` : "",
        data.vin ? `VIN: ${data.vin}` : "",
        data.capacity ? `Seats: ${data.capacity}` : "",
        data.owner ? `Owner: ${data.owner}` : "",
        data.registrationExpiry ? `Reg. Exp: ${data.registrationExpiry}` : "",
        data.insuranceExpiry ? `Ins. Exp: ${data.insuranceExpiry}` : "",
      ].filter(Boolean);

      setCardScanSummary(summaryParts.join(" • "));
      toast.success("✓ Vehicle license extracted successfully! (تم استخراج بيانات رخصة السيارة بنجاح)");
    } catch (err: any) {
      console.error("Vehicle card scan error:", err);
      setError(err.message || "Failed to extract vehicle license details.");
      toast.error(err.message || "Failed to extract vehicle license details.");
    } finally {
      setScanningCard(false);
    }
  };

  const scanUploadedCard = async (imagesToScan?: string[]) => {
    const targets = imagesToScan || documents;
    if (!targets || targets.length === 0) {
      toast.error("Please upload or take a picture of the vehicle card first.");
      return;
    }
    await processCardScanBase64(targets);
  };

  const handleVehicleCardFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const base64List: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const b64 = await compressImage(files[i]);
      if (b64) base64List.push(b64);
    }

    if (e.target) e.target.value = "";
    if (base64List.length > 0) {
      setDocuments((prev) => {
        const combined = [...prev];
        base64List.forEach((img) => {
          if (!combined.includes(img)) combined.push(img);
        });
        return combined.slice(0, 3);
      });
      await processCardScanBase64(base64List);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
    toast.info("Vehicle license document removed");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    toast.success(`Processing ${files.length > 1 ? `${files.length} images` : "image"}...`);
    const newPhotos: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const compressedBase64 = await compressImage(file);
      if (compressedBase64) {
        newPhotos.push(compressedBase64);
      }
    }

    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 8));

    if (e.target) {
      e.target.value = "";
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    toast.info("Photo removed");
  };

  const setAsPrimaryPhoto = (index: number) => {
    if (index === 0) return;
    setPhotos((prev) => {
      const selected = prev[index];
      const remaining = prev.filter((_, i) => i !== index);
      return [selected, ...remaining];
    });
    toast.success("Set as primary vehicle photo! ✓");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload photos if they are in base64 format
      const finalImageUrls: string[] = [];
      for (const p of photos) {
        if (p.startsWith("data:image")) {
          toast.success("Uploading vehicle photo...");
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: p, folder: "wheelzie_vehicles" }),
          });
          if (!res.ok) throw new Error("Image upload failed");
          const data = await res.json();
          if (data.url) finalImageUrls.push(data.url);
        } else if (p.startsWith("http") || p.startsWith("/")) {
          finalImageUrls.push(p);
        }
      }

      // 2. Upload vehicle license documents if in base64
      const finalDocUrls: string[] = [];
      for (const doc of documents) {
        if (doc.startsWith("data:image") || doc.startsWith("data:application/pdf")) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: doc, folder: "vehicle_documents" }),
          });
          if (!res.ok) throw new Error("Vehicle document upload failed");
          const data = await res.json();
          if (data.url) finalDocUrls.push(data.url);
        } else if (doc.startsWith("http") || doc.startsWith("/")) {
          finalDocUrls.push(doc);
        }
      }

      // 3. Submit vehicle data
      const method = unitToEdit ? "PUT" : "POST";
      const url = unitToEdit ? `/api/units/${unitToEdit._id}` : "/api/units";

      toast.success("Saving vehicle details...");
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          year: Number(formData.year),
          mileage: Number(formData.mileage),
          dailyRate: Number(formData.dailyRate),
          dailyKmLimit: Number(formData.dailyKmLimit),
          pricePerExtraKm: Number(formData.pricePerExtraKm),
          capacity: Number(formData.capacity),
          images: finalImageUrls,
          documents: finalDocUrls
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save vehicle.");
      }
      
      toast.success(unitToEdit ? "Vehicle updated successfully! ✓" : "Vehicle created successfully! ✓");
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Widescreen Modal (max-w-5xl matching CreateClientModal) - Height minimized on mobile */}
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh] sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-base sm:text-xl font-bold text-text-primary flex items-center gap-1.5 sm:gap-2">
              <ExecutiveCarIcon className="text-brand shrink-0" size={20} />
              <span>{unitToEdit ? "Edit Vehicle Details" : "Add New Vehicle"}</span>
            </h2>
            <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5 line-clamp-1 sm:line-clamp-none">
              {unitToEdit
                ? "Update vehicle specifications, rental rates, and profile picture."
                : "Register a new vehicle with technical specifications and pricing to your fleet."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        {/* Form Body */}
        <div className="p-2.5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/40 space-y-3 sm:space-y-6">
          <form id="create-unit-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-6">
            
            {/* Hidden Input for Gallery Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            {/* Hidden Input for Direct Camera Capture */}
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            {/* Hidden Inputs for Vehicle License / Mulkiya OCR Scan */}
            <input
              type="file"
              ref={scanCardFileInputRef}
              onChange={handleVehicleCardFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <input
              type="file"
              ref={scanCardCameraInputRef}
              onChange={handleVehicleCardFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* SECTION 1: VEHICLE LICENSE CARD (MULKIYA / CARTE GRISE) & AI SCANNING */}
            <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-border shadow-xs space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText size={15} className="text-brand shrink-0" />
                    <span>Vehicle License Card (بطاقة ملكية المركبة / Carte Grise)</span>
                    <span className="text-[11px] sm:text-xs text-gray-500 font-normal">
                      {documents.length}/3
                    </span>
                  </label>
                  {cardScannedSuccess && (
                    <span className="sm:hidden text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> Auto-Filled
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end w-full sm:w-auto flex-wrap">
                  {cardScannedSuccess && (
                    <span className="hidden sm:flex text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full items-center gap-1">
                      <CheckCircle2 size={11} /> Auto-Filled by AI
                    </span>
                  )}

                  {/* Mode Switcher: Camera vs Gallery (like Add New Driver) */}
                  <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setCardUploadMode("camera")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        cardUploadMode === "camera"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Camera Mode (التقاط بالكاميرا)"
                    >
                      <Camera size={12} className={cardUploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardUploadMode("gallery")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        cardUploadMode === "gallery"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Gallery / Files Mode (رفع من الملفات)"
                    >
                      <ImageIcon size={12} className={cardUploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                      <span>Gallery</span>
                    </button>
                  </div>

                  {documents.length > 0 && (
                    <button
                      type="button"
                      disabled={scanningCard || submitting}
                      onClick={() => scanUploadedCard()}
                      className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-brand hover:bg-brand-dark text-white rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer shrink-0 animate-in fade-in"
                    >
                      {scanningCard ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Scanning...</span>
                        </>
                      ) : (
                        <>
                          <ScanLine size={12} />
                          <span>Scan License (مسح الملكية)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Card Previews Grid */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden group shadow-2xs shrink-0"
                  >
                    <img
                      src={doc}
                      alt={`Vehicle License ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocument(idx)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                      title="Remove Document"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {/* Single Contextual Trigger Button matching active cardUploadMode */}
                {documents.length < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (cardUploadMode === "camera") {
                        if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
                          startWebcam("card");
                        } else {
                          scanCardCameraInputRef.current?.click();
                        }
                      } else {
                        scanCardFileInputRef.current?.click();
                      }
                    }}
                    className={`w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs shrink-0 ${
                      cardUploadMode === "camera"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title={cardUploadMode === "camera" ? "Take Photo with Camera (التقاط بالكاميرا)" : "Upload File (رفع ملف)"}
                  >
                    {cardUploadMode === "camera" ? (
                      <>
                        <Camera size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-brand leading-tight">Take Photo</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Camera</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-gray-600 group-hover:text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 group-hover:text-brand leading-tight">Upload</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Card Image</span>
                      </>
                    )}
                  </button>
                )}
              </div>


              <p className="text-[10px] sm:text-xs text-gray-500">
                Supported formats: PNG, JPG, WebP. Take picture or upload vehicle registration card (Mulkiya / Carte Grise) to auto-extract plate, owner, VIN, make, model & dates.
              </p>
            </div>

            {/* SECTION 2: VEHICLE PHOTOS */}
            <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-border shadow-xs space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2.5">
                <div className="flex items-center justify-between w-full sm:w-auto">
                  <label className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Camera size={15} className="text-brand shrink-0" />
                    <span>Vehicle Photos (صور المركبة)</span>
                    <span className="text-[11px] sm:text-xs text-gray-500 font-normal">
                      {photos.length}/8
                    </span>
                  </label>
                  {photos.length > 0 && (
                    <span className="sm:hidden text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={10} /> {photos.length} Photo{photos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end w-full sm:w-auto flex-wrap">
                  {photos.length > 0 && (
                    <span className="hidden sm:flex text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full items-center gap-1">
                      <CheckCircle2 size={11} /> {photos.length} Photo{photos.length > 1 ? "s" : ""} attached
                    </span>
                  )}

                  {/* Mode Switcher: Camera vs Gallery (like Add New Driver) */}
                  <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setPhotoUploadMode("camera")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        photoUploadMode === "camera"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Camera Mode (التقاط بالكاميرا)"
                    >
                      <Camera size={12} className={photoUploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUploadMode("gallery")}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs ${
                        photoUploadMode === "gallery"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Gallery / Files Mode (رفع من الملفات)"
                    >
                      <ImageIcon size={12} className={photoUploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                      <span>Gallery</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Photos Grid */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {photos.map((item, index) => (
                  <div
                    key={index}
                    className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden group shadow-2xs shrink-0"
                  >
                    <img
                      src={item}
                      alt={`Vehicle preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary Badge for index 0 */}
                    {index === 0 && (
                      <span className="absolute top-1 left-1 z-10 text-[8px] font-bold bg-brand text-white px-1.5 py-0.2 rounded shadow-xs">
                        Primary
                      </span>
                    )}

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => setAsPrimaryPhoto(index)}
                          className="px-1.5 py-0.5 bg-white/90 text-gray-800 text-[8px] font-bold rounded hover:bg-white transition-colors cursor-pointer"
                          title="Set as Primary Photo"
                        >
                          Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="p-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Contextual Trigger Button */}
                {photos.length < 8 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (photoUploadMode === "camera") {
                        if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") {
                          startWebcam("photo");
                        } else {
                          cameraInputRef.current?.click();
                        }
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`w-16 h-16 sm:w-24 sm:h-24 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs shrink-0 ${
                      photoUploadMode === "camera"
                        ? "border-brand bg-brand/[0.04] text-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                    title={photoUploadMode === "camera" ? "Take Photo of Vehicle (التقاط صورة)" : "Upload Vehicle Photos (رفع صور)"}
                  >
                    {photoUploadMode === "camera" ? (
                      <>
                        <Camera size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-brand leading-tight">Take Photo</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Camera</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus size={16} className="mb-0.5 group-hover:scale-110 transition-transform text-gray-600 group-hover:text-brand" />
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 group-hover:text-brand leading-tight">Upload</span>
                        <span className="text-[7px] sm:text-[8px] opacity-70">Gallery</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <p className="text-[10px] sm:text-xs text-gray-500">
                The primary photo is displayed on fleet cards, bookings, and customer contracts.
              </p>
            </div>

            {/* SECTION 2: IDENTIFICATION & GENERAL DETAILS */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <ExecutiveCarIcon size={18} className="text-brand" />
                    Vehicle Identification
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Enter brand, model year, license plate, and VIN number
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CarMakeCombobox
                  required
                  value={formData.make}
                  onChange={(newMake) => {
                    setFormData((prev) => ({
                      ...prev,
                      make: newMake,
                      model: prev.make && prev.make !== newMake ? "" : prev.model
                    }));
                  }}
                  onSelectMake={(newMake) => {
                    setFormData((prev) => ({
                      ...prev,
                      make: newMake,
                      model: prev.make && prev.make !== newMake ? "" : prev.model
                    }));
                  }}
                />

                <CarModelCombobox
                  required
                  value={formData.model}
                  make={formData.make}
                  onChange={(newModel) => {
                    setFormData((prev) => ({
                      ...prev,
                      model: newModel
                    }));
                  }}
                  onSelectMakeAndModel={(autoMake, newModel) => {
                    setFormData((prev) => ({
                      ...prev,
                      make: autoMake || prev.make,
                      model: newModel
                    }));
                  }}
                />
                
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required
                    type="number" 
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.year || ""}
                    onChange={(e) => setFormData({...formData, year: parseInt(e.target.value) || new Date().getFullYear()})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Color <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required
                    placeholder="e.g. White" 
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Plate Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required
                    placeholder="e.g. A-12345" 
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white uppercase font-mono"
                    value={formData.plate}
                    onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    VIN Number <span className="text-red-500">*</span>
                  </label>
                  <input 
                    required
                    placeholder="17-character VIN" 
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white uppercase font-mono"
                    value={formData.vin}
                    onChange={(e) => setFormData({...formData, vin: e.target.value.toUpperCase()})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Owner / Company (المالك)
                  </label>
                  <input 
                    placeholder="e.g. Neon Drive Car Rental" 
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.owner}
                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Registration Expiry (انتهاء الملكية)
                  </label>
                  <input 
                    type="date"
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.registrationExpiry}
                    onChange={(e) => setFormData({...formData, registrationExpiry: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Status
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={unitToEdit?.status === "Rented"}
                    className={`w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all ${
                      unitToEdit?.status === "Rented" ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-white"
                    }`}
                    title={unitToEdit?.status === "Rented" ? "Rented vehicles cannot have their status manually changed" : ""}
                  >
                    <option value="Available">Available</option>
                    <option value="Rented" disabled={unitToEdit?.status !== "Rented"}>Rented</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Current Mileage (km)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.mileage || ""}
                    onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: RENTAL RATES & LIMITS */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <CreditCard size={16} className="text-brand" />
                    Rental Pricing & Limits
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Configure daily pricing, mileage limits, and insurance expiration
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Daily Rate (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="100.00"
                    value={formData.dailyRate}
                    onChange={(e) => setFormData({ ...formData, dailyRate: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Daily KM Limit (0 for Unlimited) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={formData.dailyKmLimit}
                    onChange={(e) => setFormData({ ...formData, dailyKmLimit: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Price per Extra KM (AED) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.50"
                    value={formData.pricePerExtraKm}
                    onChange={(e) => setFormData({ ...formData, pricePerExtraKm: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Insurance Expiry Date
                  </label>
                  <input 
                    type="date"
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({...formData, insuranceExpiry: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: TECHNICAL SPECIFICATIONS */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <Settings2 size={16} className="text-brand" />
                    Technical Specifications
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Configure gearbox, seating capacity, and fuel specifications
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Transmission <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.transmission}
                    onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Capacity (Seats) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="number"
                    required
                    min="1"
                    placeholder="5"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Fuel Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white"
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl flex items-start justify-between gap-2 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
                  <p>{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 hover:bg-red-100 rounded-lg text-red-400 hover:text-red-700 transition-colors cursor-pointer shrink-0"
                  aria-label="Dismiss error"
                >
                  <X size={15} />
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer (Matching CreateClientModal) */}
        <div className="px-3.5 py-2.5 sm:px-6 sm:py-4 border-t border-border bg-white flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <div>
            {photos.length > 0 && (
              <span className="text-[11px] sm:text-xs text-emerald-700 font-bold flex items-center gap-1 sm:gap-1.5">
                <CheckCircle2 size={13} /> {photos.length} vehicle photo{photos.length > 1 ? "s" : ""} attached
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-center"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-unit-form"
              disabled={submitting}
              className="flex-1 sm:flex-initial px-4 sm:px-6 py-2 sm:py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Saving...
                </>
              ) : unitToEdit ? (
                "Save Changes"
              ) : (
                "Create Vehicle"
              )}
            </button>
          </div>
        </div>

      </div>

      {/* LIVE WEBCAM MODAL */}
      {isWebcamOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Webcam Modal Header */}
            <div className="px-5 py-3.5 bg-gray-900/90 border-b border-gray-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-red-500 animate-pulse" />
                <h3 className="text-sm font-bold">
                  {webcamTarget === "card"
                    ? "Live Vehicle License Camera (مسح رخصة المركبة / الملكية)"
                    : "Live Vehicle Camera (التقاط صورة المركبة)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={stopWebcam}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Viewfinder Area */}
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder crosshair overlay */}
              <div className="absolute inset-8 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-4">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-brand" />
                  <div className="w-5 h-5 border-t-2 border-r-2 border-brand" />
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-brand" />
                  <div className="w-5 h-5 border-b-2 border-r-2 border-brand" />
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle size={36} className="text-red-500 mb-2" />
                  <p className="text-white text-sm font-semibold mb-1">Camera Access Notice</p>
                  <p className="text-gray-400 text-xs mb-4">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      stopWebcam();
                      if (webcamTarget === "card") {
                        scanCardFileInputRef.current?.click();
                      } else {
                        cameraInputRef.current?.click();
                      }
                    }}
                    className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-semibold hover:bg-brand-dark transition-colors cursor-pointer"
                  >
                    Open Device Camera Input
                  </button>
                </div>
              )}
            </div>

            {/* Webcam Modal Controls */}
            <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  stopWebcam();
                  if (webcamTarget === "card") {
                    scanCardFileInputRef.current?.click();
                  } else {
                    cameraInputRef.current?.click();
                  }
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Use device file picker
              </button>

              <button
                type="button"
                onClick={captureWebcamPhoto}
                disabled={!!cameraError}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <Camera size={18} />
                <span>{webcamTarget === "card" ? "Scan License Card" : "Capture Photo"}</span>
              </button>

              <button
                type="button"
                onClick={stopWebcam}
                className="px-4 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
