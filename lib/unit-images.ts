export interface MergeUnitImagesParams {
  handoverPhotos?: unknown[] | null;
  returnPhotos?: unknown[] | null;
  fallbackUnitImages?: unknown[] | null;
}

const cleanUrl = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function hasAnyValidPhotos(arr?: unknown[] | null): boolean {
  return Array.isArray(arr) && arr.some((u) => cleanUrl(u).length > 0);
}

/**
 * Merges car photos from the latest Handover (inspectionPhotos) and latest Return (returnPhotos).
 * Iterates across vehicle angle slots (0=Front View .. 4=Dashboard/Mileage .. Trunk + Extras)
 * so partial returns (e.g. only taking a Dashboard/Mileage photo) merge cleanly without wiping out
 * full handover photos or pushing the odometer shot into slot 0 (the fleet thumbnail).
 */
export function mergeHandoverAndReturnImages({
  handoverPhotos = [],
  returnPhotos = [],
  fallbackUnitImages = [],
}: MergeUnitImagesParams): string[] {
  const handoverArr = Array.isArray(handoverPhotos) ? handoverPhotos : [];
  const returnArr = Array.isArray(returnPhotos) ? returnPhotos : [];
  const fallbackArr = Array.isArray(fallbackUnitImages)
    ? fallbackUnitImages.map(cleanUrl).filter(Boolean)
    : [];

  const merged: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (url: unknown) => {
    const cleaned = cleanUrl(url);
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    merged.push(cleaned);
  };

  const maxSlots = Math.max(handoverArr.length, returnArr.length);

  for (let i = 0; i < maxSlots; i++) {
    if (i < handoverArr.length) pushUnique(handoverArr[i]);
    if (i < returnArr.length) pushUnique(returnArr[i]);
  }

  // If no handover photos exist (e.g. return-only odometer shot), preserve existing
  // vehicle exterior/showroom photos before return-only photos.
  if (!hasAnyValidPhotos(handoverArr) && fallbackArr.length > 0) {
    const withFallback: string[] = [];
    const fallbackSeen = new Set<string>();
    for (const u of fallbackArr) {
      if (!fallbackSeen.has(u)) {
        fallbackSeen.add(u);
        withFallback.push(u);
      }
    }
    for (const u of merged) {
      if (!fallbackSeen.has(u)) {
        fallbackSeen.add(u);
        withFallback.push(u);
      }
    }
    return withFallback;
  }

  return merged;
}
