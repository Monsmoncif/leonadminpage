"use client";

import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FileText,
  Search,
  Plus,
  Check,
  Eye,
  Clock,
  MapPin,
  Truck,
  LayoutGrid,
  List,
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
  // Check if 12h format e.g. "08:00 AM" or "8:00 PM"
  if (/^\d{1,2}:\d{2}\s*(am|pm)$/i.test(clean)) {
    return clean.toUpperCase();
  }
  // Check 24h format e.g. "14:30"
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
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);



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
        const mapped: any[] = [];

        (data.contracts || []).forEach((c: any) => {
          if (!c.rawStartDate || !c.rawEndDate) return;
          if (c.status === "Cancelled") return;

          const nowStartOfDay = new Date();
          nowStartOfDay.setHours(0, 0, 0, 0);

          // Return completed: true when car has been returned back to agency
          const isReturned = Boolean(
            c.deliveryStatus === "Returned" ||
            c.status === "Completed" ||
            Boolean(c.returnedAt)
          );

          // Handover completed: true when car has been delivered/handed over to client
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
              statusLabel = "Pre-Contract • Awaiting Handover";
              contractPill = `Pre-${displayNum}`;
            } else if (isReturned) {
              chipClass = "bg-blue-50/90 hover:bg-blue-100 text-blue-950 border-blue-200/80";
              dotClass = "bg-blue-500";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Contract Handed Over (Past)";
              contractPill = `CON ${displayNum}`;
            } else {
              chipClass = "bg-blue-50/95 hover:bg-blue-100 text-blue-950 border-blue-200/90";
              dotClass = "bg-blue-600";
              badgeClass = "bg-blue-100 text-blue-800 border-blue-300/80";
              typeBadge = "Start";
              statusLabel = "Contract Handover (Active Rental)";
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
              statusLabel = "Car Back (Returned)";
              contractPill = `CON ${displayNum}`;
            } else if (isOverdue) {
              chipClass = "bg-rose-50/95 hover:bg-rose-100 text-rose-950 border-rose-300";
              dotClass = "bg-rose-500 animate-ping";
              badgeClass = "bg-rose-100 text-rose-800 border-rose-300";
              typeBadge = "Overdue";
              statusLabel = "Overdue Return (متأخر)";
              contractPill = `CON ${displayNum}`;
            } else if (isPreContract) {
              chipClass = "bg-orange-50/95 hover:bg-orange-100 text-orange-950 border-orange-200/90";
              dotClass = "bg-orange-500";
              badgeClass = "bg-orange-100 text-orange-800 border-orange-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Pre-Contract • Scheduled Return";
              contractPill = `Pre-${displayNum}`;
            } else {
              chipClass = "bg-purple-50/95 hover:bg-purple-100 text-purple-950 border-purple-200/90";
              dotClass = "bg-purple-500";
              badgeClass = "bg-purple-100 text-purple-800 border-purple-300/80";
              typeBadge = "Exp. End";
              statusLabel = "Active Contract • Expected Return";
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

  const filteredBookings = bookings.filter((b) => {
    let matchesType = true;
    if (filter === "pickup") matchesType = b.type === "pickup";
    else if (filter === "return") matchesType = b.type === "return";
    else if (filter === "precontract") matchesType = b.isPreContract;
    else if (filter === "contract") matchesType = !b.isPreContract;

    const query = searchQuery.toLowerCase();
    const matchesSearch = !query ||
      (b.client && b.client.toLowerCase().includes(query)) ||
      (b.car && b.car.toLowerCase().includes(query)) ||
      (b.driver && b.driver.toLowerCase().includes(query)) ||
      (b.displayId && b.displayId.toLowerCase().includes(query)) ||
      (b.contractNumber && String(b.contractNumber).toLowerCase().includes(query)) ||
      (b.contractPill && b.contractPill.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  const prevMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  };
  const nextMonth = () => {
    setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  };
  const goToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const selectedDateBookings = filteredBookings.filter(
    (b) => b.date.toDateString() === selectedDate.toDateString()
  );

  // Group filtered bookings chronologically by date for Agenda view
  const agendaGrouped = filteredBookings
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .reduce((acc: { date: Date; dateStr: string; bookings: BookingEvent[] }[], booking) => {
      const existing = acc.find(g => g.date.toDateString() === booking.date.toDateString());
      if (existing) {
        existing.bookings.push(booking);
      } else {
        acc.push({
          date: booking.date,
          dateStr: booking.dateStr,
          bookings: [booking],
        });
      }
      return acc;
    }, []);

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
      {/* ===== Dashboard-Style Welcome Header ===== */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-6 relative overflow-hidden shadow-xs">
        {/* Decorative gradient blobs matching dashboard */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-brand/5 via-orange-500/3 to-transparent rounded-full -translate-y-32 translate-x-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-500/5 to-transparent rounded-full translate-y-16 -translate-x-8 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 relative">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-text-primary mb-0.5 sm:mb-1">
              Fleet Calendar
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary">
              {monthYearStr} • Track pickups, returns, and fleet handover schedules
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/bookings/new"
              className="flex items-center gap-1.5 sm:gap-2 bg-brand hover:bg-brand-dark text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ===== Calendar Card Container ===== */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* ===== Toolbar (Multi-Tier Responsive Layout) ===== */}
        
        {/* Tier 1: Month Nav, Month Title & View Switcher */}
        <div className="p-3 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 border-b border-border bg-gray-50/60">
          {/* Navigation & Month */}
          <div className="flex items-center gap-2 shrink-0">
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
                className="px-2 py-1 text-xs font-bold rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-100 active:scale-95 transition-all cursor-pointer"
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
            
            <div className="flex items-center gap-1.5 min-w-0">
              <h2 className="text-xs sm:text-base font-extrabold text-text-primary flex items-center gap-1 truncate tracking-tight">
                <CalendarIcon size={15} className="text-brand shrink-0" />
                <span className="truncate">{monthYearStr}</span>
              </h2>
              <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 tabular-nums shrink-0 shadow-2xs">
                {filteredBookings.length}
              </span>
            </div>
          </div>

          {/* View Switcher: Month Grid vs Agenda List */}
          <div className="flex items-center p-0.5 bg-white rounded-xl border border-border shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                viewMode === "month"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
              }`}
              title="Month Grid View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                viewMode === "agenda"
                  ? "bg-brand text-white shadow-xs"
                  : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
              }`}
              title="Agenda List View"
            >
              <List size={13} />
              <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>
        </div>

        {/* Tier 2: Filter Tabs & Search */}
        <div className="px-3 sm:px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 border-b border-border bg-white">
          {/* Filter Pills (Horizontally scrollable with no scrollbar on mobile) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {([
              { key: "all", label: "All" },
              { key: "pickup", label: "Pickups (Start)" },
              { key: "return", label: "Returns (End)" },
              { key: "precontract", label: "Pre-Contracts" },
              { key: "contract", label: "Contracts" },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap select-none shrink-0 ${
                  filter === key
                    ? "bg-brand text-white shadow-xs"
                    : "bg-gray-50 text-text-secondary hover:text-text-primary hover:bg-gray-100 border border-border/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-48 shrink-0">
            <input
              type="text"
              placeholder="Search car, client, #..."
              className="w-full text-xs border border-border rounded-xl pl-7 pr-2.5 py-1.5 bg-gray-50/70 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand focus:bg-white transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        {/* Tier 3: Legend Bar (Scrollable on mobile) */}
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between gap-3 border-b border-border bg-gray-50/40 text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3 text-[10px] sm:text-[11px] font-semibold text-text-secondary shrink-0 whitespace-nowrap">
            <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">
              Legend:
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Pre-CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              <span>CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span>CON (Exp. End)</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Returned</span>
            </span>
            <span className="w-px h-3 bg-border shrink-0" />
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Overdue</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted hidden lg:flex items-center gap-1 font-medium shrink-0 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />
            Tap any booking to view full details
          </span>
        </div>

        {/* ===== VIEW 1: MONTH CALENDAR GRID ===== */}
        {viewMode === "month" && (
          <>
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
              {days.map((day) => (
                <div key={day} className="py-2 text-[10px] sm:text-xs font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 1)}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 grid-rows-6 bg-card md:min-h-[calc(100vh-270px)]">
              {monthDates.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();
                const isSelected = date.toDateString() === selectedDate.toDateString();

                const dayBookings = filteredBookings.filter(
                  (b) => b.date.toDateString() === date.toDateString()
                );

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`p-1 sm:p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-colors cursor-pointer md:cursor-default min-h-[52px] sm:min-h-[64px] md:min-h-0 ${
                      !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                    } ${isToday ? 'bg-brand/[0.04]' : ''} ${
                      isSelected ? 'ring-2 ring-brand ring-inset md:ring-0 bg-brand/[0.06] md:bg-transparent' : ''
                    }`}
                  >
                    {/* Date Number */}
                    <div className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-lg mx-auto md:mx-0 ${
                      isToday 
                        ? 'bg-brand text-white shadow-xs' 
                        : isSelected
                        ? 'border border-brand text-brand font-black bg-brand/10 md:border-0 md:bg-transparent md:text-text-primary'
                        : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                    }`}>
                      {date.getDate()}
                    </div>

                    {/* Mobile Dots Indicator (Visible on mobile, hidden on md+) */}
                    <div className="flex md:hidden items-center justify-center gap-0.5 mt-0.5 flex-wrap max-w-full">
                      {dayBookings.slice(0, 3).map((b, dotIdx) => (
                        <span
                          key={dotIdx}
                          className={`w-1.5 h-1.5 rounded-full ${b.dotClass}`}
                        />
                      ))}
                      {dayBookings.length > 3 && (
                        <span className="text-[8px] font-black text-brand leading-none">
                          +{dayBookings.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Desktop Event Chips (Hidden on mobile, visible on md+) */}
                    <div className="hidden md:flex flex-col space-y-1 w-full overflow-hidden mt-1">
                      {dayBookings.slice(0, 5).map((booking, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContractForDetails(booking.rawContract);
                          }}
                          title={`${booking.tooltipText} • Click to view full details`}
                          className={`w-full max-w-full text-left px-2 py-1 rounded-lg transition-all border shadow-2xs hover:shadow-xs hover:scale-[1.01] active:scale-[0.99] flex items-center justify-between gap-1.5 cursor-pointer select-none group ${booking.chipClass}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${booking.dotClass}`} />
                            <span className="font-sans font-bold text-[11px] tracking-tight tabular-nums truncate text-text-primary">
                              {booking.displayNum}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold tracking-tight tabular-nums text-text-secondary shrink-0 opacity-80">
                            {booking.formattedHour}
                          </span>
                        </button>
                      ))}
                      {dayBookings.length > 5 && (
                        <span className="text-[9px] font-bold text-brand pl-1">
                          +{dayBookings.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Selected Date Agenda (Rendered on mobile right below month grid) */}
            <div className="block md:hidden border-t border-border bg-gray-50/50 p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-brand/10 text-brand">
                    <CalendarIcon size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text-primary">
                      {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </h3>
                    <span className="text-[10px] text-text-muted">
                      {selectedDateBookings.length} {selectedDateBookings.length === 1 ? "booking" : "bookings"}
                    </span>
                  </div>
                </div>
                {selectedDate.toDateString() === new Date().toDateString() && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand text-white shadow-2xs">
                    Today
                  </span>
                )}
              </div>

              {selectedDateBookings.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-white text-center">
                  <p className="text-xs text-text-muted font-medium mb-2">
                    No pickups or returns scheduled for this day
                  </p>
                  <Link
                    href="/bookings/new"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand/10 text-brand rounded-lg text-xs font-bold hover:bg-brand/20 transition-colors"
                  >
                    <Plus size={13} />
                    <span>Create Booking</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDateBookings.map((b, bIdx) => (
                    <div
                      key={bIdx}
                      onClick={() => setSelectedContractForDetails(b.rawContract)}
                      className="bg-white p-3 rounded-xl border border-border shadow-2xs active:scale-[0.99] transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${b.dotClass}`} />
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${b.badgeClass}`}>
                            {b.type === "pickup" ? "Pickup (تسليم)" : "Return (إرجاع)"}
                          </span>
                          <span className="text-xs font-black text-text-primary truncate font-sans">
                            {b.displayNum}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-md shrink-0">
                          <Clock size={12} />
                          <span>{b.formattedHour}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100">
                        <div>
                          <span className="text-[10px] text-text-muted block">Vehicle / السيارة</span>
                          <span className="font-bold text-text-primary truncate block">{b.car}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-text-muted block">Client / العميل</span>
                          <span className="font-bold text-text-primary truncate block">{b.client}</span>
                        </div>
                      </div>

                      {(b.driver || b.location) && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted pt-0.5">
                          {b.driver && (
                            <span className="flex items-center gap-1">
                              <Truck size={12} className="text-gray-400" />
                              <span>{b.driver}</span>
                            </span>
                          )}
                          {b.location && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={12} className="text-gray-400" />
                              <span className="truncate">{b.location}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-gray-50 text-[10px]">
                        <span className="text-text-muted truncate">{b.statusLabel}</span>
                        <span className="text-brand font-bold flex items-center gap-0.5">
                          <span>Details</span>
                          <ChevronRight size={11} />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== VIEW 2: AGENDA / SCHEDULE LIST VIEW ===== */}
        {viewMode === "agenda" && (
          <div className="p-3 sm:p-6 bg-card space-y-5 min-h-[400px]">
            {agendaGrouped.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                  <CalendarIcon size={24} />
                </div>
                <h3 className="text-base font-bold text-text-primary">No Scheduled Bookings Found</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  No pickups or returns match the selected filters for {monthYearStr}.
                </p>
                <button
                  type="button"
                  onClick={() => { setFilter("all"); setSearchQuery(""); }}
                  className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-xs hover:bg-brand-dark transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              agendaGrouped.map((group, gIdx) => {
                const isGroupToday = group.date.toDateString() === new Date().toDateString();
                return (
                  <div key={gIdx} className="space-y-2.5">
                    {/* Date Header */}
                    <div className="flex items-center gap-2 sticky top-0 bg-card py-1.5 z-10 border-b border-gray-100">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isGroupToday ? "bg-brand text-white shadow-xs" : "bg-gray-100 text-text-primary"
                      }`}>
                        {group.date.getDate()}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-xs sm:text-sm font-bold text-text-primary truncate">
                          {group.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </h3>
                        {isGroupToday && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-brand text-white shrink-0">
                            Today
                          </span>
                        )}
                        <span className="text-[10px] text-text-muted shrink-0">
                          ({group.bookings.length})
                        </span>
                      </div>
                    </div>

                    {/* Bookings in this group */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {group.bookings.map((b, bIdx) => (
                        <div
                          key={bIdx}
                          onClick={() => setSelectedContractForDetails(b.rawContract)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-xs active:scale-[0.99] space-y-2 bg-white ${
                            b.type === "pickup" ? "border-blue-200/80 hover:border-blue-300" : "border-purple-200/80 hover:border-purple-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${b.dotClass}`} />
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${b.badgeClass}`}>
                                {b.type === "pickup" ? "Pickup (تسليم)" : "Return (إرجاع)"}
                              </span>
                              <span className="text-xs font-black text-text-primary font-sans truncate">
                                {b.displayNum}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-brand bg-brand/5 px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                              <Clock size={12} />
                              <span>{b.formattedHour}</span>
                            </span>
                          </div>

                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-text-muted text-[11px]">Vehicle:</span>
                              <strong className="text-text-primary truncate max-w-[180px]">{b.car}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-text-muted text-[11px]">Customer:</span>
                              <strong className="text-text-primary truncate max-w-[180px]">{b.client}</strong>
                            </div>
                            {b.driver && (
                              <div className="flex justify-between items-center">
                                <span className="text-text-muted text-[11px]">Driver:</span>
                                <span className="text-text-secondary truncate max-w-[180px]">{b.driver}</span>
                              </div>
                            )}
                            {b.location && (
                              <div className="flex justify-between items-center">
                                <span className="text-text-muted text-[11px]">Location:</span>
                                <span className="text-text-secondary truncate max-w-[180px]">{b.location}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                            <span className="text-[10px] text-text-muted truncate">{b.statusLabel}</span>
                            <span className="text-brand font-bold inline-flex items-center gap-1 shrink-0">
                              <span>Details</span>
                              <ChevronRight size={12} />
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-text-muted bg-gray-50/50">
          <span>
            <span className="font-bold text-text-primary">{filteredBookings.length}</span> events · <span className="font-bold text-text-primary">{monthYearStr}</span>
          </span>
          <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
            <button onClick={prevMonth} className="flex-1 sm:flex-initial px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              ← Prev
            </button>
            <button onClick={goToday} className="flex-1 sm:flex-initial px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs">
              {currentDate.toLocaleDateString("en-US", { month: "short" })}
            </button>
            <button onClick={nextMonth} className="flex-1 sm:flex-initial px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              Next →
            </button>
          </div>
        </div>
      </div>

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
