"use client";

import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Eye, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Columns, 
  Grid3X3, 
  Gauge, 
  Fuel, 
  Calendar, 
  UserCheck, 
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
  className = "",
}: HandoverPhotosGalleryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [viewMode, setViewMode] = useState<"gallery" | "comparison">("gallery");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxType, setLightboxType] = useState<"handover" | "return">("handover");
  const [isZoomed, setIsZoomed] = useState(false);

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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
        setIsZoomed(false);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, handoverList, lightboxType]);

  const handlePrev = () => {
    if (lightboxIndex === null || handoverList.length === 0) return;
    setIsZoomed(false);
    setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : handoverList.length - 1));
  };

  const handleNext = () => {
    if (lightboxIndex === null || handoverList.length === 0) return;
    setIsZoomed(false);
    setLightboxIndex((prev) => (prev! < handoverList.length - 1 ? prev! + 1 : 0));
  };

  const currentLightboxItem = lightboxIndex !== null ? handoverList[lightboxIndex] : null;
  const currentReturnUrl = currentLightboxItem ? returnListMap[currentLightboxItem.angle] : null;

  return (
    <div className={`rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-xs overflow-hidden transition-all ${className}`}>
      {/* Top Header */}
      <div className="p-3.5 sm:p-4 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/60 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Camera size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-blue-950 truncate">{title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                validHandoverCount > 0 
                  ? "bg-blue-100 text-blue-800 border-blue-300/80" 
                  : "bg-gray-100 text-text-muted border-gray-200"
              }`}>
                {validHandoverCount}/8 angles {validHandoverCount > 8 ? `+${validHandoverCount - 8}` : ""}
              </span>
            </div>
            {subtitle && (
              <p className="text-xs text-blue-900/70 truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* View switcher: Gallery vs Side-by-side */}
          {allowComparison && validReturnCount > 0 && validHandoverCount > 0 && isOpen && (
            <div className="flex bg-white/90 p-0.5 rounded-xl border border-blue-200 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "gallery"
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "text-blue-900/70 hover:text-blue-950 hover:bg-blue-50"
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
                    ? "bg-blue-600 text-white shadow-2xs font-bold"
                    : "text-blue-900/70 hover:text-blue-950 hover:bg-blue-50"
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
              className="p-1.5 rounded-lg text-blue-900/70 hover:text-blue-950 hover:bg-blue-100/70 transition-colors cursor-pointer"
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
          {/* Handover Details Strip (Mileage, Fuel, Time) */}
          {metadata && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-white border border-blue-100/90 text-xs">
              {metadata.checkoutMileage !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                    <Gauge size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-muted block leading-none">Handover Odo</span>
                    <strong className="text-xs font-bold text-text-primary truncate block mt-0.5">
                      {metadata.checkoutMileage.toLocaleString()} km
                    </strong>
                  </div>
                </div>
              )}

              {metadata.checkoutFuelLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                    <Fuel size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-muted block leading-none">Handover Fuel</span>
                    <strong className="text-xs font-bold text-text-primary truncate block mt-0.5">
                      {metadata.checkoutFuelLevel}%
                    </strong>
                  </div>
                </div>
              )}

              {metadata.deliveredAt && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Calendar size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-muted block leading-none">Handover Time</span>
                    <strong className="text-xs font-bold text-text-primary truncate block mt-0.5">
                      {typeof metadata.deliveredAt === "string" ? metadata.deliveredAt : new Date(metadata.deliveredAt).toLocaleDateString()}
                    </strong>
                  </div>
                </div>
              )}

              {metadata.deliveredBy && (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
                    <UserCheck size={14} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-text-muted block leading-none">Handover By</span>
                    <strong className="text-xs font-bold text-text-primary truncate block mt-0.5">
                      {metadata.deliveredBy}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {validHandoverCount === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-dashed border-blue-200/90 text-center flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                <Camera size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-950">No Handover Photos Recorded</p>
                <p className="text-[11px] text-text-muted mt-0.5 max-w-sm">
                  Vehicle was handed over without uploading pre-rental inspection photos. You can still proceed with recording the return condition.
                </p>
              </div>
            </div>
          ) : viewMode === "gallery" ? (
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
                    className="group relative rounded-xl border border-blue-100 bg-white shadow-2xs overflow-hidden flex flex-col hover:border-blue-300 hover:shadow-xs transition-all"
                  >
                    {/* Angle Title Header */}
                    <div className="px-2.5 py-1.5 bg-blue-50/50 border-b border-blue-100/60 flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-blue-950 truncate block leading-tight">
                          {item.angle}
                        </span>
                        {item.arAngle && (
                          <span className="text-[9px] text-blue-900/60 truncate block leading-tight">
                            {item.arAngle}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded shrink-0">
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
                            className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white cursor-pointer backdrop-blur-[1px]"
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
                <span className="text-blue-700 font-semibold">{validHandoverCount} Handover • {validReturnCount} Return</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {handoverList.map((item, idx) => {
                  const returnUrl = returnListMap[item.angle];
                  if (!item.url && !returnUrl) return null;

                  return (
                    <div key={idx} className="bg-white rounded-xl border border-blue-200/80 p-3 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0">
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
                            <span className="text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded">
                              Handover (التسليم)
                            </span>
                          </div>
                          <div className="relative aspect-video rounded-lg border border-blue-200 overflow-hidden bg-gray-50 group">
                            {item.url ? (
                              <>
                                <img src={item.url} alt={`Handover ${item.angle}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLightboxType("handover");
                                    setLightboxIndex(idx);
                                  }}
                                  className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                                >
                                  <Eye size={16} />
                                </button>
                              </>
                            ) : (
                              <div className="h-full flex items-center justify-center text-[10px] text-text-muted">
                                Not captured
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
                              <div className="h-full flex items-center justify-center text-[10px] text-text-muted italic">
                                Pending capture
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

      {/* Fullscreen Lightbox Modal */}
      {lightboxIndex !== null && currentLightboxItem && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-5 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => {
            setLightboxIndex(null);
            setIsZoomed(false);
          }}
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col items-center bg-gray-950/80 rounded-2xl border border-white/10 p-3 sm:p-4 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 text-white">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  lightboxType === "handover" ? "bg-blue-600 text-white" : "bg-red-600 text-white"
                }`}>
                  {lightboxType === "handover" ? "Handover Photo (التسليم)" : "Return Photo (الاسترجاع)"}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold truncate">
                    {currentLightboxItem.angle}
                  </h4>
                  {currentLightboxItem.arAngle && (
                    <p className="text-[11px] text-white/60 truncate">{currentLightboxItem.arAngle}</p>
                  )}
                </div>
                <span className="text-xs text-white/50 shrink-0">
                  {lightboxIndex + 1} of {handoverList.length}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Switch between handover and return photo if both exist */}
                {currentReturnUrl && currentLightboxItem.url && (
                  <button
                    type="button"
                    onClick={() => setLightboxType(lightboxType === "handover" ? "return" : "handover")}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Switch to {lightboxType === "handover" ? "Return" : "Handover"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title={isZoomed ? "Zoom Out" : "Zoom In"}
                >
                  {isZoomed ? <ZoomOut size={16} /> : <ZoomIn size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(null);
                    setIsZoomed(false);
                  }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-red-600 text-white transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Image View */}
            <div className="relative w-full flex-1 flex items-center justify-center my-3 overflow-hidden min-h-[300px] sm:min-h-[460px]">
              {/* Prev Button */}
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                aria-label="Previous angle"
              >
                <ChevronLeft size={22} />
              </button>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                aria-label="Next angle"
              >
                <ChevronRight size={22} />
              </button>

              <div className="max-h-[75vh] max-w-full overflow-auto flex items-center justify-center">
                <img
                  src={lightboxType === "handover" ? currentLightboxItem.url : (currentReturnUrl || currentLightboxItem.url)}
                  alt={currentLightboxItem.angle}
                  className={`rounded-xl object-contain shadow-2xl transition-all duration-200 ${
                    isZoomed ? "scale-150 cursor-grab" : "max-h-[72vh] max-w-full"
                  }`}
                />
              </div>
            </div>

            {/* Bottom Angle Thumbnails Navigator */}
            <div className="w-full flex items-center justify-center gap-1.5 overflow-x-auto py-2 border-t border-white/10 custom-scrollbar">
              {handoverList.map((item, idx) => {
                const isSelected = idx === lightboxIndex;
                const photoSrc = lightboxType === "handover" ? item.url : (returnListMap[item.angle] || item.url);
                if (!photoSrc) return null;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setLightboxIndex(idx);
                      setIsZoomed(false);
                    }}
                    className={`relative w-14 h-10 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      isSelected ? "border-blue-500 scale-105 shadow-md" : "border-white/20 opacity-60 hover:opacity-100"
                    }`}
                    title={item.angle}
                  >
                    <img src={photoSrc} alt={item.angle} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-bold px-1 rounded-tl">
                      #{idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
