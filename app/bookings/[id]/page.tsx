"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ContractDetailsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/bookings");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="text-brand animate-spin" />
        <p className="text-sm text-text-muted font-medium">جاري التحويل إلى قائمة الحجوزات...</p>
      </div>
    </div>
  );
}
