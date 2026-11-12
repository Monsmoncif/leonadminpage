"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import ToastProvider from "@/components/providers/ToastProvider";

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
