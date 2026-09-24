"use client";

import { useState, useEffect, useRef } from "react";
import { X, Upload, Loader2, Camera, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

interface CreateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  inspectionToEdit?: any;
}

const ANGLES = ["Front View", "Rear View", "Left Side", "Right Side", "Dashboard / Mileage", "Front Interior", "Rear Interior", "Trunk / Boot"];

export default function CreateInspectionModal({
  isOpen,
  onClose,
  onSuccess,
  inspectionToEdit,
}: CreateInspectionModalProps) {
  const toast = useToast();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    type: "Before Rental",
    contractId: "",
    mileage: "",
    fuelLevel: 80,
    damages: "",
  });

  // State to hold document base64 previews for the 8 angles
  const [photos, setPhotos] = useState<string[]>(Array(8).fill(""));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch active contracts to populate the dropdown
  useEffect(() => {
    if (!isOpen) return;

    const fetchContracts = async () => {
      try {
        setLoadingContracts(true);
        const res = await fetch("/api/contracts");
        const json = await res.json();
        if (res.ok) {
          // Allow all contracts (Draft/Active/Completed) for inspections
          setContracts(json.contracts || []);
        } else {
          toast.error("Failed to load contracts");
        }
      } catch (err: any) {
        toast.error("Error loading contracts: " + err.message);
      } finally {
        setLoadingContracts(false);
      }
    };

    fetchContracts();
  }, [isOpen]);

  // Load inspection data if in edit mode
  useEffect(() => {
    if (inspectionToEdit && isOpen) {
      setFormData({
        type: inspectionToEdit.type || "Before Rental",
        contractId: inspectionToEdit.contractId?._id || "",
        mileage: inspectionToEdit.mileage?.toString() || "",
        fuelLevel: inspectionToEdit.fuelLevel || 80,
        damages: inspectionToEdit.damages || "",
      });
      
      const loadedPhotos = Array(8).fill("");
      if (inspectionToEdit.photos && Array.isArray(inspectionToEdit.photos)) {
        inspectionToEdit.photos.forEach((photoUrl: string, idx: number) => {
          if (idx < 8) loadedPhotos[idx] = photoUrl;
        });
      }
      setPhotos(loadedPhotos);
    } else if (isOpen) {
      // Reset form
      setFormData({
        type: "Before Rental",
        contractId: "",
        mileage: "",
        fuelLevel: 80,
        damages: "",
      });
      setPhotos(Array(8).fill(""));
      setError("");
    }
  }, [inspectionToEdit, isOpen]);

  // Auto-fill mileage when contract changes for "Before Rental"
  useEffect(() => {
    if (formData.type === "Before Rental" && formData.contractId) {
      const contract = contracts.find((c) => c._id === formData.contractId);
      if (contract && contract.unitMileage !== undefined) {
        setFormData((prev) => ({ ...prev, mileage: contract.unitMileage.toString() }));
      }
    }
  }, [formData.contractId, formData.type, contracts]);

  if (!isOpen) return null;

  const selectedContract = contracts.find((c) => c._id === formData.contractId);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUploadClick = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
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

  const handleFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File is too large. Max size is 15MB.");
      return;
    }
    try {
      const compressedBase64 = await compressImage(file);
      const updatedPhotos = [...photos];
      updatedPhotos[index] = compressedBase64;
      setPhotos(updatedPhotos);
    } catch (err) {
      toast.error("Failed to process image.");
    }
  };

  const handleRemovePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedPhotos = [...photos];
    updatedPhotos[index] = "";
    setPhotos(updatedPhotos);
    if (fileInputRefs.current[index]) {
      fileInputRefs.current[index]!.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractId) {
      setError("Please select a contract");
      return;
    }
    if (!formData.mileage) {
      setError("Please enter the vehicle mileage");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 1. Upload any base64 photos to Cloudinary
      const uploadedUrls: string[] = [];
      const photosToUpload = photos.filter(p => p && !p.startsWith("http"));
      
      if (photosToUpload.length > 0) {
        let uploadCount = 0;
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          if (!photo) {
            uploadedUrls.push("");
            continue;
          }
          if (photo.startsWith("http")) {
            uploadedUrls.push(photo);
            continue;
          }

          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: photo }),
          });
          if (!res.ok) throw new Error(`Failed to upload ${ANGLES[i]} photo`);
          const data = await res.json();
          uploadedUrls.push(data.url);
          uploadCount++;
        }
      } else {
        for (const photo of photos) {
          uploadedUrls.push(photo || "");
        }
      }

      // Get raw IDs from selected contract
      const { unitId, driverId } = selectedContract;

      const payload = {
        type: formData.type,
        contractId: formData.contractId,
        unitId,
        driverId,
        time: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
        mileage: Number(formData.mileage),
        fuelLevel: Number(formData.fuelLevel),
        damages: formData.damages,
        photos: uploadedUrls,
        status: "Completed",
      };

      const method = inspectionToEdit ? "PUT" : "POST";
      const url = inspectionToEdit
        ? `/api/inspections/${inspectionToEdit._id}`
        : "/api/inspections";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save inspection");
      }

      toast.success(
        inspectionToEdit
          ? "Inspection updated successfully!"
          : "Inspection logged successfully!"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save inspection");
      toast.error(err.message || "Failed to save inspection");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-border bg-white transform transition-all scale-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {inspectionToEdit ? "Edit Inspection" : "Log New Inspection"}
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Complete vehicle condition checklist
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Inspection Type */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Inspection Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm"
              >
                <option value="Before Rental">Before Rental (Pickup)</option>
                <option value="After Rental">After Rental (Return)</option>
              </select>
            </div>

            {/* Select Contract */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Active Contract
              </label>
              {loadingContracts ? (
                <div className="flex items-center gap-2 h-10 border border-border rounded-xl px-4 bg-gray-50/50">
                  <Loader2 size={16} className="animate-spin text-brand" />
                  <span className="text-xs text-text-muted">Loading contracts...</span>
                </div>
              ) : (
                <select
                  name="contractId"
                  value={formData.contractId}
                  onChange={handleInputChange}
                  disabled={!!inspectionToEdit}
                  className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm disabled:opacity-75 disabled:bg-gray-100"
                >
                  <option value="">Select a contract...</option>
                  {contracts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.id} - {c.vehicle} ({c.customer})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Auto-filled details */}
            {selectedContract && (
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 bg-blue-50/20 border border-blue-100/50 p-4 rounded-xl text-xs">
                <div>
                  <span className="text-text-muted block font-medium">Assigned Vehicle</span>
                  <span className="text-text-primary font-bold text-sm">{selectedContract.vehicle}</span>
                </div>
                <div>
                  <span className="text-text-muted block font-medium">Assigned Driver</span>
                  <span className="text-text-primary font-bold text-sm">{selectedContract.driver}</span>
                </div>
              </div>
            )}

            {/* Mileage */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Mileage (Odometer km)
              </label>
              <input
                type="number"
                name="mileage"
                placeholder="e.g. 12500"
                value={formData.mileage}
                onChange={handleInputChange}
                className="w-full text-sm border border-border rounded-xl px-4 py-2.5 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm"
              />
            </div>

            {/* Fuel Level */}
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Fuel Level
                </label>
                <span className="text-sm font-bold text-brand">{formData.fuelLevel}%</span>
              </div>
              <input
                type="range"
                name="fuelLevel"
                min="0"
                max="100"
                value={formData.fuelLevel}
                onChange={handleInputChange}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          </div>

          {/* Damages */}
          {formData.type !== "Before Rental" && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Damages Report
              </label>
              <textarea
                name="damages"
                rows={3}
                placeholder="Detail any scratches, dents, or defects..."
                value={formData.damages}
                onChange={handleInputChange}
                className="w-full text-sm border border-border rounded-xl px-4 py-3 bg-gray-50/50 text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-sm"
              />
            </div>
          )}

          {/* 6 Photos Grid */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Inspection Photos (8 Required Angles)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {ANGLES.map((angle, index) => {
                const photo = photos[index];
                return (
                  <div key={angle} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-text-secondary text-center truncate" title={angle}>
                      {angle}
                    </span>

                    {photo ? (
                      <div className="relative aspect-square rounded-xl border border-border overflow-hidden group">
                        <img
                          src={photo}
                          alt={angle}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleRemovePhoto(index, e)}
                          className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                        >
                          <X size={24} className="mb-1 text-red-400" />
                          <span className="text-xs font-medium">Remove</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePhotoUploadClick(index)}
                        className="w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-all cursor-pointer group"
                      >
                        <Camera size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-semibold">Upload</span>
                      </button>
                    )}

                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      onChange={(e) => handleFileChange(index, e)}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-border flex justify-end gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-white hover:text-gray-900 cursor-pointer transition-colors shadow-sm bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-brand rounded-xl hover:bg-brand-dark transition-colors cursor-pointer shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              "Save Inspection"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
