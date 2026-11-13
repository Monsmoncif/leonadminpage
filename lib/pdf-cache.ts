import { clearPdfJobs } from "@/lib/pdf-generator";

export const pdfCache = new Map<
  string,
  { buffer: Buffer; updatedAt?: string; clientUpdatedAt?: string; unitUpdatedAt?: string; timestamp: number }
>();

export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearPdfCache(contractId?: string) {
  if (contractId) {
    pdfCache.delete(contractId);
    clearPdfJobs(contractId);
    console.log(`[PdfCache] Cleared PDF cache and jobs for contract ${contractId}`);
  } else {
    pdfCache.clear();
    clearPdfJobs();
    console.log("[PdfCache] Cleared all PDF cache and jobs");
  }
}

export const consentPdfCache = new Map<string, { buffer: Buffer; updatedAt?: string; timestamp: number }>();

export function clearConsentPdfCache(contractId?: string) {
  if (contractId) {
    consentPdfCache.delete(contractId);
  } else {
    consentPdfCache.clear();
  }
}

