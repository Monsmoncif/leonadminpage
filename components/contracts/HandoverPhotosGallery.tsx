"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Camera, 
  Eye, 
  X, 
  Columns, 
  Grid3X3, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { 
  VEHICLE_ANGLES, 
  VEHICLE_ANGLE_ARABIC, 
  EXTRA_PHOTO_PREFIX 
} from "@/components/ui/VehicleInspectionPhotoCapture";

export interface HandoverPhotosGalleryProps {
  photos: string[] | Record<string, string> | undefined | null;
  returnPhotos?: string[] | Record<string, string> | null;
  title?: string;
  subtitle?: string;
  metadata?: {
    checkoutMileage?: number;
    checkoutFuelLevel?: number;
    deliveredAt?: string | Date;
    deliveredBy?: string;
    vehicleName?: string;
    contractNumber?: string | number;
  };
  defaultOpen?: boolean;
  collapsible?: boolean;
  compact?: boolean;
  allowComparison?: boolean;
  defaultMode?: "gallery" | "comparison";
  onlyComparison?: boolean;
  className?: string;
}

export default function HandoverPhotosGallery({
  photos,
  returnPhotos,
  title = "Handover Vehicle Photos (صور تسليم واستلام المركبة)",
  subtitle = "Reference photos taken when the vehicle was delivered to the client",
  metadata,
  defaultOpen = true,
  collapsible = true,
  compact = false,
  allowComparison = true,
  defaultMode = "gallery",
  onlyComparison = false,
  className = "",
}: HandoverPhotosGalleryProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewMode, setViewMode] = useState<"gallery" | "comparison">(
    onlyComparison ? "comparison" : defaultMode
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxType, setLightboxType] = useState<"handover" | "return">("handover");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxIndex]);

  // Normalize handover photos to an indexed array of URLs
  const handoverList: { angle: string; arAngle: string; url: string; index: number }[] = React.useMemo(() => {
    if (!photos) return [];
    
    if (Array.isArray(photos)) {
      return photos.map((url, idx) => {
        const isStandard = idx < VEHICLE_ANGLES.length;
        const angle = isStandard ? VEHICLE_ANGLES[idx] : `Extra Photo ${idx - VEHICLE_ANGLES.length + 1}`;
        const arAngle = isStandard ? (VEHICLE_ANGLE_ARABIC[angle] || "") : `صورة إضافية ${idx - VEHICLE_ANGLES.length + 1}`;
        return {
          angle,
          arAngle,
          url: typeof url === "string" ? url.trim() : "",
          index: idx,
        };
      });
    }

    if (typeof photos === "object") {
      const result: { angle: string; arAngle: string; url: string; index: number }[] = [];
      VEHICLE_ANGLES.forEach((angle, idx) => {
        const url = photos[angle];
        result.push({
          angle,
          arAngle: VEHICLE_ANGLE_ARABIC[angle] || "",
          url: typeof url === "string" ? url.trim() : "",
          index: idx,
        });
      });
      // Extra photos
      Object.keys(photos)
        .filter((k) => k.startsWith(EXTRA_PHOTO_PREFIX))
        .sort((a, b) => Number(a.slice(EXTRA_PHOTO_PREFIX.length)) - Number(b.slice(EXTRA_PHOTO_PREFIX.length)))
        .forEach((key, extraIdx) => {
          const url = photos[key];
          result.push({
            angle: key,
            arAngle: `صورة إضافية ${extraIdx + 1}`,
            url: typeof url === "string" ? url.trim() : "",
            index: VEHICLE_ANGLES.length + extraIdx,
          });
        });
      return result;
    }

    return [];
  }, [photos]);

  // Normalize return photos
  const returnListMap: Record<string, string> = React.useMemo(() => {
    if (!returnPhotos) return {};
    if (Array.isArray(returnPhotos)) {
      const map: Record<string, string> = {};
      returnPhotos.forEach((url, idx) => {
        if (!url) return;
        const angle = idx < VEHICLE_ANGLES.length ? VEHICLE_ANGLES[idx] : `${EXTRA_PHOTO_PREFIX}${idx - VEHICLE_ANGLES.length + 1}`;
        map[angle] = url;
      });
      return map;
    }
    return returnPhotos;
  }, [returnPhotos]);

  const validHandoverCount = handoverList.filter((item) => Boolean(item.url)).length;
  const validReturnCount = Object.values(returnListMap).filter(Boolean).length;

  // Close on Escape key
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex]);

  const currentLightboxItem = lightboxIndex !== null ? handoverList[lightboxIndex] : null;
  const currentReturnUrl = currentLightboxItem ? returnListMap[currentLightboxItem.angle] : null;

  return (
    <div className={`rounded-2xl border border-red-200/80 bg-red-50/15 shadow-xs overflow-hidden transition-all ${className}`}>
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-red-50/70 via-white to-red-50/40 border-b border-red-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-text-muted truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View switcher: Gallery vs Side-by-side */}
          {!onlyComparison && allowComparison && validReturnCount > 0 && validHandoverCount > 0 && isOpen && (
            <div className="flex bg-white p-0.5 rounded-xl border border-red-200/80 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "gallery"
                    ? "bg-brand text-white shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-red-50"
                }`}
                title="View Handover Photos Grid"
              >
                <Grid3X3 size={13} />
                <span className="hidden xs:inline">Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("comparison")}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "comparison"
                    ? "bg-brand text-white shadow-2xs font-bold"
                    : "text-gray-600 hover:text-gray-900 hover:bg-red-50"
                }`}
                title="Compare Handover vs Return Side-by-Side"
              >
                <Columns size={13} />
                <span>Compare</span>
              </button>
            </div>
          )}

          {/* Expand / Collapse Button */}
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-red-50 transition-colors cursor-pointer"
              aria-label={isOpen ? "Collapse section" : "Expand section"}
            >
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3.5 sm:p-5 space-y-4 animate-fade-in">

          {/* Empty State */}
          {validHandoverCount === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-dashed border-red-200/80 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-50 text-brand flex items-center justify-center">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">No Handover Photos Recorded</p>
                <p className="text-[11px] text-text-muted mt-0.5 max-w-sm">
                  Vehicle was handed over without uploading pre-rental inspection photos. You can still proceed with recording the return condition.
                </p>
              </div>
            </div>
          ) : !onlyComparison && viewMode === "gallery" ? (
            /* =================== GALLERY VIEW =================== */
            <div className={`grid gap-3 ${
              compact 
                ? "grid-cols-2 sm:grid-cols-4 md:grid-cols-8" 
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
            }`}>
              {handoverList.map((item, idx) => {
                const hasPhoto = Boolean(item.url);
                const returnUrl = returnListMap[item.angle];

                return (
                  <div
                    key={idx}
                    className="group relative rounded-xl border border-gray-200 bg-white shadow-2xs overflow-hidden flex flex-col hover:border-red-300 hover:shadow-xs transition-all"
                  >
                    {/* Angle Title Header */}
                    <div className="px-2.5 py-1.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-gray-900 truncate block leading-tight">
                          {item.angle}
                        </span>
                        {item.arAngle && (
                          <span className="text-[9px] text-gray-500 truncate block leading-tight">
                            {item.arAngle}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-brand bg-red-50 px-1.5 py-0.5 rounded shrink-0">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Image Area */}
                    <div className="relative aspect-video sm:aspect-4/3 bg-gray-50 flex items-center justify-center overflow-hidden">
                      {hasPhoto ? (
                        <>
                          <img
                            src={item.url}
                            alt={item.angle}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div 
                            onClick={() => {
                              setLightboxType("handover");
                              setLightboxIndex(idx);
                            }}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white cursor-pointer backdrop-blur-[1px]"
                          >
                            <Eye size={16} />
                            <span className="text-xs font-semibold">View</span>
                          </div>
                          {returnUrl && (
                            <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                              <CheckCircle2 size={10} /> Returned
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-300 p-2 text-center">
                          <Camera size={22} className="mb-1" />
                          <span className="text-[10px] font-medium text-text-muted">No photo</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* =================== COMPARISON VIEW (Side by side) =================== */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted px-1">
                <span>Comparing Handover vs Return inspection photos for each angle</span>
                <span className="text-brand font-semibold">{validHandoverCount} Handover • {validReturnCount} Return</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {handoverList.map((item, idx) => {
                  const returnUrl = returnListMap[item.angle];
                  if (!item.url && !returnUrl) return null;

                  return (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-red-50 text-brand text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-text-primary">{item.angle}</span>
                          {item.arAngle && (
                            <span className="text-[10px] text-text-muted">({item.arAngle})</span>
                          )}
                        </div>
                        {returnUrl ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Both Recorded
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Awaiting Return Photo
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Handover column */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-brand bg-red-50 px-1.5 py-0.5 rounded">
                              Handover (التسليم)
                            </span>
                          </div>
                          <div className="relative aspect-video rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group">
                            {item.url ? (
                              <>
                                <img src={item.url} alt={`Handover ${item.angle}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxType("handover");
                                    setLightboxIndex(idx);
                                  }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Eye size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-text-muted">
                                No image
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Return column */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-red-900 bg-red-50 px-1.5 py-0.5 rounded">
                              Return (الاسترجاع)
                            </span>
                          </div>
                          <div className="relative aspect-video rounded-lg border border-red-200 overflow-hidden bg-gray-50 group">
                            {returnUrl ? (
                              <>
                                <img src={returnUrl} alt={`Return ${item.angle}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxType("return");
                                    setLightboxIndex(idx);
                                  }}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Eye size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-text-muted">
                                No image
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simple Fullscreen Image Modal */}
      {mounted && lightboxIndex !== null && currentLightboxItem && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button top-right */}
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute -top-3.5 -right-3.5 sm:-top-4 sm:-right-4 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer shadow-xl z-20 border border-white/20 hover:scale-105 active:scale-95"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Image */}
            <img
              src={lightboxType === "handover" ? currentLightboxItem.url : (currentReturnUrl || currentLightboxItem.url)}
              alt={currentLightboxItem.angle}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
