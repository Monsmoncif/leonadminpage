"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useSession } from "next-auth/react";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen flex bg-surface font-sans antialiased">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'ml-0 lg:ml-[78px]' : 'ml-0 lg:ml-[264px]'}`}>
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isDriverPath = pathname === "/driver" || pathname.startsWith("/driver/");
  const isPrintPage = pathname.startsWith("/bookings/") && pathname.endsWith("/print");

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" && !isAuthPage && !isPrintPage) {
      router.replace("/login");
    } else if (status === "authenticated") {
      const role = (session?.user as any)?.role;

      if (isAuthPage) {
         router.replace(role === "driver" ? "/driver" : "/");
      } else if (isPrintPage) {
         // Allow both roles to access the print page without redirection
      } else if (role === "admin" && isDriverPath) {
         router.replace("/");
      } else if (role === "driver" && !isDriverPath) {
         router.replace("/driver");
      }
    }
  }, [pathname, isAuthPage, isPrintPage, router, status, session, isDriverPath]);

  if (status === "loading" || (status === "unauthenticated" && !isAuthPage && !isPrintPage)) {
    // Show a clean loading state to prevent flash of content before redirect
    return <div className="min-h-screen bg-surface flex items-center justify-center" />;
  }

  if (status === "authenticated") {
    const role = (session?.user as any)?.role;
    // Show a loading state while the useEffect is triggering the redirect
    if (role === "driver" && !isDriverPath && !isPrintPage && !isAuthPage) {
      return <div className="min-h-screen bg-surface flex items-center justify-center" />;
    }
    if (role === "admin" && isDriverPath && !isPrintPage && !isAuthPage) {
      return <div className="min-h-screen bg-surface flex items-center justify-center" />;
    }
  }

  if (isAuthPage) {
    return <main className="min-h-screen bg-gray-50 flex flex-col">{children}</main>;
  }

  if (isPrintPage) {
    return <>{children}</>;
  }

  if (isDriverPath) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AdminLayoutContent>
        {children}
      </AdminLayoutContent>
    </SidebarProvider>
  );
}
