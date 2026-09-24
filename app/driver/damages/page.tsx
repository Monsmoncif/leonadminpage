"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DriverDamagesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/driver");
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <Loader2 size={32} className="animate-spin text-brand" />
      <p className="text-xs text-text-muted">Redirecting to Driver Dashboard...</p>
    </div>
  );
}
