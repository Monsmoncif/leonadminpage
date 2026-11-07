"use client";

import { SessionProvider } from "next-auth/react";
import ToastProvider from "@/components/providers/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
