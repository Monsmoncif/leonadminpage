"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Eye,
  Filter,
  ChevronDown,
  Clock,
  X,
} from "lucide-react";
import Link from "next/link";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type BookingEvent = {
  id: string;
  contractId: string;
  displayId: string;
  displayNum: string;
  contractNumber?: string | number;
  time: string;
  formattedHour: string;
  date: Date;
  car: string;
  carImage: string | null;
  client: string;
  driver: string;
  type: "pickup" | "return";
  status: "Pending" | "Active" | "Completed";
  isPreContract: boolean;
  isHandedOver: boolean;
  isReturned: boolean;
  isCompleted: boolean;
  isOverdue?: boolean;
  statusLabel: string;
  typeBadge: string;
  badgeClass: string;
  contractPill: string;
  tooltipText: string;
  chipClass: string;
  dotClass: string;
  color: string;
  dateStr: string;
  notes: string;
  location: string;
  rawContract?: any;
};

const getInitials = (name: string) => {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  if (!name) return "bg-gray-100 text-gray-700";
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-purple-100 text-purple-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatEventHour = (timeStr?: string, defaultFallback: string = "08:00 AM") => {
  if (!timeStr || !timeStr.trim() || timeStr.toLowerCase().includes("pending")) {
    return defaultFallback;
  }
  const clean = timeStr.trim();
  if (/^\d{1,2}:\d{2}\s*(am|pm)$/i.test(clean)) {
    return clean.toUpperCase();
  }
  const parts = clean.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].substring(0, 2);
    if (!isNaN(h)) {
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }
  }
  return clean;
};

export default function CalendarPage() {
  const [filter, setFilter] = useState<"all" | "pickup" | "return" | "precontract" | "contract">("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Month calculation
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startDayRaw = startOfMonth.getDay();
  const startDayIdx = startDayRaw === 0 ? 6 : startDayRaw - 1;

  const startDateCalc = new Date(startOfMonth);
  startDateCalc.setDate(startDateCalc.getDate() - startDayIdx);

  const monthDates = Array.from({ length: 42 }).map((_, i) => {
    const d = new Date(startDateCalc);
    d.setDate(d.getDate() + i);
    return d;
  });

  const monthEnd = monthDates[41];
  monthEnd.setHours(23, 59, 59, 999);

  const monthYearStr = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/contracts", { cache: 'no-store' });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        const mapped: BookingEvent[] = [];

        (data.contracts || []).forEach((c: any) => {
          if (!c.rawStartDate || !c.rawEndDate) return;
          if (c.status === "Cancelled") return;

          const nowStartOfDay = new Date();
          nowStartOfDay.setHours(0, 0, 0, 0);

          const isReturned = Boolean(
            c.deliveryStatus === "Returned" ||
            c.status === "Completed" ||
            Boolean(c.returnedAt)
          );

          const isHandedOver = Boolean(
            c.deliveryStatus !== "Pending" &&
            (
              isReturned ||
              c.deliveryStatus === "Delivered" ||
              Boolean(c.deliveredAt || c.handoverCompletedAt) ||
              (c.status === "Active" && c.deliveryStatus !== "Draft")
            )
          );

          const isPreContract = !isHandedOver;

          let effectiveStatus: "Pending" | "Active" | "Completed" = "Pending";
          if (isReturned) {
            effectiveStatus = "Completed";
          } else if (isHandedOver) {
            effectiveStatus = "Active";
          } else {
            effectiveStatus = "Pending";
          }

          const contractNum = c.contractNumber ? String(c.contractNumber) : (c.id || "Pending");
          const displayNum = contractNum.startsWith("#") ? contractNum : `#${contractNum}`;

          // 1. Handover / Pickup Start Date & Hour
          const startDate = startOfDay(new Date(c.rawStartDate));
          const startHour = formatEventHour(c.checkoutTime, "08:00 AM");

          if (startDate >= monthDates[0] && startDate <= monthEnd) {
            const pickupDriver = (c.deliveryDriver && c.deliveryDriver !== "None" && c.deliveryDriver.trim() !== "")
              ? c.deliveryDriver
              : (c.driver && c.driver !== "None" && c.driver.trim() !== "" ? c.driver : "");
            const pickupNotes = (c.notes && c.notes.trim() && c.notes !== "No notes provided.")
              ? c.notes.trim() : "";
            const pickupLocation = (c.pickupLocation && c.pickupLocation.trim())
              ? c.pickupLocation.trim() : "";

            let chipClass = "";
            let dotClass = "";
            let badgeClass = "";
            let typeBadge = "Start";
            let statusLabel = "";
            let contractPill = "";

            if (isPreContract) {
              chipClass = "bg-amber-50/95 hover:bg-amber-100/90 text-amber-950 border-amber-200/90";
              dotClass = "bg-amber-500 animate-pulse";
              badgeClass = "bg-amber-100 text-amber-800 border-amber-300/80";
              typeBadge = "Start";
              statusLabel = "Pre-Contract";
              contractPill = `Pre-${displayNum}`;
            } else if (isReturned) {
              chipClass = "bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-blue-200/80";
              dotClass = "bg-blue-500";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Handed Over (Past)";
              contractPill = `CON ${displayNum}`;
            } else {
              chipClass = "bg-blue-50/95 hover:bg-blue-100 text-blue-950 border-blue-200/90";
              dotClass = "bg-blue-600";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Handover (Active)";
              contractPill = `CON ${displayNum}`;
            }

            mapped.push({
              id: `${c.id || c._id}-start`,
              contractId: c._id,
              displayId: c.id || "Booking",
              displayNum,
              contractNumber: c.contractNumber,
              time: startHour,
              formattedHour: startHour,
              date: startDate,
              car: c.vehicle || "Vehicle",
              carImage: c.vehicleImage || null,
              client: c.customer || "Client",
              driver: pickupDriver,
              type: "pickup",
              status: effectiveStatus,
              isPreContract,
              isHandedOver,
              isReturned,
              isCompleted: isHandedOver,
              isOverdue: false,
              statusLabel,
              typeBadge,
              badgeClass,
              contractPill,
              tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • Start / Handover at ${startHour} • Client: ${c.customer} (${c.vehicle})`,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              notes: pickupNotes,
              location: pickupLocation,
              rawContract: c,
            });
          }

          // 2. Expected Return / End Date & Hour
          const endDate = (isReturned && c.returnedAt)
            ? startOfDay(new Date(c.returnedAt))
            : startOfDay(new Date(c.rawEndDate));

          let endHour = "";
          if (isReturned && c.returnedAt) {
            try {
              const d = new Date(c.returnedAt);
              if (!isNaN(d.getTime())) {
                endHour = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
              }
            } catch {}
          }
          if (!endHour) {
            endHour = formatEventHour(c.checkinTime || c.checkoutTime, "08:00 PM");
          }

          const isOverdue = !isReturned && isHandedOver && c.rawEndDate && startOfDay(new Date(c.rawEndDate)) < nowStartOfDay;

          if (endDate >= monthDates[0] && endDate <= monthEnd) {
            const returnDriver = (c.returnDriver && c.returnDriver !== "None" && c.returnDriver.trim() !== "")
              ? c.returnDriver
              : (c.returnDriverId?.name && c.returnDriverId.name !== "None" ? c.returnDriverId.name : "");
            const returnNotes = (c.returnNotes && c.returnNotes.trim() && c.returnNotes !== "No notes provided.")
              ? c.returnNotes.trim() : "";
            const returnLocation = (c.dropoffLocation && c.dropoffLocation.trim())
              ? c.dropoffLocation.trim() : "";

            let chipClass = "";
            let dotClass = "";
            let badgeClass = "";
            let typeBadge = "Exp. End";
            let statusLabel = "";
            let contractPill = "";

            if (isReturned) {
              chipClass = "bg-emerald-50/95 hover:bg-emerald-100 text-emerald-950 border-emerald-200/90";
              dotClass = "bg-emerald-500";
              badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300/80";
              typeBadge = "Returned";
              statusLabel = "Returned";
              contractPill = `CON ${displayNum}`;
            } else if (isOverdue) {
              chipClass = "bg-rose-50/95 hover:bg-rose-100 text-rose-950 border-rose-300";
              dotClass = "bg-rose-500 animate-ping";
              badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
              typeBadge = "Overdue";
              statusLabel = "Overdue Return";
              contractPill = `CON ${displayNum}`;
            } else if (isPreContract) {
              chipClass = "bg-orange-50/95 hover:bg-orange-100 text-orange-950 border-orange-200/90";
              dotClass = "bg-orange-500";
              badgeClass = "bg-orange-100 text-orange-800 border-orange-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Pre-Contract";
              contractPill = `Pre-${displayNum}`;
            } else {
              chipClass = "bg-purple-50/95 hover:bg-purple-100 text-purple-950 border-purple-200/90";
              dotClass = "bg-purple-500";
              badgeClass = "bg-purple-100 text-purple-800 border-purple-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Expected Return";
              contractPill = `CON ${displayNum}`;
            }

            mapped.push({
              id: `${c.id || c._id}-end`,
              contractId: c._id,
              displayId: c.id || "Booking",
              displayNum,
              contractNumber: c.contractNumber,
              time: endHour,
              formattedHour: endHour,
              date: endDate,
              car: c.vehicle || "Vehicle",
              carImage: c.vehicleImage || null,
              client: c.customer || "Client",
              driver: returnDriver,
              type: "return",
              status: effectiveStatus,
              isPreContract,
              isHandedOver,
              isReturned,
              isCompleted: isReturned,
              isOverdue,
              statusLabel,
              typeBadge,
              badgeClass,
              contractPill,
              tooltipText: `${isPreContract ? "Pre-Contract" : "Contract"} ${displayNum} • ${isReturned ? "Returned at" : "Expected End at"} ${endHour} • Client: ${c.customer} (${c.vehicle})`,
              chipClass,
              dotClass,
              color: getAvatarColor(c.customer),
              dateStr: endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              notes: returnNotes,
              location: returnLocation,
              rawContract: c,
            });
          }
        });
        setBookings(mapped);
      } catch (error) {
        console.error("Failed to fetch contracts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, [currentDate]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      let matchesType = true;
      if (filter === "pickup") matchesType = b.type === "pickup";
      else if (filter === "return") matchesType = b.type === "return";
      else if (filter === "precontract") matchesType = b.isPreContract;
      else if (filter === "contract") matchesType = !b.isPreContract;

      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        (b.client && b.client.toLowerCase().includes(query)) ||
        (b.car && b.car.toLowerCase().includes(query)) ||
        (b.driver && b.driver.toLowerCase().includes(query)) ||
        (b.displayId && b.displayId.toLowerCase().includes(query)) ||
        (b.contractNumber && String(b.contractNumber).toLowerCase().includes(query)) ||
        (b.contractPill && b.contractPill.toLowerCase().includes(query));
      return matchesType && matchesSearch;
    });
  }, [bookings, filter, searchQuery]);

  // Selected Day Bookings for Mobile Drawer/Inspector
  const selectedDayBookings = useMemo(() => {
    if (!selectedDay) return [];
    return filteredBookings.filter((b) => b.date.toDateString() === selectedDay.toDateString());
  }, [filteredBookings, selectedDay]);

  const prevMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  };
  const nextMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  };
  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  const filterOptions = [
    { key: "all", label: "All", dot: "bg-gray-400" },
    { key: "pickup", label: "Pickups (Start)", dot: "bg-blue-500" },
    { key: "return", label: "Returns (End)", dot: "bg-purple-500" },
    { key: "precontract", label: "Pre-Contracts", dot: "bg-amber-500" },
    { key: "contract", label: "Contracts", dot: "bg-emerald-500" },
  ] as const;

  const currentFilterLabel = filterOptions.find((f) => f.key === filter)?.label || "All";

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
            <div className="h-4 w-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-[700px]">
          <div className="p-4 border-b border-gray-100 flex justify-between">
            <div className="h-10 w-64 bg-gray-200 rounded-xl"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ===== Dashboard-Style Welcome Header (Old Design) ===== */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 relative overflow-hidden shadow-xs">
        {/* Decorative gradient blobs matching dashboard */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-brand/5 via-orange-500/3 to-transparent rounded-full -translate-y-32 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-16 -translate-x-8 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-0.5 sm:mb-1">
              Fleet Calendar
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              {monthYearStr} • Track pickups, returns, and fleet handover schedules
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/bookings/new"
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus size={16} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Full-Width Calendar (ALWAYS GRID ON BOTH MOBILE & DESKTOP!) ===== */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        
        {/* ===== Desktop Toolbar (Row 1: Controls for Tablet & Desktop) ===== */}
        <div className="hidden md:flex px-4 py-3 items-center justify-between gap-3 border-b border-border bg-gray-50/60">
          {/* Left: Navigation, Month Title & Events Count Badge */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-border shadow-2xs">
              <button 
                onClick={prevMonth} 
                title="Previous Month"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronLeft size={15} />
              </button>
              <button 
                onClick={goToday} 
                title="Jump to Today"
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                Today
              </button>
              <button 
                onClick={nextMonth} 
                title="Next Month"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
              >
                <ChevronRight size={15} />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-text-primary flex items-center gap-1.5 whitespace-nowrap tracking-tight">
                <CalendarIcon size={16} className="text-brand shrink-0" />
                <span>{monthYearStr}</span>
              </h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 tabular-nums whitespace-nowrap shadow-2xs">
                {filteredBookings.length} {filteredBookings.length === 1 ? "event" : "events"}
              </span>
            </div>
          </div>

          {/* Center: Segmented Filter Tabs */}
          <div className="flex items-center p-0.5 bg-white rounded-xl border border-border shadow-2xs shrink-0 max-w-full overflow-x-auto no-scrollbar">
            {filterOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none ${
                  filter === key
                    ? "bg-brand text-white shadow-xs"
                    : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Right: Search Input */}
          <div className="relative w-44 lg:w-48 shrink-0">
            <input
              type="text"
              placeholder="Search..."
              className="w-full text-xs border border-border rounded-xl pl-7 pr-2.5 py-1.5 bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        {/* ===== Mobile Toolbar (Inspired by Bookings Page Toolbar for Mobile) ===== */}
        <div className="flex md:hidden p-3 flex-col gap-2.5 border-b border-border bg-gray-50/70">
          {/* Mobile Search Bar */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search contract, client, car..."
              className="w-full text-xs border border-border rounded-xl pl-8 pr-8 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Controls: Month Nav + Status Filter Dropdown */}
          <div className="flex items-center justify-between gap-2">
            {/* Month Nav Buttons & Title */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-border shadow-2xs">
                <button
                  onClick={prevMonth}
                  title="Previous Month"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  onClick={goToday}
                  title="Today"
                  className="px-2 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  title="Next Month"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              <span className="text-xs font-bold text-text-primary truncate">
                {monthYearStr}
              </span>
            </div>

            {/* Filter Dropdown (Matches Bookings Filter Style) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1.5 font-medium bg-white shadow-xs"
              >
                <Filter size={13} className="text-text-muted" />
                <span className="truncate max-w-[85px]">{currentFilterLabel}</span>
                <ChevronDown size={12} className="text-text-muted ml-0.5" />
              </button>
              {isMobileFilterOpen && (
                <div className="absolute top-full mt-1.5 right-0 w-44 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {filterOptions.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setFilter(item.key);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        filter === item.key ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${item.dot} shrink-0`} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Row 2: Status Legend & Hint ===== */}
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-3 border-b border-border bg-white text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2.5 sm:gap-4 text-[10px] sm:text-[11px] font-semibold text-text-secondary shrink-0 select-none">
            <span className="text-text-muted font-bold uppercase tracking-wider text-[9px] sm:text-[10px] mr-0.5">
              Legend:
            </span>
            <span className="flex items-center gap-1.5" title="Pre-contract awaiting handover (Start)">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Pre-CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Pre-contract scheduled end date (End)">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span>Pre-CON (End)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract vehicle handed over (Start)">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              <span>CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract expected return date">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span>CON (Exp. End)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1.5" title="Car returned back to fleet">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Returned</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted hidden md:flex items-center gap-1 font-medium shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />
            Click any event to open booking &amp; handover details
          </span>
        </div>

        {/* ===== CALENDAR GRID (ALWAYS GRID!) ===== */}
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <div className="min-w-[560px] sm:min-w-0">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
              {days.map((day) => (
                <div key={day} className="py-2 sm:py-2.5 text-[9.5px] sm:text-[10px] md:text-xs font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid Cells */}
            <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: 'calc(100vh - 290px)' }}>
              {monthDates.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = selectedDay && date.toDateString() === selectedDay.toDateString();

                const dayBookings = filteredBookings.filter(
                  (b) => b.date.toDateString() === date.toDateString()
                );

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDay(date)}
                    className={`p-1 sm:p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-colors cursor-pointer ${
                      !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                    } ${isToday ? 'bg-brand/[0.03]' : ''} ${
                      isSelected ? 'ring-1 sm:ring-2 ring-brand/50 ring-inset' : ''
                    }`}
                  >
                    {/* Date Number Badge */}
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] sm:text-xs font-black w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg ${
                        isToday 
                          ? 'bg-brand text-white shadow-xs' 
                          : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                      }`}>
                        {date.getDate()}
                      </span>

                      {dayBookings.length > 0 && (
                        <span className="text-[9px] font-bold px-1 rounded-full bg-gray-100 text-text-secondary md:hidden tabular-nums">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Events Chips */}
                    <div className="space-y-0.5 sm:space-y-1 flex flex-col items-start overflow-hidden w-full">
                      {dayBookings.slice(0, 4).map((booking, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContractForDetails(booking.rawContract);
                          }}
                          title={`${booking.tooltipText} • Click to view full details`}
                          className={`w-full max-w-full text-left px-1 sm:px-2 py-0.5 sm:py-1 rounded sm:rounded-lg transition-all border shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-1 cursor-pointer select-none group ${booking.chipClass}`}
                        >
                          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                            <span className={`w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full shrink-0 ${booking.dotClass}`} />
                            <span className="font-sans font-bold text-[9.5px] sm:text-[11px] tracking-tight tabular-nums truncate text-text-primary">
                              {booking.displayNum}
                            </span>
                          </div>
                          <span className="text-[8.5px] sm:text-[10px] font-bold tracking-tight tabular-nums text-text-secondary shrink-0 opacity-80">
                            {booking.formattedHour}
                          </span>
                        </button>
                      ))}
                      {dayBookings.length > 4 && (
                        <span className="text-[8.5px] sm:text-[9px] font-bold text-brand pl-0.5 sm:pl-1">
                          +{dayBookings.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== Mobile Day Inspector (Appears when day is clicked on Mobile) ===== */}
        {selectedDay && (
          <div className="md:hidden p-3 border-t border-border bg-gray-50/75 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <CalendarIcon size={13} className="text-brand" />
                <span>
                  {selectedDay.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-border text-text-secondary tabular-nums">
                {selectedDayBookings.length} {selectedDayBookings.length === 1 ? "schedule" : "schedules"}
              </span>
            </div>

            {selectedDayBookings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {selectedDayBookings.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedContractForDetails(b.rawContract)}
                    className={`w-full text-left p-2 rounded-xl border flex items-center justify-between gap-2 shadow-2xs hover:shadow-xs transition-all cursor-pointer ${b.chipClass}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full ${b.dotClass} shrink-0`} />
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-text-primary block truncate">
                          {b.displayNum} • {b.car}
                        </span>
                        <span className="text-[10px] text-text-muted block truncate">
                          {b.client} {b.driver ? `• Driver: ${b.driver}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold block text-text-primary">
                        {b.formattedHour}
                      </span>
                      <span className="text-[9px] font-semibold text-text-secondary">
                        {b.typeBadge}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-text-muted italic">
                No bookings scheduled for this day.
              </span>
            )}
          </div>
        )}

        {/* ===== Footer ===== */}
        <div className="px-3.5 sm:px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-gray-50/50">
          <span className="text-[11px] sm:text-xs">
            <span className="font-bold text-text-primary">{filteredBookings.length}</span> events · <span className="font-bold text-text-primary">{monthYearStr}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="px-2 sm:px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              ← Prev
            </button>
            <button onClick={goToday} className="px-2 sm:px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs">
              {currentDate.toLocaleDateString("en-US", { month: "short" })}
            </button>
            <button onClick={nextMonth} className="px-2 sm:px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Contract Details Modal */}
      {selectedContractForDetails && (
        <ContractDetailsModal
          isOpen={Boolean(selectedContractForDetails)}
          onClose={() => setSelectedContractForDetails(null)}
          contract={selectedContractForDetails}
        />
      )}
    </div>
  );
}
