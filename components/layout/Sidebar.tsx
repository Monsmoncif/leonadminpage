"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarDays,
  Users,
  UserCog,
  ClipboardCheck,
  AlertTriangle,
  PieChart,
  Bell,
  Shield,
  Settings,
  LogOut,
  ClipboardList,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { ExecutiveCarIcon } from "@/components/icons/ExecutiveCarIcon";

/* ── Navigation structure ───────────────────────────────────────── */

const sections = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", href: "/", icon: LayoutDashboard },
      { name: "Contracts", href: "/bookings", icon: CalendarCheck },
      { name: "Units", href: "/units", icon: ExecutiveCarIcon },
      { name: "Calendar", href: "/calendar", icon: CalendarDays },
      { name: "Clients", href: "/clients", icon: Users },
      { name: "Drivers", href: "/drivers", icon: UserCog },
    ],
  },
  {
    label: "Operations",
    items: [
      { name: "Inspections", href: "/inspections", icon: ClipboardCheck },
      { name: "Damages", href: "/damages", icon: AlertTriangle },
      { name: "Reports", href: "/reports", icon: PieChart },
    ],
  },
  {
    label: "System",
    items: [
      { name: "Activity Logs", href: "/logs", icon: ClipboardList },
      { name: "Notifications", href: "/notifications", icon: Bell },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

/* ── Component ──────────────────────────────────────────────────── */

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, setCollapsed } = useSidebar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  /* Fetch notifications */
  useEffect(() => {
    const fetchNotifs = () => {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          const unread = (data || []).filter((n: any) => !n.read).length;
          setUnreadCount(unread);
        })
        .catch(console.error);
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 5000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <>
      {/* Mobile & Tablet Backdrop */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[40] lg:hidden transition-opacity"
          onClick={() => setCollapsed(true)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-white border-r border-border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[78px]" : "translate-x-0 w-[264px]"
        }`}
      >
      {/* ── Brand header ────────────────────────────────────── */}
      <div className="relative flex items-center px-5 h-[72px] border-b border-border/50 shrink-0 justify-between">
        <div
          className={`flex flex-col overflow-hidden transition-all duration-300 ${
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <span className="text-[15px] font-bold text-text-primary tracking-tight whitespace-nowrap">
            Lean Car
          </span>
          <span className="text-[11px] text-text-muted font-medium whitespace-nowrap">
            Fleet Management
          </span>
        </div>

        {/* Mobile/Tablet Close Button */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="lg:hidden p-1.5 text-text-muted hover:text-text-primary hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>

        {/* Collapse toggle (Desktop only) */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-border shadow-sm items-center justify-center text-text-muted hover:text-brand hover:border-brand/30 hover:shadow-md transition-all duration-200 z-10 cursor-pointer`}
        >
          {collapsed ? (
            <ChevronsRight size={13} strokeWidth={2.5} />
          ) : (
            <ChevronsLeft size={13} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar py-4 px-3">
        {sections.map((section, sIdx) => (
          <div key={section.label} className={sIdx > 0 ? "mt-5" : ""}>
            {/* Section label */}
            <div
              className={`flex items-center h-6 mb-1.5 transition-all duration-300 ${
                collapsed ? "justify-center" : "px-3"
              }`}
            >
              {collapsed ? (
                <div className="w-5 h-[1px] bg-border/80 rounded-full" />
              ) : (
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-muted/70 select-none">
                  {section.label}
                </span>
              )}
            </div>

            {/* Nav items */}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const isNotif = item.name === "Notifications";
                return (
                  <li key={item.name} className="relative">
                    <Link
                      href={item.href}
                      onMouseEnter={() => setHoveredItem(item.name)}
                      onMouseLeave={() => setHoveredItem(null)}
                      onClick={() => {
                        if (window.innerWidth < 1024) {
                          setCollapsed(true);
                        }
                      }}
                      className={`
                        relative flex items-center gap-3 rounded-xl
                        text-[13.5px] font-medium
                        transition-all duration-200 ease-out
                        ${collapsed ? "justify-center px-0 py-2.5 mx-auto w-11 h-11" : "px-3 py-2.5"}
                        ${
                          active
                            ? "bg-brand/[0.08] text-brand shadow-[inset_0_0_0_1px_rgba(229,57,53,0.08)]"
                            : "text-text-secondary hover:bg-surface hover:text-text-primary"
                        }
                        group
                      `}
                    >
                      {/* Active indicator bar */}
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand rounded-r-full shadow-[2px_0_8px_rgba(229,57,53,0.3)]" />
                      )}

                      {/* Icon */}
                      <span
                        className={`shrink-0 transition-all duration-200 ${
                          active
                            ? "text-brand drop-shadow-[0_0_6px_rgba(229,57,53,0.25)]"
                            : "text-text-muted group-hover:text-text-secondary"
                        }`}
                      >
                        <item.icon size={item.name === "Units" ? 15 : 20} strokeWidth={active ? 2.2 : 1.8} />
                      </span>

                      {/* Label */}
                      {!collapsed && (
                        <span className="truncate whitespace-nowrap">{item.name}</span>
                      )}

                      {/* Notification badge */}
                      {isNotif && unreadCount > 0 && (
                        <span
                          className={`
                            flex items-center justify-center bg-brand text-white text-[10px] font-bold rounded-full shadow-sm shadow-brand/30
                            ${collapsed ? "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1" : "ml-auto min-w-[20px] h-5 px-1.5"}
                          `}
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Link>

                    {/* Tooltip for collapsed mode */}
                    {collapsed && hoveredItem === item.name && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-[60] pointer-events-none">
                        <div className="relative bg-[#1A1D1F] text-white text-xs font-medium py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap">
                          {item.name}
                          {isNotif && unreadCount > 0 && (
                            <span className="ml-2 bg-brand rounded-full px-1.5 py-0.5 text-[10px]">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Logout ──────────────────────────────── */}
      <div className="shrink-0 border-t border-border/50 p-3">
        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`
            flex items-center gap-3 rounded-xl text-[13px] font-medium
            text-text-secondary hover:bg-red-50/80 hover:text-red-600
            transition-all duration-200 w-full group
            ${collapsed ? "justify-center p-2.5 mx-auto w-11 h-11" : "px-3 py-2.5"}
          `}
        >
          <LogOut
            size={19}
            strokeWidth={1.8}
            className="shrink-0 text-text-muted group-hover:text-red-500 transition-colors"
          />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
