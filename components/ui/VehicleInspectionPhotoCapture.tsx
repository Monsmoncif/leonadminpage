"use client";

import React, { useState } from "react";
import { Camera, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/providers/ToastProvider";

export const VEHICLE_ANGLES = [
  "Front View",
  "Rear View",
  "Left Side",
  "Right Side",
  "Dashboard / Mileage",
  "Front Interior",
  "Rear Interior",
  "Trunk / Boot"
];

// Arabic labels for angles to provide bilingual clarity
export const VEHICLE_ANGLE_ARABIC: Record<string, string> = {
  "Front View": "الواجهة الأمامية",
  "Rear View": "الواجهة الخلفية",
  "Left Side": "الجانب الأيسر",
  "Right Side": "الجانب الأيمن",
  "Dashboard / Mileage": "لوحة القيادة والعداد",
  "Front Interior": "المقصورة الأمامية",
  "Rear Interior": "المقصورة الخلفية",
  "Trunk / Boot": "صندوق الأمتعة"
};

interface VehicleInspectionPhotoCaptureProps {
  photos: Record<string, string>;
  onChange: (photos: Record<string, string>) => void;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
}

// Fast client-side image compression to prevent 5-10MB photo timeouts
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = (event.target?.result as string) || "";
      if (!result) {
        resolve("");
        return;
      }
      try {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width || 800;
            let height = img.height || 600;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width = Math.round((width * MAX_HEIGHT) / height);
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
              resolve(compressedBase64);
              return;
            }
            resolve(result);
          } catch {
            resolve(result);
          }
        };
        img.onerror = () => resolve(result);
        img.src = result;
      } catch {
        resolve(result);
      }
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
};

export default function VehicleInspectionPhotoCapture({
  photos = {},
  onChange,
  title = "Vehicle Inspection Photos (صور فحص السيارة)",
  subtitle = "Capture or upload 8 standard angles to document the vehicle condition.",
  badgeLabel
}: VehicleInspectionPhotoCaptureProps) {
  const toast = useToast();
  const [uploadMode, setUploadMode] = useState<"camera" | "gallery">("camera");
  const [uploadingAngle, setUploadingAngle] = useState<string | null>(null);

  // Local state ensures instant, reliable rendering independent of async parent re-renders
  const [localPhotos, setLocalPhotos] = React.useState<Record<string, string>>(photos || {});

  React.useEffect(() => {
    if (photos && typeof photos === "object") {
      setLocalPhotos((prev) => ({ ...prev, ...photos }));
    }
  }, [photos]);

  const mergedPhotos = { ...(photos || {}), ...localPhotos };
  const capturedCount = Object.values(mergedPhotos).filter(Boolean).length;

  const handlePhotoUpload = async (angle: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAngle(angle);

      // 1. Fast client-side compression (<50ms, falls back to raw base64 on any error)
      const compressedBase64 = await compressImage(file);
      if (!compressedBase64) {
        toast.error("Could not read photo file.");
        return;
      }

      // 2. Immediately update local state so card displays image with 0 delay
      setLocalPhotos((prev) => {
        const next = { ...prev, [angle]: compressedBase64 };
        if (onChange) onChange(next);
        return next;
      });
      toast.success(`Photo captured: ${angle}`);

      // 3. Upload lightweight compressed image to cloud in background
      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: compressedBase64, folder: "wheelzie_inspection" }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setLocalPhotos((prev) => {
              if (prev[angle]) {
                const next = { ...prev, [angle]: data.url };
                if (onChange) onChange(next);
                return next;
              }
              return prev;
            });
          }
        }
      } catch (uploadErr) {
        console.warn("Cloud sync failed, local image retained:", uploadErr);
      }
    } catch (err: any) {
      console.error("Image processing error:", err);
      toast.error("Failed to process photo.");
    } finally {
      setUploadingAngle(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemovePhoto = (angle: string) => {
    setLocalPhotos((prev) => {
      const next = { ...prev };
      delete next[angle];
      if (onChange) onChange(next);
      return next;
    });
    toast.info(`Photo removed for ${angle}`);
  };

  return (
    <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4 shadow-2xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5">
            <Camera size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-text-primary">{title}</h3>
              {badgeLabel && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand">
                  {badgeLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Action Bar: Mode Switcher & Progress Pill */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUploadMode("camera")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                uploadMode === "camera"
                  ? "bg-white text-brand shadow-xs font-bold"
                  : "text-text-muted hover:text-text-primary"
              }`}
              title="Camera Direct Mode"
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
              title="Gallery Mode"
            >
              <ImageIcon size={14} className={uploadMode === "gallery" ? "text-brand" : "text-text-muted"} />
              <span>Gallery</span>
            </button>
          </div>

          {/* Captured Progress Counter */}
          <span
            className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 border ${
              capturedCount === 8
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : capturedCount > 0
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-gray-100 text-text-muted border-gray-200"
            }`}
          >
            {capturedCount}/8 angles
          </span>
        </div>
      </div>

      {/* 8 Angles Grid matching Add New Vehicle Modal UI/UX */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {VEHICLE_ANGLES.map((angle) => {
          const photoUrl = localPhotos[angle] || photos[angle];
          const isUploading = uploadingAngle === angle;

          return (
            <div key={angle} className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-text-secondary text-center truncate" title={angle}>
                {angle}
              </span>

              {photoUrl ? (
                <div className="relative aspect-square rounded-xl border border-border overflow-hidden group shadow-2xs">
                  <img src={photoUrl} alt={angle} className="w-full h-full object-cover" />
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white z-5 pointer-events-none">
                      <Loader2 size={20} className="animate-spin mb-1 text-white" />
                      <span className="text-[10px] font-medium">Saving...</span>
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleRemovePhoto(angle)}
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer z-10"
                  >
                    <X size={24} className="mb-1 text-red-400" />
                    <span className="text-xs font-medium">Remove</span>
                  </button>
                </div>
              ) : isUploading ? (
                <div className="w-full aspect-square rounded-xl border-2 border-brand/40 bg-brand/[0.03] flex flex-col justify-center items-center gap-2 text-center">
                  <Loader2 size={24} className="animate-spin text-brand" />
                  <span className="text-[10px] font-semibold text-brand">Uploading...</span>
                </div>
              ) : (
                <label className="w-full aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center text-text-muted hover:text-brand hover:border-brand hover:bg-brand/5 transition-all cursor-pointer group">
                  <input
                    key={`${angle}-${uploadMode}`}
                    type="file"
                    accept="image/*"
                    capture={uploadMode === "camera" ? "environment" : undefined}
                    className="hidden"
                    onClick={(e) => { e.currentTarget.value = ""; }}
                    onChange={(e) => handlePhotoUpload(angle, e)}
                  />
                  {uploadMode === "camera" ? (
                    <Camera size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                  ) : (
                    <ImageIcon size={24} className="mb-2 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] font-semibold">
                    {uploadMode === "camera" ? "Camera" : "Upload"}
                  </span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
