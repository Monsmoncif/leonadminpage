"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Camera, AlertCircle, AlertTriangle, ImagePlus, Trash2 } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";
import { useSession } from "next-auth/react";

interface CreateDamageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  damageToEdit?: any;
}

export default function CreateDamageModal({
  isOpen,
  onClose,
  onSuccess,
  damageToEdit,
}: CreateDamageModalProps) {
  const toast = useToast();
  const { data: session } = useSession();
  const isDriverRole = (session?.user as any)?.role === "driver";
  const currentDriverId = (session?.user as any)?.id;
  const [units, setUnits] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    unitId: "",
    contractId: "",
    description: "",
    cost: "",
    status: "Pending",
  });

  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [unitsRes, contractsRes] = await Promise.all([
          fetch("/api/units"),
          fetch("/api/contracts"),
        ]);
        
        if (unitsRes.ok) {
          const uJson = await unitsRes.json();
          setUnits(uJson.units || []);
        }
        
        if (contractsRes.ok) {
          const cJson = await contractsRes.json();
          setContracts(cJson.contracts || []);
        }
      } catch (err: any) {
        toast.error("Error loading data: " + err.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (damageToEdit && isOpen) {
      setFormData({
        unitId: damageToEdit.unitId?._id || "",
        contractId: damageToEdit.contractId?._id || "",
        description: damageToEdit.description || "",
        cost: damageToEdit.cost?.toString() || "",
        status: damageToEdit.status || "Pending",
      });
      
      if (damageToEdit.photos && Array.isArray(damageToEdit.photos)) {
        setPhotos(damageToEdit.photos);
      } else {
        setPhotos([]);
      }
    } else if (isOpen) {
      setFormData({
        unitId: "",
        contractId: "",
        description: "",
        cost: "",
        status: "Pending",
      });
      setPhotos([]);
      setError("");
    }
  }, [damageToEdit, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    toast.success("Processing photos...");
    const processedFiles: string[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large. Max size is 15MB.`);
        continue;
      }
      try {
        const compressedBase64 = await compressImage(file);
        processedFiles.push(compressedBase64);
      } catch (err) {
        toast.error(`Failed to process image ${file.name}.`);
      }
    }

    setPhotos((prev) => [...prev, ...processedFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.unitId) {
      setError("Please select a vehicle");
      return;
    }
    if (!formData.description) {
      setError("Please provide a damage description");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const uploadedUrls: string[] = [];
      const photosToUpload = photos.filter(p => p && !p.startsWith("http"));
      const existingUrls = photos.filter(p => p && p.startsWith("http"));
      
      if (photosToUpload.length > 0) {
        for (const photo of photosToUpload) {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: photo }),
          });
          if (!res.ok) throw new Error(`Failed to upload photo`);
          const data = await res.json();
          uploadedUrls.push(data.url);
        }
      }

      const allPhotos = [...existingUrls, ...uploadedUrls];

      const payload = {
        unitId: formData.unitId,
        contractId: formData.contractId || undefined,
        description: formData.description,
        cost: Number(formData.cost) || 0,
        status: formData.status,
        photos: allPhotos,
        reportedByRole: (session?.user as any)?.role || "unknown",
        reportedByName: (session?.user as any)?.name || "Unknown User",
      };

      const method = damageToEdit ? "PUT" : "POST";
      const url = damageToEdit ? `/api/damages/${damageToEdit._id}` : "/api/damages";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to save damage");
      }

      toast.success(
        damageToEdit ? "Damage record updated successfully!" : "Damage logged successfully!"
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save damage");
      toast.error(err.message || "Failed to save damage");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                {damageToEdit ? "Edit Damage Record" : "Report Vehicle Damage"}
              </h2>
              <p className="text-xs text-text-secondary">
                {damageToEdit
                  ? "Update this damage record."
                  : "Add details, cost estimates, and photos."}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="create-damage-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  {isDriverRole ? "Related Contract *" : "Related Contract (Optional)"}
                </label>
              {loadingData ? (
                <div className="flex items-center gap-2 h-[42px] border border-border rounded-xl px-4 bg-white">
                  <Loader2 size={16} className="animate-spin text-brand" />
                </div>
              ) : (
                <select
                  name="contractId"
                  value={formData.contractId}
                  required={isDriverRole}
                  onChange={(e) => {
                    const selectedContractId = e.target.value;
                    const contract = contracts.find(c => c._id === selectedContractId);
                    setFormData(prev => ({
                      ...prev,
                      contractId: selectedContractId,
                      ...(contract && contract.unitId ? { unitId: contract.unitId } : {})
                    }));
                  }}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                >
                  <option value="">{isDriverRole ? "Select a contract..." : "Select a contract (Optional)"}</option>
                  {contracts
                    .filter(c => {
                      if (isDriverRole && c.driverId !== currentDriverId) return false;
                      if (c._id === formData.contractId) return true;
                      if (c.status === "Completed" || c.status === "Canceled") return false;
                      return true;
                    })
                    .map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.id} - {c.customer}
                    </option>
                  ))}
                </select>
              )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Vehicle *
                </label>
                {loadingData ? (
                  <div className="flex items-center gap-2 h-[42px] border border-border rounded-xl px-4 bg-white">
                  <Loader2 size={16} className="animate-spin text-brand" />
                </div>
              ) : (
                <select
                  name="unitId"
                  value={formData.unitId}
                  onChange={handleInputChange}
                  required
                  disabled={isDriverRole}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">Select a vehicle...</option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.brand} {u.model} ({u.plateNumber})
                    </option>
                  ))}
                </select>
              )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Damage Description *
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Describe the damage in detail..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand resize-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Estimated Repair Cost ($)
                </label>
              <input
                type="number"
                name="cost"
                min="0"
                placeholder="e.g. 250"
                value={formData.cost}
                onChange={handleInputChange}
                className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
              />
            </div>

            {!isDriverRole && (
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand bg-white"
                >
                  <option value="Pending">Pending Repair</option>
                  <option value="Repaired">Repaired / Resolved</option>
                </select>
              </div>
            )}
          </div>

            <hr className="border-gray-100 sm:col-span-2 mt-4 mb-2" />

            <div className="sm:col-span-2 space-y-3">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Damage Photos
              </label>
              <div className="flex flex-wrap gap-4">
                {photos.map((src, idx) => {
                  return (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-xl border border-gray-200 overflow-hidden group"
                  >
                    <img
                      src={src}
                      alt="Damage"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleRemovePhoto(idx, e)}
                      className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
                >
                  <ImagePlus size={24} className="mb-1" />
                  <span className="text-[10px] font-semibold">Upload</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
              </div>
          </div>

          {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl flex items-start gap-2 sm:col-span-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-gray-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-text-secondary border border-border rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-damage-form"
            disabled={isSubmitting}
            className="px-6 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving...
              </>
            ) : damageToEdit ? (
              "Save Changes"
            ) : (
              "Save Damage"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
