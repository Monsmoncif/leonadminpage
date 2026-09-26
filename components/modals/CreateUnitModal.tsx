"use client";

import { useState, useRef, useEffect } from "react";
import { 
  X, 
  Loader2, 
  AlertCircle, 
  ImagePlus, 
  Trash2, 
  Camera, 
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
  
  // Single vehicle picture
  const [photo, setPhoto] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
        
        let loadedPhoto = "";
        if (unitToEdit.images && Array.isArray(unitToEdit.images)) {
          loadedPhoto = unitToEdit.images.find((img: string) => img && typeof img === "string" && img.trim() !== "") || "";
        } else if (typeof unitToEdit.image === "string") {
          loadedPhoto = unitToEdit.image;
        }
        setPhoto(loadedPhoto);
      } else {
        resetForm();
      }
      setError(null);
    }
  }, [isOpen, unitToEdit]);

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
    setPhoto("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    toast.success("Processing image...");
    const compressedBase64 = await compressImage(file);
    setPhoto(compressedBase64);

    if (e.target) {
      e.target.value = "";
    }
  };

  const removeImage = () => {
    setPhoto("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // 1. Upload photo if it is newly selected base64 data
      let finalPhotoUrl = photo;
      if (photo && photo.startsWith("data:image")) {
        toast.success("Uploading photo...");
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: photo }),
        });
        if (!res.ok) throw new Error("Image upload failed");
        const data = await res.json();
        finalPhotoUrl = data.url;
      }

      const allImages = finalPhotoUrl && (finalPhotoUrl.startsWith("http") || finalPhotoUrl.startsWith("/"))
        ? [finalPhotoUrl]
        : [];

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
          images: allImages
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Widescreen Modal (max-w-5xl matching CreateClientModal) */}
      <div className="bg-card w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <ExecutiveCarIcon className="text-brand" size={22} />
              {unitToEdit ? "Edit Vehicle Details" : "Add New Vehicle"}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {unitToEdit
                ? "Update vehicle specifications, rental rates, and profile picture."
                : "Register a new vehicle with technical specifications and pricing to your fleet."}
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
          <form id="create-unit-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Hidden Input for Photo Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />

            {/* SECTION 1: VEHICLE PHOTO (Matching CreateClientModal Documents Card) */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 tracking-wide uppercase flex items-center gap-2">
                    <ImagePlus size={16} className="text-brand" />
                    Vehicle Photo
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Upload a high-quality photo representing this car in the fleet catalog
                  </p>
                </div>
                {photo ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={11} /> Photo Uploaded
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                    Optional
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {photo ? (
                  <div className="relative w-48 h-32 rounded-xl border border-gray-200 overflow-hidden group shadow-xs bg-gray-50 flex items-center justify-center">
                    <img
                      src={photo}
                      alt="Vehicle preview"
                      className="w-full h-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-xs cursor-pointer"
                        title="Change Photo"
                      >
                        <Camera size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
                        title="Remove Photo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-48 h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-brand hover:border-brand hover:bg-brand/5 transition-all cursor-pointer group"
                  >
                    <ImagePlus size={26} className="mb-1 text-gray-400 group-hover:text-brand transition-colors" />
                    <span className="text-xs font-semibold text-gray-600 group-hover:text-brand transition-colors">
                      Upload Car Photo
                    </span>
                    <span className="text-[10px] text-gray-400 mt-0.5">
                      JPG, PNG or WebP
                    </span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500">
                This image will be displayed on vehicle cards, contracts, delivery confirmations, and booking pages.
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
        <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-between shrink-0">
          <div>
            {photo && (
              <span className="text-xs text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Vehicle photo attached
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-unit-form"
              disabled={submitting}
              className="px-6 py-2.5 bg-brand text-white rounded-xl hover:bg-brand-dark transition-colors font-bold text-sm flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving...
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
    </div>
  );
}
