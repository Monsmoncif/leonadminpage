"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Settings, Bell, LogOut, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useSidebar } from "@/components/layout/SidebarContext";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/bookings": "Bookings",
  "/units": "Units",
  "/calendar": "Calendar",
  "/clients": "Clients",
  "/drivers": "Drivers",
  "/tracking": "Tracking",
  "/messages": "Messages",
};

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [realAvatar, setRealAvatar] = useState("");
  const [realName, setRealName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = (session?.user as any)?.id;
      if (userId) {
        try {
          const res = await fetch(`/api/users/${userId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.avatarUrl) setRealAvatar(data.avatarUrl);
            if (data.name) setRealName(data.name);
          }
        } catch (error) {
          console.error("Failed to fetch user profile", error);
        }
      }
    };
    
    const fetchNotifications = async () => {
      try {
        if (pathname.startsWith("/driver")) {
          // Driver notifications
          const driverId = (session?.user as any)?.id;
          if (!driverId) return;
          const res = await fetch("/api/contracts");
          if (res.ok) {
            const data = await res.json();
            
            const myContracts = (data.contracts || []).filter((c: any) => 
              c.driverId?._id === driverId || c.driverId === driverId
            );

            let count = 0;
            const today = new Date();
            today.setHours(0,0,0,0);

            myContracts.forEach((contract: any) => {
              if (contract.status === "Active") {
                const endDate = new Date(contract.endDate);
                endDate.setHours(0,0,0,0);
                if (endDate.getTime() <= today.getTime()) count++;
              }
            });
            setUnreadCount(count);
          }
        } else {
          // Admin notifications
          const res = await fetch("/api/notifications");
          if (res.ok) {
            const data = await res.json();
            const unread = (data || []).filter((n: any) => !n.read).length;
            setUnreadCount(unread);
          }
        }
      } catch (error) {
        console.error("Failed to fetch notifications");
      }
    };
    
    fetchUser();
    if (session?.user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [session, pathname]);

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/units/") ? "Unit Details" : "Overview");

  const displayUserName = realName || session?.user?.name || "User";
  const userInitials = displayUserName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const displayImage = realAvatar || session?.user?.image;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-border/50 h-[72px] px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* ── Left: Page Title ────────────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile & Tablet Sidebar Toggle */}
        <button 
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="lg:hidden p-2 -ml-2 text-text-secondary hover:bg-surface hover:text-text-primary rounded-xl transition-colors cursor-pointer"
          id="mobile-sidebar-toggle"
          aria-label="Toggle navigation menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <h1 className="text-lg sm:text-xl font-bold text-text-primary capitalize tracking-tight">
          {title}
        </h1>
      </div>

      {/* ── Right: Actions, Profile ─────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Notifications */}
        <button 
          onClick={() => router.push(pathname.startsWith("/driver") ? "/driver/notifications" : "/notifications")}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface hover:text-text-primary transition-all duration-200"
        >
          <Bell size={19} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-brand rounded-full border-2 border-white shadow-sm ring-2 ring-brand/20 animate-pulse-dot" />
          )}
        </button>
        
        {/* Profile Dropdown */}
        <div className="relative ml-1" ref={dropdownRef}>
          <button 
            className={`flex items-center gap-2.5 p-1 pr-3 rounded-full border transition-all duration-200 ${
              dropdownOpen 
                ? "bg-surface border-border shadow-inner" 
                : "bg-white border-transparent hover:bg-surface hover:border-border/60"
            }`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand/80 to-brand-dark overflow-hidden flex items-center justify-center text-white font-semibold text-xs shadow-sm">
              {displayImage ? (
                <img src={displayImage} alt={displayUserName} className="w-full h-full object-cover" />
              ) : (
                userInitials
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-semibold text-text-primary leading-tight truncate max-w-[120px]">
                {displayUserName}
              </p>
            </div>
            <ChevronDown 
              size={14} 
              className={`text-text-muted transition-transform duration-200 hidden sm:block ${dropdownOpen ? "rotate-180" : ""}`} 
            />
          </button>
          
          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-border/80 rounded-2xl shadow-xl shadow-black/[0.04] py-1.5 z-50 animate-fade-in-up origin-top-right">
              {/* Profile Header (Mobile fallback or extra context) */}
              <div className="px-4 py-3 border-b border-border/50 mb-1">
                <p className="text-[13px] font-bold text-text-primary truncate">{displayUserName}</p>
                <p className="text-[11px] font-medium text-text-muted mt-0.5 truncate">
                  {pathname.startsWith("/driver") ? "Driver Account" : "Administrator"}
                </p>
              </div>

              <div className="px-1.5 space-y-0.5">
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    router.push(pathname.startsWith("/driver") ? "/driver/profile" : "/settings");
                  }}
                  className="w-full px-3 py-2 text-left text-[13px] font-medium text-text-secondary hover:bg-surface hover:text-text-primary rounded-xl flex items-center gap-2.5 transition-colors"
                >
                  <Settings size={16} strokeWidth={2} className="text-text-muted" />
                  Account Settings
                </button>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2.5 transition-colors group"
                >
                  <LogOut size={16} strokeWidth={2} className="text-red-500 group-hover:text-red-600" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
