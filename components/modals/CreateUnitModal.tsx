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
  Settings2 
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
  
  // Vehicle pictures (supports live capture & gallery, multiple angles)
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Live Webcam Viewfinder State
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
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
    insuranceExpiry: ""
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
          insuranceExpiry: formatDateForInput(unitToEdit.insuranceExpiry)
        });
        
        let loadedPhotos: string[] = [];
        if (unitToEdit.images && Array.isArray(unitToEdit.images)) {
          loadedPhotos = unitToEdit.images.filter((img: string) => typeof img === "string" && img.trim() !== "");
        } else if (typeof unitToEdit.image === "string" && unitToEdit.image.trim() !== "") {
          loadedPhotos = [unitToEdit.image];
        }
        setPhotos(loadedPhotos);
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
      insuranceExpiry: ""
    });
    setPhotos([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    stopWebcam();
  };

  const startWebcam = async () => {
    setCameraError(null);
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

  const captureWebcamPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    setPhotos((prev) => [...prev, base64].slice(0, 8));
    stopWebcam();
    toast.success("Live photo captured successfully! ✓");
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

      // 2. Submit vehicle data
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
          images: finalImageUrls
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

            {/* SECTION 1: VEHICLE PHOTO (Matching Step 4 Inspection Photos with Camera/Gallery toggle) */}
            <div className="bg-white p-2.5 sm:p-5 rounded-xl sm:rounded-2xl border border-border shadow-xs space-y-2 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-1.5 sm:gap-2">
                    <Camera size={15} className="text-brand shrink-0" />
                    <span>Vehicle Photos</span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-text-secondary mt-0.5">
                    Take live photo with camera or upload from gallery (up to 8 photos)
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Mode Switcher: Camera vs Gallery (exact match to user screenshot) */}
                  <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold shrink-0">
                    <button
                      type="button"
                      onClick={() => setUploadMode("camera")}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                        uploadMode === "camera"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Camera Direct Mode (التقاط بالكاميرا)"
                    >
                      <Camera size={13} className={uploadMode === "camera" ? "text-brand" : "text-text-muted"} />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode("gallery")}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                        uploadMode === "gallery"
                          ? "bg-white text-brand shadow-xs font-bold"
                          : "text-text-muted hover:text-text-primary"
                      }`}
                      title="Gallery Mode (رفع من المعرض)"
                    >
                      <ImageIcon size={13} className={uploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
                      <span>Gallery</span>
                    </button>
                  </div>

                  {photos.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} /> {photos.length} Photo{photos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Photos Grid */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4">
                {photos.map((item, index) => (
                  <div
                    key={index}
                    className="relative w-32 h-24 sm:w-44 sm:h-32 rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden group shadow-2xs bg-gray-50 flex items-center justify-center shrink-0"
                  >
                    <img
                      src={item}
                      alt={`Vehicle preview ${index + 1}`}
                      className="w-full h-full object-contain p-1.5 sm:p-2"
                    />

                    {/* Primary Badge for index 0 */}
                    {index === 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 text-[8px] sm:text-[9px] font-bold bg-brand text-white px-1.5 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        Primary
                      </span>
                    )}

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1.5 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      {index !== 0 && (
                        <button
                          type="button"
                          onClick={() => setAsPrimaryPhoto(index)}
                          className="px-2 py-1 bg-white/90 text-gray-800 text-[9px] sm:text-[10px] font-bold rounded hover:bg-white transition-colors cursor-pointer"
                          title="Set as Primary Photo"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="p-1 sm:p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                        title="Delete Photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Photo Trigger Button */}
                {photos.length < 8 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (uploadMode === "camera") {
                        startWebcam();
                      } else {
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`w-32 h-24 sm:w-44 sm:h-32 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group shadow-2xs shrink-0 ${
                      uploadMode === "camera"
                        ? "border-brand/40 bg-brand/[0.03] text-brand hover:border-brand hover:bg-brand/10"
                        : "border-gray-300 text-gray-500 hover:border-brand hover:text-brand hover:bg-brand/5"
                    }`}
                  >
                    {uploadMode === "camera" ? (
                      <>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                          <Camera size={16} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-brand">Take Live Photo</span>
                        <span className="text-[8px] sm:text-[10px] text-text-muted mt-0.5">Camera / Webcam</span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:text-brand group-hover:bg-brand/10 mb-1 sm:mb-2 group-hover:scale-110 transition-transform">
                          <ImageIcon size={16} />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 group-hover:text-brand">Upload Photos</span>
                        <span className="text-[8px] sm:text-[10px] text-text-muted mt-0.5">From Gallery / Device</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-text-muted pt-1">
                <span>The primary photo is displayed on fleet cards, bookings, and customer contracts.</span>
                {uploadMode === "camera" && (
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-brand hover:underline font-medium text-[11px] cursor-pointer"
                  >
                    Or open device camera file dialog →
                  </button>
                )}
              </div>
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
                    Daily Rate ($) <span className="text-red-500">*</span>
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
                    Price per Extra KM ($) <span className="text-red-500">*</span>
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
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3.5 rounded-xl flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
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
                <h3 className="text-sm font-bold">Live Vehicle Camera (التقاط صورة المركبة)</h3>
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
                      cameraInputRef.current?.click();
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
                  cameraInputRef.current?.click();
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
                <span>Capture Photo</span>
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
