"use client";

import DriverSidebar from "@/components/layout/DriverSidebar";
import TopBar from "@/components/layout/TopBar";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";

function DriverLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="min-h-screen flex bg-surface font-sans antialiased">
      <DriverSidebar />
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'ml-0 lg:ml-[78px]' : 'ml-0 lg:ml-[264px]'}`}>
        <TopBar />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DriverLayoutContent>
        {children}
      </DriverLayoutContent>
    </SidebarProvider>
  );
}
