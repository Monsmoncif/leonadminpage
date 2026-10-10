"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Plus,
  Check,
  Eye,
  Filter,
  ChevronDown,
  Clock,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import Link from "next/link";
import ContractDetailsModal from "@/components/modals/ContractDetailsModal";
import TablePagination from "@/components/ui/TablePagination";

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
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContractForDetails, setSelectedContractForDetails] = useState<any | null>(null);

  // Mobile-specific state (inspired by Bookings page UI/UX)
  const [mobileView, setMobileView] = useState<"list" | "grid">("list");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Sorted bookings for mobile table/list view
  const sortedBookings = useMemo(() => {
    return [...filteredBookings].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredBookings]);

  // Pagination for mobile table view (Matches Bookings Page)
  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    return sortedBookings.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [sortedBookings, currentPage, itemsPerPage]);

  const prevMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
    setCurrentPage(1);
  };
  const nextMonth = () => {
    setCurrentDate((prev) => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
    setCurrentPage(1);
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setCurrentPage(1);
  };

  const filterOptions = [
    { label: "All", val: "all", dot: "bg-gray-400" },
    { label: "Pickups (Start)", val: "pickup", dot: "bg-blue-500" },
    { label: "Returns (End)", val: "return", dot: "bg-purple-500" },
    { label: "Pre-Contracts", val: "precontract", dot: "bg-amber-500" },
    { label: "Contracts", val: "contract", dot: "bg-emerald-500" },
  ] as const;

  const currentFilterLabel = filterOptions.find((f) => f.val === filter)?.label || "All";

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
    <div className="space-y-5">
      {/* ===== Dashboard-Style Welcome Header (Old Design Intact!) ===== */}
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
              className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus size={16} />
              <span>New Contract</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW (Inspired directly by Bookings page UI/UX for mobile)      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4 animate-fade-in">
        {/* Mobile Toolbar (Matches Bookings Page Toolbar) */}
        <div className="relative z-20 bg-card rounded-xl border border-border p-3 shadow-xs flex flex-col gap-2.5 card-hover">
          {/* Search Bar */}
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search contract, customer, car..."
              className="w-full text-xs border border-border rounded-xl pl-8 pr-8 py-2 bg-white text-text-secondary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all shadow-xs"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Controls: Month Jump + View Switcher + Filter Dropdown */}
          <div className="flex items-center justify-between gap-2">
            {/* Month Nav */}
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

            {/* View Mode Toggle: List (Bookings style) vs Month Grid */}
            <div className="flex items-center p-0.5 bg-gray-100 rounded-xl border border-border/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  mobileView === "list"
                    ? "bg-white text-text-primary shadow-xs"
                    : "text-text-secondary"
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileView("grid")}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  mobileView === "grid"
                    ? "bg-white text-text-primary shadow-xs"
                    : "text-text-secondary"
                }`}
              >
                <LayoutGrid size={13} />
                <span>Grid</span>
              </button>
            </div>

            {/* Filter Dropdown (Matches Bookings Filter) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="text-xs border border-border rounded-xl px-2.5 py-1.5 text-text-secondary hover:bg-gray-50 flex items-center gap-1.5 font-medium bg-white shadow-xs"
              >
                <Filter size={13} className="text-text-muted" />
                <span className="truncate max-w-[70px]">{currentFilterLabel}</span>
                <ChevronDown size={12} className="text-text-muted" />
              </button>
              {isMobileFilterOpen && (
                <div className="absolute top-full mt-1.5 right-0 w-44 bg-white border border-border rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                  {filterOptions.map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => {
                        setFilter(item.val);
                        setIsMobileFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                        filter === item.val ? "text-brand font-semibold bg-brand/5" : "text-text-secondary"
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

        {/* MOBILE VIEW OPTION 1: Table List View (Directly inspired by Bookings Page!) */}
        {mobileView === "list" && (
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden card-hover">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] sm:text-xs">
                <thead>
                  <tr className="border-b border-border bg-gray-50/75 text-[9.5px] sm:text-[11px] text-text-muted font-semibold uppercase tracking-wider">
                    <th className="text-left py-2 px-2.5 whitespace-nowrap">
                      Contract
                    </th>
                    <th className="text-left py-2 px-2.5 min-w-[140px]">
                      Customer / Driver
                    </th>
                    <th className="text-left py-2 px-2.5">
                      Vehicle
                    </th>
                    <th className="text-left py-2 px-2 whitespace-nowrap">
                      Schedule
                    </th>
                    <th className="text-left py-2 px-2 whitespace-nowrap w-[90px]">
                      Status
                    </th>
                    <th className="text-right py-2 px-2.5 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 px-4 text-center">
                        <CalendarIcon size={28} className="text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-bold text-gray-800">No schedules found</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 mb-3">No bookings match your filter for {monthYearStr}</p>
                        <button
                          type="button"
                          onClick={() => { setSearchQuery(""); setFilter("all"); setCurrentPage(1); }}
                          className="px-3 py-1 text-xs font-semibold text-brand border border-brand/20 rounded-lg hover:bg-brand/5"
                        >
                          Clear Filter
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedBookings.map((event) => {
                      const isToday = event.date.toDateString() === new Date().toDateString();

                      return (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedContractForDetails(event.rawContract)}
                          className="bg-white hover:bg-gray-50/75 transition-colors cursor-pointer"
                        >
                          {/* Contract Column */}
                          <td className="py-2 px-2.5">
                            <span className="font-bold text-text-primary text-[11px] tabular-nums block">
                              {event.displayNum}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] font-bold border mt-0.5 ${event.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${event.dotClass}`} />
                              {event.type === "pickup" ? "Pickup" : "Return"}
                            </span>
                          </td>

                          {/* Customer / Driver Column */}
                          <td className="py-2 px-2.5 min-w-[140px]">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs ${event.color}`}>
                                {getInitials(event.client)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="font-semibold text-text-primary text-[11px] block truncate">
                                  {event.client}
                                </span>
                                <p className="text-[9.5px] text-text-muted mt-0.5 truncate">
                                  {event.driver ? `Driver: ${event.driver}` : "Self-drive"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Vehicle Column */}
                          <td className="py-2 px-2.5">
                            <span className="font-medium text-text-primary text-[11px] block truncate max-w-[110px]">
                              {event.car}
                            </span>
                            {event.rawContract?.vehiclePlate && (
                              <p className="text-[9.5px] text-brand font-mono font-bold mt-0.5">
                                {event.rawContract.vehiclePlate}
                              </p>
                            )}
                          </td>

                          {/* Schedule / Time Column */}
                          <td className="py-2 px-2 whitespace-nowrap">
                            <span className="font-semibold text-text-primary text-[10px] block">
                              {event.dateStr}
                              {isToday && (
                                <span className="ml-1 px-1 py-0.2 rounded bg-brand/10 text-brand text-[8px] font-bold">
                                  Today
                                </span>
                              )}
                            </span>
                            <span className="text-text-muted text-[9px] block">
                              at {event.formattedHour}
                            </span>
                          </td>

                          {/* Status Column */}
                          <td className="py-2 px-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border block text-center ${event.badgeClass}`}>
                              {event.statusLabel}
                            </span>
                          </td>

                          {/* Action Column */}
                          <td className="py-2 px-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedContractForDetails(event.rawContract);
                              }}
                              className="p-1 text-text-muted hover:text-brand hover:bg-brand/10 rounded-md inline-flex items-center justify-center"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Table Pagination (Matches Bookings Page) */}
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedBookings.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}

        {/* MOBILE VIEW OPTION 2: Mobile Month Grid */}
        {mobileView === "grid" && (
          <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
              <div className="min-w-[550px]">
                <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
                  {days.map((day) => (
                    <div key={day} className="py-2 text-[9.5px] font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: '400px' }}>
                  {monthDates.map((date, idx) => {
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dayBookings = filteredBookings.filter(
                      (b) => b.date.toDateString() === date.toDateString()
                    );

                    return (
                      <div
                        key={idx}
                        className={`p-1 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border ${
                          !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                        } ${isToday ? 'bg-brand/[0.03]' : ''}`}
                      >
                        <div className={`text-[10px] font-black mb-1 w-5 h-5 flex items-center justify-center rounded-lg ${
                          isToday ? 'bg-brand text-white' : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayBookings.slice(0, 3).map((booking, bIdx) => (
                            <button
                              key={bIdx}
                              type="button"
                              onClick={() => setSelectedContractForDetails(booking.rawContract)}
                              className={`w-full text-left px-1 py-0.5 rounded text-[9px] font-bold border truncate flex items-center gap-1 ${booking.chipClass}`}
                            >
                              <span className={`w-1 h-1 rounded-full ${booking.dotClass}`} />
                              <span className="truncate">{booking.displayNum}</span>
                            </button>
                          ))}
                          {dayBookings.length > 3 && (
                            <span className="text-[8.5px] font-bold text-brand block">
                              +{dayBookings.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 💻 DESKTOP VIEW (Original Full-Width Calendar Design 100% Intact!)       */}
      {/* ========================================================================= */}
      <div className="hidden md:block bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Row 1: Controls (Month Nav, Filters, Search) */}
        <div className="px-4 py-3 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 border-b border-border bg-gray-50/60">
          
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
          <div className="relative w-full sm:w-44 lg:w-48 shrink-0">
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

        {/* Row 2: Status Legend & Hint (Spacious & Clean, Zero Overflow) */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-white text-xs">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] font-semibold text-text-secondary">
            <span className="text-text-muted font-bold uppercase tracking-wider text-[10px] mr-1">
              Legend:
            </span>
            <span className="flex items-center gap-1.5" title="Pre-contract awaiting handover (Start)">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span>Pre-CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border hidden sm:inline shrink-0" />
            <span className="flex items-center gap-1.5" title="Pre-contract scheduled end date (End)">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span>Pre-CON (End)</span>
            </span>
            <span className="w-px h-3 bg-border hidden sm:inline shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract vehicle handed over (Start)">
              <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
              <span>CON (Start)</span>
            </span>
            <span className="w-px h-3 bg-border hidden sm:inline shrink-0" />
            <span className="flex items-center gap-1.5" title="Active contract expected return date">
              <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
              <span>CON (Exp. End)</span>
            </span>
            <span className="w-px h-3 bg-border hidden sm:inline shrink-0" />
            <span className="flex items-center gap-1.5" title="Car returned back to fleet">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Returned</span>
            </span>
          </div>

          <span className="text-[11px] text-text-muted hidden md:flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 inline-block" />
            Click any event to open booking &amp; handover details
          </span>
        </div>

        {/* Scrollable Calendar Wrapper for Desktop */}
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <div className="min-w-[660px] sm:min-w-0">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50/70 border-b border-border">
              {days.map((day) => (
                <div key={day} className="py-2.5 text-[10px] font-black text-text-muted text-center uppercase tracking-wider border-l border-border first:border-l-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid — Full Height */}
            <div className="grid grid-cols-7 grid-rows-6 bg-card" style={{ minHeight: 'calc(100vh - 270px)' }}>
              {monthDates.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === new Date().toDateString();

                const dayBookings = filteredBookings.filter(
                  (b) => b.date.toDateString() === date.toDateString()
                );

                return (
                  <div
                    key={idx}
                    className={`p-1.5 border-b border-border [&:not(:nth-child(7n+1))]:border-l border-l-border transition-colors ${
                      !isCurrentMonth ? 'bg-gray-50/40' : 'bg-card'
                    } ${isToday ? 'bg-brand/[0.03]' : ''}`}
                  >
                    {/* Date */}
                    <div className={`text-xs font-black mb-1 w-6 h-6 flex items-center justify-center rounded-lg mx-auto md:mx-0 ${
                      isToday 
                        ? 'bg-brand text-white shadow-xs' 
                        : isCurrentMonth ? 'text-text-primary' : 'text-gray-300'
                    }`}>
                      {date.getDate()}
                    </div>

                    {/* Events */}
                    <div className="space-y-1 flex flex-col items-start overflow-hidden w-full">
                      {dayBookings.slice(0, 5).map((booking, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => setSelectedContractForDetails(booking.rawContract)}
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
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border flex items-center justify-between text-xs text-text-muted bg-gray-50/50">
          <span>
            <span className="font-bold text-text-primary">{filteredBookings.length}</span> events · <span className="font-bold text-text-primary">{monthYearStr}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
              ← Prev
            </button>
            <button onClick={goToday} className="px-2.5 py-1 bg-brand text-white rounded-lg font-bold cursor-pointer text-xs shadow-xs">
              {currentDate.toLocaleDateString("en-US", { month: "short" })}
            </button>
            <button onClick={nextMonth} className="px-2.5 py-1 border border-border rounded-lg bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs font-bold text-text-secondary">
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
